# 计划：Playground 新增「工作流」功能（首期：md → wiki 站点批量生成）

> 核心场景：用户在 playground 编排工作流，把多个 md 文件批量转成一组 wiki 形式静态网页，
> 文件间 `[[wikilink]]` 正确解析为跨页链接，并生成站点级 index 与导航。
>
> 编排形态：线性步骤序列（不引入 reactflow 重依赖）。
> 节点抽象：混合（高级节点「md→wiki 站点」一键用 + 原子节点供深度定制）。
> 输出方式：写盘到用户指定目录（新增 IPC）。
>
> 本期范围（用户确认）：
> - 高级节点「md→wiki 站点」+ 2 个原子节点（读文件 / 写文件）
> - 导航：面包屑 + 侧边栏站点 TOC
> - 线性步骤序列，不引入 reactflow

---

## 一、现状分析（基于 Phase 1 探索）

### 1.1 Playground 现状
- 文件 [playground.tsx](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/pages/playground.tsx) 仅 67 行
- 顶部说明文字明示「这里还未开放」，是项目预留扩展位
- 当前内容：Redux 演示（读写 `state.global.appName`）+ 一个硬编码路径的 IPC read-file demo 按钮
- **零工作流/节点/画布相关代码**
- 路由 `/playground` 已在 [router/index.js:21-23](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/router/index.js) 注册
- Navbar 入口「playground DIY广场」已挂载（key: '6'）

