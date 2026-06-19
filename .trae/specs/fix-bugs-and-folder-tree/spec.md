# Electron-app Bug 修复与目录树功能实装 Spec

## Why
electron-app 当前有两个会破坏用户体验的硬 bug（set-preferences 写坏配置、Playground IPC 监听器泄漏），且唯一尝试过的功能页 foldertree.tsx 是撞跨源墙后的失败实验。在重启 electron 实装前，必须先修掉硬 bug 让壳稳定，再用一个样板功能验证"主进程文件操作 + IPC + React 重绘"的完整链路，为后续功能迁移铺路。

## What Changes
- 修复 `src/main/index.ts` 中 `set-preferences` IPC handler 的 async bug（漏 await 导致写坏 preferences.json）
- 修复 `src/renderer/src/pages/playground.tsx` 中在组件函数体内直接注册 IPC 监听器的内存泄漏问题（移入 useEffect + 清理）
- 重写 `src/renderer/src/pages/features/foldertree.tsx`：删除失败的 iframe 实验，改为通过新增的 IPC handler 调用 Node fs 生成目录树，用 React + Arco 重绘 UI
- 在 `src/main/index.ts` 新增 `generate-tree` IPC handler，用 Node fs 递归读取目录结构并返回 JSON
- 在 `src/preload/index.ts` 暴露新的目录树 API（或复用 electronAPI 的 invoke）
- 更新 `src/preload/index.d.ts` 补齐类型声明

## Impact
- Affected code:
  - `electron-app/src/main/index.ts`（修 set-preferences、新增 generate-tree handler）
  - `electron-app/src/renderer/src/pages/playground.tsx`（修 IPC 监听器泄漏）
  - `electron-app/src/renderer/src/pages/features/foldertree.tsx`（整体重写）
  - `electron-app/src/preload/index.ts`（如需暴露新 API）
  - `electron-app/src/preload/index.d.ts`（补类型声明）
- 不影响 gradio-app（已稳定运行）
- 不影响 electron-app 的其他页面（about/setting）

## 设计决策

### 为什么目录树用 Node fs 而非 @gradio/client
用户附加信息："如有更好的方案，gradio可以随时被弃用；如没有则先沿用其中逻辑"。

目录树功能（gradio 的 `utils_folder.generate_tree`）本质是 `os.walk` 递归读取目录，**纯本地文件操作，无 Python 特有依赖**。对比两种方案：

| 维度 | @gradio/client 调 gradio API | Node fs 通过 IPC |
|---|---|---|
| 外部依赖 | 必须 gradio 后端运行在 7860 | 无，electron 自包含 |
| 性能 | HTTP 序列化开销 | 进程内通信，快 |
| 鲁棒性 | gradio 挂了功能就挂 | 独立可用 |
| 代码量 | 需 gradio client + 错误处理 | 主进程 fs + IPC handler |

**结论：目录树用 Node fs 是更好的方案。** @gradio/client 链路的验证留待后续需要 Python 计算的功能（如 jieba 分词、wordcloud 生成）——那些功能没有纯 JS 替代，才是 gradio 的真正价值所在。

### 为什么不顺便清理其他死代码
用户选择"修 bug + 搬 1 个样板功能"，未选"清理死代码"。本次只动与 bug 修复和目录树功能直接相关的代码。routesForum.js、未使用 imports、globalModel 残留 state 等留待后续 spec。

## ADDED Requirements

### Requirement: 目录树生成功能
系统 SHALL 提供一个目录树生成页面，用户输入文件夹路径后，electron 主进程通过 Node fs 递归读取目录结构，返回 JSON 格式的树形数据，渲染层用 React + Arco 展示为可读的树形视图。

#### Scenario: 用户输入有效路径生成目录树
- **WHEN** 用户在目录树页面输入有效文件夹路径并点击"生成"
- **THEN** 主进程递归读取该目录（受最大深度参数限制），返回树形 JSON，渲染层展示缩进树形结构

#### Scenario: 用户输入无效路径
- **WHEN** 用户输入不存在的路径或无权限路径
- **THEN** 页面显示友好的错误提示，不崩溃

#### Scenario: 用户调整最大深度
- **WHEN** 用户修改深度滑块（1-10）
- **THEN** 重新生成的目录树按新深度截断

### Requirement: 目录大小与硬盘占用统计
系统 SHALL 在生成目录树的同时，可选地统计目录总大小和所在硬盘的占用情况。

#### Scenario: 用户勾选"统计目录信息"
- **WHEN** 用户勾选统计选项并生成
- **THEN** 返回结果包含目录总大小（字节/MB）、硬盘总大小/已用/剩余、目录占用百分比

## MODIFIED Requirements

### Requirement: set-preferences IPC handler 必须正确持久化偏好
`set-preferences` handler SHALL 使用 `await readPreferences()` 读取现有配置，合并新配置后写入。写入操作 SHALL 捕获并记录错误，不静默失败。

#### Scenario: 用户修改主题设置
- **WHEN** 渲染层调用 `set-preferences` 传入 `{ theme: 'dark' }`
- **THEN** 主进程读取现有 preferences.json，合并 theme 字段，写回完整 JSON，文件内容保持有效 JSON 格式

### Requirement: Playground 页面的 IPC 监听器必须正确管理生命周期
Playground 组件 SHALL 在 `useEffect` 内注册 IPC 监听器，并在 cleanup 函数中调用 `removeListener` 移除监听器。监听器 SHALL NOT 在组件函数体直接注册。

#### Scenario: 组件多次 re-render
- **WHEN** Playground 组件因 state 变化 re-render
- **THEN** IPC 监听器数量不增加，同一条消息只触发一次 setFileContent

#### Scenario: 组件卸载
- **WHEN** 用户离开 Playground 页面
- **THEN** IPC 监听器被移除，无内存泄漏

## REMOVED Requirements

### Requirement: foldertree.tsx 的 iframe 嵌入方案
**Reason**: 跨源限制导致无法操作 iframe 内 DOM，方案已证明失败。残留的 `Client.connect` 无效连接和每秒轮询 `getElementById` 的死循环是负担。
**Migration**: 整体重写为 Node fs + IPC + React 方案，旧代码全部删除。
