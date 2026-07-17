# 工作流「变量」系统设计

## Summary

为 Playground 工作流引入**显式命名变量**机制，统一变量类型为**文本（string）**，让每个节点的输出有名字、可被下游显式引用、可在前端实时监控。彻底消除当前"扫描结果不知道存到哪里、莫名其妙衔接上转换逻辑"的隐式数据流问题。

核心设计原则（来自用户）：
> 变量应该是以文本为主，至于文本是 txt 还是 json 完全是各节点内部的事情；所谓文件列表也应该是个文本，一开始扫描功能扫出来的结果不就是个目录吗。

---

## Current State Analysis（现状分析）

### 当前数据流（问题所在）
[workflow-engine.ts:52-56](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/utils/workflow-engine.ts#L52-L56) 定义了 `WorkflowContext`：
```typescript
export interface WorkflowContext {
  files: ContextFile[];              // 唯一实际使用的数据载体
  variables: Record<string, unknown>; // 定义了但完全未使用
  logs: WorkflowLog[];
}
```

节点间数据传递**完全靠隐式覆盖 `ctx.files`**：
- `executeSourceFiles` [L142-199](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/utils/workflow-engine.ts#L142-L199)：扫描+读盘 → `return { ...ctx, files }`
- `executeMdToWikiSite` [L202-267](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/utils/workflow-engine.ts#L202-L267)：从 `ctx.files` 读 → 转换 → `return { ...ctx, files: outputFiles }`（覆盖）
- `executeWriteDirectory` [L270-299](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/utils/workflow-engine.ts#L270-L299)：从 `ctx.files` 读 → 写盘

### 三个核心痛点
1. **节点输出无命名**：扫描结果直接覆盖 `ctx.files`，用户看不到"扫描结果"这个名字
2. **节点输入无显式引用**：md-to-wiki-site 节点硬编码从 `ctx.files` 读，无法选择引用哪个上游变量
3. **无中间数据预览**：[workflow-editor.tsx:335-362](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/pages/playground/workflow-editor.tsx#L335-L362) 底部只有日志面板，看不到 `ctx.files` 实际内容

---

## Proposed Changes（设计方案）

### 一、变量模型（核心）

**变量统一为 string 类型**，节点内部决定如何序列化/解析。

#### 1.1 新增 `WorkflowVariable` 类型
[workflow-engine.ts](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/utils/workflow-engine.ts) 新增：

```typescript
/** 单个变量的元信息（用于 UI 展示） */
export interface WorkflowVariable {
  name: string;              // 变量名，用户可改，工作流内唯一
  value: string;             // 统一文本类型
  sourceNodeId: string;      // 来源节点 ID
  sourceNodeLabel: string;   // 来源节点名称（冗余，便于 UI 展示）
  updatedAt: string;         // 更新时间戳
  /** 格式提示：仅用于 UI 美化展示，不影响数据本身 */
  formatHint: 'text' | 'json' | 'path-list';
  /** 字节数（冗余，便于 UI 展示文件大小） */
  byteLength: number;
}
```

#### 1.2 改造 `WorkflowContext`
```typescript
export interface WorkflowContext {
  variables: Record<string, WorkflowVariable>;  // 替代原 files + variables
  logs: WorkflowLog[];
}
```
**移除 `files` 字段**，所有数据流统一走 `variables`。

#### 1.3 节点 config 扩展（全显式命名）

```typescript
export interface SourceFilesConfig {
  inputMode: 'folder' | 'paths';
  folder?: string;
  paths?: string[];
  exts: string[];
  outputVariableName: string;   // 新增，默认 '扫描结果'
}

export interface MdToWikiSiteConfig {
  presetName: string;
  inputVariableName: string;    // 新增，引用上游变量，默认选第一个可用变量
  outputVariableName: string;   // 新增，默认 '站点文件'
}

export interface WriteDirectoryConfig {
  targetDir?: string;
  inputVariableName: string;    // 新增，引用上游变量
}
```

#### 1.4 节点内部序列化约定

| 节点 | 输入格式 | 输出格式 | formatHint |
|------|----------|----------|------------|
| source-files | 无 | `JSON.stringify([{name, content}, ...])` | `'json'` |
| md-to-wiki-site | `JSON.parse` → `SiteFile[]` | `JSON.stringify([{path, content}, ...])` | `'json'` |
| write-directory | `JSON.parse` → `[{path, content}]` | 无（终点节点） | — |

### 二、执行引擎改造

[workflow-engine.ts L90-135](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/utils/workflow-engine.ts#L90-L135)

#### 2.1 `executeWorkflow` 主循环
- 初始化 `ctx = { variables: {}, logs: [] }`
- 每个节点执行后，回调 `onProgress` 携带 `variablesSnapshot`（深拷贝当前 `ctx.variables`）
- 错误处理逻辑不变

#### 2.2 `NodeProgress` 扩展
```typescript
export interface NodeProgress {
  nodeId: string;
  status: NodeStatus;
  detail?: string;
  variablesSnapshot?: Record<string, WorkflowVariable>;  // 新增
}
```

#### 2.3 节点执行器改造

**`executeSourceFiles`**：
- 业务逻辑不变（扫描 + 读盘）
- 输出阶段：`const value = JSON.stringify(files)` 
- 写入变量：`ctx.variables[config.outputVariableName] = { name, value, sourceNodeId: node.id, sourceNodeLabel: node.label, formatHint: 'json', byteLength: value.length, updatedAt }`
- 返回 `{ ...ctx, variables: { ...ctx.variables, [name]: varObj } }`

**`executeMdToWikiSite`**：
- 从 `ctx.variables[config.inputVariableName].value` 读取，`JSON.parse` 得到 `SiteFile[]`
- 若输入变量不存在或解析失败，抛错（提示用户检查输入变量引用）
- 转换逻辑不变（调 `convertSite`）
- 输出阶段：`const value = JSON.stringify(outputFiles)`，写入 `ctx.variables[config.outputVariableName]`

**`executeWriteDirectory`**：
- 从 `ctx.variables[config.inputVariableName].value` 读取，`JSON.parse` 得到 `[{path, content}]`
- 写盘逻辑不变
- 无输出变量（终点节点）

### 三、前端编辑器改造

#### 3.1 节点配置面板新增"变量名"输入框
[workflow-editor.tsx L442-454](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/pages/playground/workflow-editor.tsx#L442-L454) `NodeConfigPanel`：

- **source-files 配置面板**：底部新增"输出变量名" Input，默认值 `'扫描结果'`
- **md-to-wiki-site 配置面板**：
  - 顶部新增"输入变量" Select（下拉选项 = 当前 workflow.nodes 中所有早于本节点声明的输出变量名）
  - 底部新增"输出变量名" Input，默认值 `'站点文件'`
- **write-directory 配置面板**：顶部新增"输入变量" Select

输入变量下拉选项的计算逻辑：
```typescript
// 收集所有早于当前节点 index 的节点声明的 outputVariableName
const availableInputs = workflow.nodes
  .slice(0, currentIndex)
  .filter(n => n.config.outputVariableName)
  .map(n => ({ label: `${n.config.outputVariableName}（来自: ${n.label}）`, value: n.config.outputVariableName }));
```

#### 3.2 底部面板改为 Tab 切换
[workflow-editor.tsx L334-362](file:///e:/100%20%E9%A1%B9%E7%9B%AE/130%20%E7%BC%96%E7%A8%8B%E5%BC%80%E5%8F%91/132%20%E5%85%B6%E4%BB%96%E4%B8%AD%E6%9C%9F%E6%88%96%E9%95%BF%E6%9C%9F%E9%A1%B9%E7%9B%AE/Text-maestro%EF%BC%88%E6%96%87%E6%9C%AC%E5%88%86%E6%9E%90%E5%B7%A5%E5%85%B7%E7%AE%B1%EF%BC%89/electron-app/src/renderer/src/pages/playground/workflow-editor.tsx#L334-L362)：

把现有的固定高度日志面板替换为 Arco `Tabs`：
- **Tab 1「日志」**：保留现有日志渲染逻辑
- **Tab 2「变量」**：新增变量监控面板

底部 Tab 高度从 140px 调整为 200px（容纳变量卡片）。

#### 3.3 新增「变量监控」面板组件
新组件 `VariablesPanel`，渲染 `Record<string, WorkflowVariable>`：

```
┌──────────────────────────────────────────────────────────────┐
│ 变量监控                                                       │
├──────────────────────────────────────────────────────────────┤
│ ┌─ 📦 扫描结果 ───────────────────────────────────────────┐ │
│ │ 来源: 读取赤心巡天章节    格式: JSON    大小: 2.1 KB     │ │
│ │ [展开 ▼]                                                │ │
│ │ [ { "name": "