### 1.2 md-to-web 当前能力（要被工作流复用）
- [utils/md-to-web.ts](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/utils/md-to-web.ts) 是**纯单文档转换器**
- `convert(text, rule, options)` 流水线已成熟（frontmatter → meta → resolve → filter → obsidian → md → toc → wrap）
- **关键缺口**（必须为工作流补齐）：
  - `preprocessObsidian` 中 wikilink 处理（[md-to-web.ts:500-517](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/utils/md-to-web.ts#L500-517)）是**盲拼前缀** `wikilinkBaseUrl + encodeURIComponent(target)`，不知道目标文件名
  - `wrapHtml` 只生成单页 HTML，无站点级 wrapper
  - 无批量调度、无跨文件映射、无站点 index 生成

### 1.3 文件 IPC 能力
- ✅ [main/index.ts:398-410](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/main/index.ts#L398-410) `read-multiple-files` 已就绪
- ✅ [main/index.ts:271-356](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱)/electron-app/src/main/index.ts#L271-356) `generate-tree` 可复用做文件树面板
- ❌ `list-folder-files` 是死代码（[foldertree.tsx:209](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱)/electron-app/src/renderer/src/pages/features/foldertree.tsx#L209) 调用但主进程无 handler）
- ❌ 无 `dialog.showOpenDialog`（缺原生文件夹选择对话框）
- ❌ 无 `write-file` / `write-directory`（完全不能写盘，现有功能都靠浏览器 Blob 下载）

### 1.4 依赖情况
- **零节点编排/图形库**（无 reactflow / xyflow / dagre / x6）
- 本计划不引入图形库，采用线性步骤序列 UI

---

## 二、设计决策（已与用户确认）

### 2.1 编排形态：线性步骤序列（不引入 reactflow）
| 选项 | 决策 | 理由 |
|------|------|------|
| 完整节点画布（reactflow） | ✗ | md→wiki 是线性流程，无分支/合并；引入 150KB 依赖收益不匹配 |
| **线性步骤序列** | **✓** | Arco Card + HTML5 拖拽排序即可表达「步骤栈」，零新依赖，上手快 |

### 2.2 节点抽象：混合（高级节点 + 原子节点）
- **高级节点**「md→wiki 站点」：一键完成「读 md → 跨文件解析 → 批量 convert → 生成 index → 写盘」全流程，封装工作流默认值
- **原子节点**（本期2个）：
  - 读文件（`source-files`）：input 为路径列表或文件夹，输出到 context.files
  - 写文件（`write-directory`）：output 为目录，从 context.files 写盘
- 其余原子节点（文本替换、变量赋值、单文档 convert）留作后续

### 2.3 输出方式：写盘到指定目录
| 选项 | 决策 | 理由 |
|------|------|------|
| **写盘到指定目录** | **✓** | 最贴近「生成一个站点」体验，新增 IPC 一次性投入 |
| 浏览器下载 zip | ✗ | 需引入 jszip 依赖；用户拿到的还是单文件，体验割裂 |
| 逐文件浏览器下载 | ✗ | 站点文件多时弹一堆下载条，体验极差 |

### 2.4 站点导航：面包屑 + 侧边栏站点 TOC（用户确认第一版）
- 生成 `index.html`：列出所有页面的标题、链接、首段摘要、标签
- 每个页面顶部生成面包屑：`首页 › 当前页标题`
- 侧边栏改为站点级（所有页面列表），而非单页 TOC

---

## 三、遍历流程设计（核心：如何处理多文件）

> 用户特别强调：要考虑清楚遍历相关流程的设计。这是工作流处理多文件的核心机制。

### 3.1 遍历发生在两个层级

**层级一：节点内遍历（隐式）** — 高级节点内部对文件集合做循环
- `md-to-wiki-site` 节点接收到 `context.files`（一个文件数组）后，在节点内部对所有文件做遍历：
  ```
  预扫描所有文件 → 建 linkMap → 遍历每个文件做 convert → 收集结果 → 生成 index
  ```
- 这种遍历是**节点实现细节**，对用户透明，用户只看到"输入一堆文件 → 输出一个站点"

**层级二：工作流数据流（集合传递）** — 文件作为集合在节点间流动
- `context.files` 始终是一个**数组**：`{ name: string; content: string }[]`
- `source-files` 节点把多个文件读入这个数组
- `md-to-wiki-site` 节点消费整个数组，输出新的数组（HTML 文件）
- `write-directory` 节点把整个数组写盘
- **不需要显式的"for each"循环节点** — 集合本身就是 context，节点天然处理多文件

### 3.2 为什么不用显式循环节点
| 方案 | 决策 | 理由 |
|------|------|------|
| 显式「for each」循环节点 | ✗ | 线性工作流里循环节点会破坏数据流简洁性；md→wiki 的"每文件转换"本质是节点内部行为，不是工作流拓扑结构 |
| **节点内隐式遍历 + 集合传递** | **✓** | context.files 是数组，节点天然遍历；工作流拓扑保持线性简单 |

### 3.3 数据流示意
```
[source-files 节点]                 [md-to-wiki-site 节点]                [write-directory 节点]
  读取多个 md 文件                    预扫描→建map→遍历convert→生成index     遍历 outputs 写盘
       │                                    │                                    │
       ▼                                    ▼                                    ▼
  context.files = [                   context.files = [                   context.files = [
    {name:'A.md', content:'...'},       {name:'A.html', content:'...'},     {name:'A.html', content:'...'},
    {name:'B.md', content:'...'},       {name:'B.html', content:'...'},     {name:'B.html', content:'...'},
    {name:'C.md', content:'...'},       {name:'index.html', content:'...'}, {name:'index.html', content:'...'},
  ]                                    {name:'assets/style.css', ...},     {name:'assets/style.css', ...},
                                       {name:'assets/script.js', ...},     {name:'assets/script.js', ...},
                                       ]                                    ]
```

### 3.4 文件遍历的具体实现位置
1. **`source-files` 节点**：调 `list-files-by-ext`（递归扫描目录）或 `read-multiple-files`（按路径列表），把结果填入 `context.files`
2. **`md-to-wiki-site` 节点 → `convertSite()`**：
   - 第1步：`for (const file of files)` 预扫描所有文件，建 linkMap
   - 第2步：`for (const file of files)` 调 `convert()` 转换每个文件（传 linkMap）
   - 第3步：生成 index.html（遍历所有 pageMetas 拼装）
   - 第4步：为每个页面包装站点导航（遍历所有页面加面包屑+侧边栏）
3. **`write-directory` 节点**：调 `write-directory` IPC，IPC 内部 `for (const f of files)` 写盘

### 3.5 遍历的进度反馈
- `executeWorkflow` 的 `onProgress` 回调支持节点级进度
- `md-to-wiki-site` 节点内部遍历时，通过 `onProgress(nodeId, 'running', '正在转换 3/10: 赤心巡天第3章.md')` 报告子进度
- UI 上节点 Card 显示「运行中 3/10」实时进度

---

## 四、跨文件 wikilink 解析（两阶段）

### 4.1 两阶段解析
1. **预扫描阶段**：对所有输入 md 文件调用 `parseFrontmatter + extractMeta`，建立映射表 `Map<wikiName, outputFile>`，其中：
   - `wikiName` = 不含扩展名的文件名（如 `笔记A.md` → `笔记A`）
   - `outputFile` = 按规则 `filenameTemplate` 解析后的输出名（如 `{{title}}.html` 用每个文件首个 H1）
2. **转换阶段**：`preprocessObsidian` 接受该映射表作为参数，把 `[[笔记A]]` 解析为 `<a href="笔记A.html">`，找不到目标则标记 `<a class="wikilink broken">笔记A</a>`

### 4.2 工作流数据模型
```ts
interface WorkflowNode {
  id: string;
  type: 'source-files' | 'md-to-wiki-site' | 'write-directory';  // 本期3种节点
  label: string;
  enabled: boolean;
  config: Record<string, unknown>; // 节点类型相关配置
}
interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[]; // 有序数组，按数组顺序执行
  createdAt: string;
  updatedAt: string;
}
```

---

## 五、要改动的文件清单

### 5.1 新建（5 个文件）

| 路径 | 职责 |
|------|------|
| `electron-app/src/main/ipc-workflow.ts` | 新增 4 个 IPC handler：`dialog:select-folder` / `dialog:save-folder` / `list-files-by-ext` / `write-directory`。从主进程 index.ts 拆分独立模块 |
| `electron-app/src/renderer/src/utils/workflow-engine.ts` | 工作流执行引擎：按节点序列调度执行、context（files 数组）传递、错误处理、子进度回调 |
| `electron-app/src/renderer/src/utils/md-to-wiki-site.ts` | 站点级转换器：多文件遍历调度 + 跨文件 wikilink 映射 + index 生成 + 站点导航包装 |
| `electron-app/src/renderer/src/pages/playground/workflow-editor.tsx` | 工作流编辑器组件：节点列表 + 拖拽排序 + 节点配置面板 + 运行/保存/加载 |
| `electron-app/src/renderer/src/pages/playground/index.tsx` | Playground 主页重写：Tab 切换「工作流编辑器」/「运行历史」/ 原有 demo |

### 5.2 编辑（5 个文件）

| 路径 | 改动点 |
|------|--------|
| [electron-app/src/renderer/src/pages/playground.tsx](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/pages/playground.tsx) | 改为导入并渲染新的 `playground/index.tsx`，或直接重写为最小宿主页 |
| [electron-app/src/main/index.ts](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/main/index.ts) | 引入并注册 `./ipc-workflow.ts` 暴露的 handler（不动现有 handler） |
| [electron-app/src/preload/index.ts](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/preload/index.ts) | customAPI 追加 `selectFolder()` / `saveFolder()` / `listFilesByExt(dir, exts)` / `writeDirectory(dir, files)` |
| [electron-app/src/preload/index.d.ts](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱)/electron-app/src/preload/index.d.ts) | 补 4 个新 API 的类型声明 |
| [electron-app/src/renderer/src/utils/md-to-web.ts](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱)/electron-app/src/renderer/src/utils/md-to-web.ts) | `preprocessObsidian` 增加可选参数 `wikiLinkMap?: Map<string, string>`；`wikiFn` 优先查 map，找不到才回退到现有盲拼前缀逻辑（向后兼容） |

