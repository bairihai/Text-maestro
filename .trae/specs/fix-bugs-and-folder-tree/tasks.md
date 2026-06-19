# Tasks

- [x] Task 1: 修复 set-preferences async bug
  - 在 `electron-app/src/main/index.ts` 的 `set-preferences` handler 中给 `readPreferences()` 加 `await`
  - 将 handler 改为 `async` 函数
  - 给 `writePreferences` 调用加 `.catch` 错误处理（或改为 await + try/catch）
  - 确认 `readPreferences` 返回的是解析后的对象而非 Promise

- [x] Task 2: 修复 Playground IPC 监听器泄漏
  - 在 `electron-app/src/renderer/src/pages/playground.tsx` 中，将 `window.electron.ipcRenderer.on('file-content', ...)` 移入 `useEffect`
  - 在 useEffect 的 cleanup 中调用 `window.electron.ipcRenderer.removeListener('file-content', handler)` 移除监听器
  - 用具名函数引用确保 remove 能匹配到同一函数
  - 保留现有 ipcHandle 发送逻辑不变

- [x] Task 3: 在主进程新增 generate-tree IPC handler
  - 在 `electron-app/src/main/index.ts` 新增 `ipcMain.handle('generate-tree', ...)` handler
  - 参数：path（字符串）、maxDepth（数字，默认 3）、includeStats（布尔，默认 false）
  - 用 Node `fs.promises` 递归读取目录，构建树形 JSON 结构
  - includeStats 为 true 时，用 `fs.statfs` 返回磁盘总大小/已用/剩余
  - 错误处理：路径不存在/无权限时返回 `{ error: '...' }` 而非抛异常

- [x] Task 4: 重写 foldertree.tsx 页面
  - 删除全部旧内容（iframe 实验、Client.connect、死循环轮询）
  - 用 React + Arco 重写（Input/Slider/Checkbox.Group/Button/Card/Typography/Spin/Message）
  - 点击生成时调用 `window.electron.ipcRenderer.invoke('generate-tree', path, depth, includeStats)`
  - 处理 loading/error/空状态
  - 复用 setting.tsx 的 cardStyle 视觉风格

- [x] Task 5: 更新 preload 类型声明
  - 在 `electron-app/src/preload/index.d.ts` 中补齐 `window.globals` 类型（替代错误的 `window.api`）
  - 新增 TreeNode/TreeStats/GenerateTreeResult 接口
  - 保留 `window.electron` 和 `window.log`

- [x] Task 6: 类型检查与本地启动验证
  - `npm run typecheck` 无 TS 报错（含清理预先存在的未使用导入）
  - `npm run dev` 能启动 electron 窗口（含修复 dev server URL 加载问题）
  - 日志确认 set-preferences 修复生效（成功读取 theme=dark）
  - 目录树 IPC handler 与页面已接通

# Task Dependencies
- Task 3 依赖 Task 1 完成（在同一文件 index.ts 操作，避免冲突）
- Task 4 依赖 Task 3 完成（页面调用主进程 handler）
- Task 5 与 Task 4 可并行（类型声明与页面实现独立）
- Task 6 依赖 Task 1-5 全部完成