### 5.3 不改动
- 不动 `routesCommon.js`（playground 路由已在 `router/index.js` 注册）
- 不动 Navbar（playground 菜单已存在）
- 不动 Python 端
- 不动其他功能页

---

## 六、关键实现细节

### 6.1 IPC handler 设计（`ipc-workflow.ts`）

```ts
// dialog:select-folder → string | null
ipcMain.handle('dialog:select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

// dialog:save-folder → string | null
ipcMain.handle('dialog:save-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
  return result.canceled ? null : result.filePaths[0];
});

// list-files-by-ext → string[] （递归扫描，遍历目录树）
ipcMain.handle('list-files-by-ext', async (_, dir: string, exts: string[]) => {
  const out: string[] = [];
  const walk = (p: string) => {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (exts.some(ext => entry.name.endsWith(ext))) out.push(full);
    }
  };
  walk(dir);
  return out;
});

// write-directory → { success, error? } （遍历 files 数组写盘）
ipcMain.handle('write-directory', async (_, targetDir: string, files: { path: string; content: string }[]) => {
  try {
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    for (const f of files) {
      const fullPath = path.join(targetDir, f.path);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, f.content, 'utf-8');
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
});
```

### 6.2 站点级转换器（`md-to-wiki-site.ts`）— 遍历核心

```ts
export interface SiteConvertOptions {
  files: { name: string; content: string }[];  // 输入 md 文件集合
  rule: MdToWebRule;
  outputDir: string;                            // 写盘目录
  onProgress?: (current: number, total: number, fileName: string) => void;  // 子进度
}

export interface SiteConvertResult {
  outputs: { path: string; content: string }[];  // 含 index.html + 各页 html + assets
  linkMap: Map<string, string>;                  // wikiName → outputFile
  brokenLinks: { from: string; target: string }[];
  pageMetas: ContentMeta[];
}

export async function convertSite(options: SiteConvertOptions): Promise<SiteConvertResult> {
  const { files, rule } = options;
  const total = files.length;
  const linkMap = new Map<string, string>();
  const pageMetas: ContentMeta[] = [];
  const outputs: { path: string; content: string }[] = [];
  const brokenLinks: { from: string; target: string }[] = [];

  // === 阶段1：预扫描遍历 — 建立 linkMap ===
  for (const file of files) {
    const { frontmatter } = parseFrontmatter(file.content);
    const meta = extractMeta(file.content, frontmatter);
    pageMetas.push(meta);
    const wikiName = file.name.replace(/\.md$/i, '');
    const outputFile = resolveFilename(rule.output.filenameTemplate, meta); // 如 {{title}}.html
    linkMap.set(wikiName, outputFile);
  }

  // === 阶段2：转换遍历 — 逐文件 convert ===
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    options.onProgress?.(i + 1, total, file.name);
    const result = convert(file.content, rule, { wikiLinkMap: linkMap });
    // 收集 brokenLinks（convert 过程中 preprocessObsidian 标记的）
    brokenLinks.push(...result.brokenLinks);
    const outputFile = linkMap.get(file.name.replace(/\.md$/i, '')) || `${file.name}.html`;
    outputs.push({ path: outputFile, content: result.html });
  }

  // === 阶段3：生成 index.html（遍历 pageMetas） ===
  const indexHtml = buildSiteIndex(pageMetas, linkMap, rule);
  outputs.push({ path: 'index.html', content: indexHtml });

  // === 阶段4：站点导航包装（遍历 outputs 加面包屑+侧边栏） ===
  for (const output of outputs) {
    if (output.path.endsWith('.html') && output.path !== 'index.html') {
      output.content = wrapSiteNav(output.content, output.path, pageMetas, linkMap);
    }
  }

  // === 阶段5：生成 assets ===
  outputs.push({ path: 'assets/style.css', content: buildSiteCss(rule) });
  outputs.push({ path: 'assets/script.js', content: buildSiteJs(rule) });

  return { outputs, linkMap, brokenLinks, pageMetas };
}
```

### 6.3 跨文件 wikilink 解析（修改 `md-to-web.ts`）

修改 `preprocessObsidian` 签名（向后兼容）：
```ts
// 旧
export function preprocessObsidian(body: string, transform: MdToWebRule['transform']): string

// 新（第 3 参数可选）
export function preprocessObsidian(
  body: string,
  transform: MdToWebRule['transform'],
  wikiLinkMap?: Map<string, string>
): string
```

修改 `wikiFn`：
```ts
const wikiFn = (target: string, display?: string): string => {
  const showText = display || target;
  // 优先查 map
  if (wikiLinkMap && wikiLinkMap.has(target)) {
    return `<a class="wikilink" href="${wikiLinkMap.get(target)}">${escapeHtml(showText)}</a>`;
  }
  // map 未命中且 map 存在 → 标记为 broken
  if (wikiLinkMap && transform.wikilinkMode === 'link') {
    return `<a class="wikilink broken" title="未找到目标文件">${escapeHtml(showText)}</a>`;
  }
  // 回退到原逻辑（无 map 时保持单文档行为不变）
  switch (transform.wikilinkMode) { ... }
};
```

`convert()` 总入口透传 `wikiLinkMap`：
```ts
export interface ConvertOptions {
  filename?: string;
  wikiLinkMap?: Map<string, string>;  // 新增
}
```

### 6.4 工作流执行引擎（`workflow-engine.ts`）— 遍历调度

```ts
interface WorkflowContext {
  files: { name: string; content: string }[];  // 当前数据流（集合传递）
  variables: Record<string, unknown>;            // 节点间共享变量
  logs: { nodeId: string; level: 'info'|'warn'|'error'; message: string; timestamp: string }[];
}

export async function executeWorkflow(
  workflow: Workflow,
  onProgress?: (nodeId: string, status: 'running'|'done'|'error', detail?: string) => void
): Promise<{ success: boolean; context: WorkflowContext }> {
  let ctx: WorkflowContext = { files: [], variables: {}, logs: [] };
  for (const node of workflow.nodes) {
    if (!node.enabled) continue;
    onProgress?.(node.id, 'running');
    try {
      ctx = await executeNode(node, ctx, (detail) => onProgress?.(node.id, 'running', detail));
      onProgress?.(node.id, 'done');
    } catch (e) {
      ctx.logs.push({ nodeId: node.id, level: 'error', message: String(e), timestamp: new Date().toISOString() });
      onProgress?.(node.id, 'error', String(e));
      return { success: false, context: ctx };
    }
  }
  return { success: true, context: ctx };
}

async function executeNode(node: WorkflowNode, ctx: WorkflowContext, onSubProgress?: (detail: string) => void): Promise<WorkflowContext> {
  switch (node.type) {
    case 'source-files':
      return await executeSourceFiles(node, ctx);        // 调 list-files-by-ext + read-multiple-files，结果填入 ctx.files
    case 'md-to-wiki-site':
      return await executeMdToWikiSite(node, ctx, onSubProgress);  // 调 convertSite，遍历在内部，子进度通过 onSubProgress 回调
    case 'write-directory':
      return await executeWriteDirectory(node, ctx);     // 调 write-directory IPC，遍历在 IPC 内部
    default: throw new Error(`Unknown node type: ${node.type}`);
  }
}
```

### 6.5 工作流编辑器 UI（`workflow-editor.tsx`）

布局：
- **左侧**：节点类型面板（拖入或点击添加）
  - 高级节点区：md→wiki 站点
  - 原子节点区：读文件、写文件
- **中间**：步骤序列（垂直 Card 列表，HTML5 drag-drop 排序，每张 Card 显示节点类型图标+label+状态+子进度如「3/10」）
- **右侧**：选中节点的配置面板（动态表单，按 node.type 渲染不同字段）
- **底部**：`▶ 运行工作流` / `💾 保存工作流` / `📂 加载工作流` / 日志面板

节点配置示例：
- `source-files` 节点：输入模式（文件夹扫描/路径列表）、目录选择按钮、扩展名过滤（默认 .md）
- `md-to-wiki-site` 节点：规则预设选择（下拉，复用 md-to-web 的 DEFAULT_PRESETS）、文件名模板（默认 `{{title}}.html`）
- `write-directory` 节点：输出目录选择按钮

### 6.6 工作流持久化
- localStorage key: `playground:workflows`（工作流列表）
- localStorage key: `playground:workflow-runs`（最近运行历史，仅元数据，不含文件内容）
- 支持导出/导入工作流 JSON

---

## 七、实现步骤（执行顺序）

1. **改造 md-to-web.ts**：`preprocessObsidian` 和 `convert` 加 `wikiLinkMap` 参数（向后兼容），收集 brokenLinks
2. **新建 `utils/md-to-wiki-site.ts`**：站点级转换器（预扫描遍历→建 map→转换遍历→index→站点导航包装），含 onProgress 子进度回调
3. **新建 `main/ipc-workflow.ts`**：4 个 IPC handler（dialog × 2 + list-files-by-ext + write-directory）
4. **编辑 `main/index.ts`**：import 并注册 4 个 handler
5. **编辑 `preload/index.ts` + `index.d.ts`**：暴露 4 个新 API + 类型
6. **新建 `utils/workflow-engine.ts`**：执行引擎（集合传递 + 节点内遍历 + 子进度回调）
7. **新建 `pages/playground/workflow-editor.tsx`**：编辑器 UI（节点列表 + 拖拽排序 + 配置面板 + 运行/保存/加载）
8. **重写 `pages/playground.tsx` → `pages/playground/index.tsx`**：宿主页（保留原 demo 作为 Tab 之一）
9. **验证**（见 §八）

---

## 八、验证步骤

1. `npm run typecheck:web` 通过（不引入新错误）
2. `npm run dev` 启动 Electron
3. 进入 `/playground`，看到工作流编辑器
4. 拖入「读文件」节点，配置：选择目录 + 扩展名 `.md`
5. 拖入「md→wiki 站点」节点，配置：预设「Obsidian→Wiki」
6. 拖入「写文件」节点，配置：输出目录选一个临时文件夹
7. 点击 `▶ 运行工作流`，观察：
   - 节点状态依次变绿
   - md-to-wiki-site 节点显示子进度「3/10」
   - 日志面板显示每步详情
   - 目标目录生成：`index.html` + 各页 html + `assets/style.css` + `assets/script.js`
8. 浏览器打开 `index.html`，验证：
   - 列出所有页面（标题 + 摘要 + 标签）
   - 点击页面进入，顶部有面包屑 `首页 › 当前页标题`
   - 侧边栏显示站点 TOC（所有页面）
9. **跨文件 link 测试**：在某 md 中加 `[[另一文件名]]`，转换后该链接应指向对应 html；故意写一个不存在的 `[[不存在]]`，应显示为 broken link（红色标记）
10. **工作流保存加载**：保存当前工作流为 JSON → 删除 → 导入 → 还原
11. **类型检查与回归**：原 md-to-web 单文档功能页（`/tools/md-to-web`）仍正常工作，不因 `wikiLinkMap` 参数引入而破坏

---

## 九、假设与决策

| # | 决策 | 理由 |
|---|------|------|
| A1 | 线性步骤序列，不引入 reactflow | md→wiki 是线性流程，零新依赖（用户已确认） |
| A2 | 节点抽象为混合（高级 + 2个原子节点） | 高级节点一键用，原子节点供深度定制（用户已确认范围） |
| A3 | 输出写盘到指定目录 | 最贴近「生成站点」体验 |
| A4 | 跨文件 wikilink 两阶段解析 | 单次扫描建 map，转换时查 map，性能好 |
| A5 | broken link 显式标记 | 不静默丢失链接，用户可定位问题 |
| A6 | 站点 index 含标签云 | 多 md 站点的导航核心 |
| A7 | 每页顶部面包屑 + 侧边栏站点 TOC | 双重导航，桌面端友好（用户已确认第一版） |
| A8 | md-to-web.ts 改造向后兼容 | 单文档功能页不受影响，wikiLinkMap 可选参数 |
| A9 | 工作流持久化走 localStorage | 与 md-to-web 预设保持一致，最小改动 |
| A10 | 不实现分支/条件节点 | 本期场景线性，分支留作后续 |
| A11 | IPC handler 拆分到独立文件 `ipc-workflow.ts` | 主进程 index.ts 已 500+ 行，避免继续膨胀 |
| A12 | 不实现图片资源 base64 内嵌 | 本期只处理文本 md，图片留作后续 |
| A13 | **遍历采用「节点内隐式遍历 + 集合传递」** | context.files 是数组，节点天然遍历；不引入显式 for-each 循环节点，保持线性拓扑简洁（用户强调遍历设计，此为核心决策） |
| A14 | **遍历进度通过 onSubProgress 回调上报** | md-to-wiki-site 内部遍历时报告「3/10」子进度，UI 实时反馈 |

---

## 十、不在本次范围

- 工作流分支/条件/循环节点（需 reactflow 画布）
- 图片资源打包进站点（base64）
- 跨站点 wikilink（仅同站点内）
- 反向链接图（backlinks）的可视化
- 工作流版本管理 / 团队共享
- 工作流定时执行 / 命令行调用
- 与 Gradio/CLI 端同步
- 其他原子节点（文本替换、变量赋值、单文档 convert）
