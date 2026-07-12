# 计划：新增「Markdown → 静态网页」功能页

> 核心场景：**Obsidian 笔记 → Wiki 形式静态 HTML**
> 用户可配置规则（样式外观 / 内容结构 / 文本转换 / 内容筛选 / 输出形式），
> 规则字段允许通过 `{{...}}` 模板**读取内容源**（frontmatter / tags / 首个标题等）以实现动态化，
> 规则可作为预设保存/加载，形成可复用工作流。

---

## 一、现状分析（基于 Phase 1 探索）

### 1.1 项目架构要点
- 桌面端 `electron-app`：Electron 31 + React 18 + TypeScript + Arco Design + Tailwind + Redux Toolkit + react-router-dom v6
- 新增功能页的**标准三步走**（README 与现有代码均遵循）：
  1. 在 [pages/features/](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/pages/features) 下新建 `kebab-case.tsx`
  2. 在 [routesCommon.js](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/router/routesCommon.js) 注册路由
  3. 在 [Navbar.tsx](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/components/Navbar.tsx) 的 `LINKS` 数组「通用工具」分组追加菜单项

### 1.2 现有相关代码
- [markdown-outline.tsx](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/pages/features/markdown-outline.tsx)（392 行）：**唯一与 markdown 相关的功能页**
  - 纯前端、零依赖，正则提取/合并/重组大纲
  - 文件结构惯例：顶部 `const xxxStyle: React.CSSProperties`、中部纯函数 utils、底部 `const XxxFeature: React.FC`
  - 通过 `useTheme()` 的 `colors`（pageBg/cardBg/textPrimary/textSecondary/border/inputBg）做深浅色自适应
  - 输出区为「代码块 + Copy 按钮 + toast 反馈」
- [utils/file.ts](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/utils/file.ts)：renderer 侧已有 `utils/` 目录（当前几乎为空），可用于放本功能的转换逻辑

### 1.3 关键缺口
- **没有任何 markdown → HTML 渲染库**（marked / markdown-it / remark 均未安装）
- **没有任何规则/模板/预设系统**
- **没有任何静态网页导出能力**（现有导出仅限词云 png、词频 txt、周回 bat、剪贴板 Copy）
- Electron 主进程 IPC `get-preferences/set-preferences` 存 `userData/preferences.json`，可用于持久化规则预设（参考用，本次主走 localStorage 以最小化改动）

### 1.4 测试样本
- [test_data/example/赤心巡天第1章.md](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/test_data/example/赤心巡天第1章.md)、`赤心巡天第2章.md`、`赤心巡天第3章.md`、`prompt-test.md` 可作转换测试样本（注意：这些是普通 md，不是 Obsidian 格式；Obsidian 样本需用户自备或后续补）

---

## 二、设计决策

### 2.1 库选型：**`markdown-it`**
| 选项 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| `marked` | 轻、快 | 扩展性弱，自定义规则麻烦 | ✗ |
| **`markdown-it`** | 插件生态成熟、可写内联规则、API 清晰 | 体积稍大（~100KB） | **✓ 采用** |
| `remark/unified` | 极强（AST） | 生态重、学习成本高 | ✗ 过度工程 |
| 纯正则自写 | 零依赖 | md→html 全量转换极其复杂、易踩坑 | ✗ |

- 配套：`@types/markdown-it`（devDependencies）
- Obsidian 专有语法（`[[wikilink]]`、`![[embed]]`、`#tag`、`%%comment%%`、`> [!note]` callout）走**自写预处理**，转成标准 md 后再喂给 markdown-it，避免引入过多插件

### 2.2 规则配置格式：**结构化 TS 对象 + JSON 导入导出**
- 页面内以表单交互编辑规则（实时生效）
- 规则可「导出为 JSON 文件」「从 JSON 文件导入」，形成可分享/复用的**预设工作流**
- 预设同时持久化到 `localStorage`（key: `md-to-web:presets`），支持快速切换
- 内置 3 个默认预设：「Obsidian→Wiki」「极简纯文本」「GitHub 文档风格」

### 2.3 动态规则（读取内容源）
规则对象中**任何字符串值**都可包含模板占位符，转换前会先按内容源解析：

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{frontmatter.<field>}}` | frontmatter 任意字段 | `{{frontmatter.title}}`、`{{frontmatter.author}}` |
| `{{title}}` | 文档首个 H1 标题 | 用于页面标题/文件名 |
| `{{tags}}` | 全文 `#tag` 列表（空格分隔） | 用于底部标签区 |
| `{{filename}}` | 输入文件名（无扩展名） | 用于文件名模板 |
| `{{date}}` | 当前日期 `YYYY-MM-DD` | 用于"生成于"页脚 |

解析流程：① 解析 frontmatter / tags / 首标题 → 得到「内容元数据」→ ② 深度遍历规则对象，对每个 string 值做 `{{...}}` 替换 → ③ 用解析后的规则驱动转换。
**「以内容源为准」**：当规则字段留空且内容源有对应值时，自动采用内容源值（如规则未设 title，则用 `{{title}}`）。

### 2.4 输出模式
- **单文件模式**（默认）：CSS 内联到 `<style>`、JS 内联到 `<script>`，一个 `.html` 文件即可分发
- **多文件模式**：输出 `index.html` + `assets/style.css` + `assets/script.js`（适合多页面 wiki 站点，本期仅生成单页骨架，多页关联留作后续）

### 2.5 页面交互布局
参照 `markdown-outline.tsx` 的纵向流，但因功能复杂改为**左右双栏**：
- **左栏（输入与规则）**：
  - Tab 1「内容」：md 文本框 + 文件选择按钮（读 .md） + frontmatter 预览（只读）
  - Tab 2「规则」：分 5 个折叠卡片 —— 样式外观 / 内容结构 / 文本转换 / 内容筛选 / 输出形式
  - Tab 3「预设」：预设列表（新建/重命名/删除/导入/导出）
- **右栏（预览与导出）**：
  - 顶部按钮：`▸ 生成预览` / `Copy HTML` / `下载 .html` / `下载 .zip`（多文件模式）
  - iframe 实时渲染最终网页（`srcDoc` 注入）
- **底部 toast**：复用现有 toast 模式

---

## 三、规则 Schema（TypeScript 类型）

```ts
// electron-app/src/renderer/src/utils/md-to-web.ts 中定义
export interface MdToWebRule {
  style: {
    theme: 'light' | 'dark' | 'sepia' | 'obsidian';
    fontFamily: string;              // CSS font-family
    maxWidth: number;                // 正文最大宽度 px
    sidebar: boolean;                // 是否显示左侧 TOC 侧栏
    codeHighlight: 'github' | 'dracula' | 'monokai';
    customCss?: string;              // 用户追加 CSS
  };
  content: {
    generateToc: boolean;
    tocDepth: 1 | 2 | 3 | 4 | 5 | 6;
    headingAnchors: boolean;
    showFrontmatter: boolean;        // 顶部元信息表
    showTags: boolean;                // 底部标签区
    calloutStyle: 'obsidian' | 'github' | 'plain';
  };
  transform: {
    wikilinkMode: 'link' | 'plain' | 'strip';
    wikilinkBaseUrl: string;          // 支持 {{frontmatter.vault}}/
    embedMode: 'link' | 'placeholder' | 'strip';
    tagMode: 'badge' | 'link' | 'plain';
    stripComments: boolean;           // %%...%%
    customReplacements?: { pattern: string; replacement: string; flags?: string }[];
  };
  filter: {
    includeHeadings?: string[];       // 正则数组，命中其一则保留该 section
    excludeHeadings?: string[];
    includeTags?: string[];            // section 含任一标签则保留
    excludeTags?: string[];
    frontmatterFilter?: { field: string; value: string }[];
  };
  output: {
    mode: 'single-file' | 'multi-file';
    includeScript: boolean;            // TOC 折叠/锚点平滑滚动等交互
    filenameTemplate: string;          // 支持 {{...}} 模板
    htmlLang: string;                  // <html lang>
  };
}
```

默认预设（Obsidian→Wiki）：
```ts
const DEFAULT_OBSIDIAN_WIKI_RULE: MdToWebRule = {
  style: { theme: 'obsidian', fontFamily: '...var(--font-text,...)', maxWidth: 820, sidebar: true, codeHighlight: 'dracula' },
  content: { generateToc: true, tocDepth: 3, headingAnchors: true, showFrontmatter: true, showTags: true, calloutStyle: 'obsidian' },
  transform: { wikilinkMode: 'link', wikilinkBaseUrl: '{{frontmatter.vault}}/', embedMode: 'link', tagMode: 'badge', stripComments: true },
  filter: {},
  output: { mode: 'single-file', includeScript: true, filenameTemplate: '{{title}}.html', htmlLang: 'zh-CN' },
};
```

---

## 四、转换流水线（utils/md-to-web.ts 核心函数）

```
输入 md 文本
  │
  ├─ parseFrontmatter(text)        → { frontmatter, body }     // 解析首部 --- ... ---
  ├─ extractMeta(body)             → { title, headings[], tags[] }
  │
  ├─ resolveRule(rule, meta)        → resolvedRule               // {{...}} 模板替换
  │
  ├─ applyFilter(body, resolvedRule.filter, meta) → filteredBody  // section 级别筛选
  │
  ├─ preprocessObsidian(filteredBody, resolvedRule.transform)    // [[..]] ![[..]] #tag %%..%% >[!x]
  │     → 标准 md 文本
  │
  ├─ md.render(standardMd)         → innerHtml                   // markdown-it 渲染
  │
  ├─ wrapHtml({ innerHtml, toc, frontmatterTable, tagHtml, resolvedRule })
  │     → 完整 HTML 字符串（含内联 CSS/JS 或分离资源）
  │
  └─ 返回 { html, meta, resolvedRule }
```

**模块清单（单文件 utils/md-to-web.ts）**：
- `parseFrontmatter(text)`：简易 YAML 解析（仅支持 `key: value`、列表 `- item`、字符串/数字/布尔），不引入额外 yaml 库
- `extractMeta(body)`：首个 H1、所有标题层级、所有 `#tag`
- `resolveRule(rule, meta)`：深度遍历替换 `{{...}}`
- `splitSections(body)`：按 `^#{1,6}\s` 切分（复用 `markdown-outline.tsx` 的 `parseArticle` 思路）
- `applyFilter(body, filter, meta)`：按 heading regex / tag / frontmatter 字段保留或剔除 section
- `preprocessObsidian(body, transform)`：
  - `\[\[([^\]|]+)(?:\|([^\]]+))?\]\]` → `<a href="${baseUrl}$1" class="wikilink">$2||$1</a>` 或纯文本或剔除
  - `!\[\[([^\]]+)\]\]` → `<a class="embed-link" href="...">$1</a>` 等
  - 行首/行内 `#tag` → `<span class="tag">#$1</span>`
  - `%%(.+?)%%` → 剔除或转 `<!-- -->`
  - `> \[!(note|warning|tip|...)\]\s*\n> (.+(?:\n>.*)*)` → callout div
- `renderMarkdown(md)`：markdown-it 实例（启用 linkify、breaks、html(false)）
- `buildToc(headings, depth)`：生成嵌套 `<ul>` 目录
- `wrapHtml(...)`：组装完整 HTML 模板字符串，CSS 内联或外链
- `convert(text, rule)`：流水线编排总入口
- 内置主题 CSS 字符串常量（4 套）

---

## 五、要改动的文件清单

### 5.1 新建
| 路径 | 职责 | 规模估计 |
|------|------|----------|
| `electron-app/src/renderer/src/pages/features/md-to-web.tsx` | 功能页组件（样式 + 双栏布局 + 交互） | ~500-700 行 |
| `electron-app/src/renderer/src/utils/md-to-web.ts` | 转换逻辑（schema + 流水线 + 主题 CSS） | ~600-800 行 |

### 5.2 编辑
| 路径 | 改动点 |
|------|--------|
| [routesCommon.js](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/router/routesCommon.js) | 顶部 `import MdToWeb from '@renderer/pages/features/md-to-web'`；数组追加 `{ path: '/tools/md-to-web', component: MdToWeb }` |
| [Navbar.tsx](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/components/Navbar.tsx) | `LINKS` 中「通用工具」分组追加 `{ key: '3a_15', label: 'Markdown → 静态网页', to: '/tools/md-to-web' }` |
| [package.json](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/package.json) | `dependencies` 加 `"markdown-it": "^14.1.0"`；`devDependencies` 加 `"@types/markdown-it": "^14.1.2"` |

### 5.3 不改动
- 不动主进程 `src/main/index.ts`（纯前端，无需 IPC）
- 不动 Python 端
- 不动 Gradio/CLI 端
- 不新建文档/README

---

## 六、实现步骤（执行顺序）

1. **装依赖**：`cd electron-app && npm install markdown-it@^14.1.0 && npm install -D @types/markdown-it@^14.1.2`
2. **写 utils/md-to-web.ts**：按 §四 实现 schema、流水线、主题 CSS、3 个默认预设
3. **写 pages/features/md-to-web.tsx**：双栏布局 + 表单 + iframe 预览 + 导出按钮
4. **注册路由**：编辑 `routesCommon.js`
5. **加导航**：编辑 `Navbar.tsx`
6. **验证**（见 §七）

---

## 七、假设与决策（需用户知晓）

| # | 决策 | 理由 |
|---|------|------|
| A1 | 用 `markdown-it` 而非 `marked`/纯正则 | 扩展性 + 自定义规则，符合"配置规则"诉求 |
| A2 | Obsidian 专有语法走自写预处理，不引 obsidian-export/markdown-it-wikilinks 等插件 | 避免依赖蔓延，Obsidian 语法种类有限可控 |
| A3 | frontmatter 用自写极简解析（不引 js-yaml） | 项目零 yaml 依赖，仅支持扁平 key:value + 列表已够 |
| A4 | 预设存 localStorage（不进 preferences.json/IPC） | 最小化改动，纯前端自治；如需跨设备同步后续可加 IPC |
| A5 | 转换逻辑放 `utils/md-to-web.ts` 而非全塞进页面文件 | 本功能复杂度远超 markdown-outline，拆分可维护 |
| A6 | 预览用 `<iframe srcDoc>` 隔离样式 | 避免注入的页面 CSS 污染 Arco 应用 UI |
| A7 | 文件读取用浏览器 `<input type=file>` + FileReader，不走 IPC | markdown-outline 也是纯前端 textarea，保持一致；后续可加"读文件"按钮调 IPC |
| A8 | 多文件模式本期仅输出单页骨架（1 个 html + 1 css + 1 js） | 多页 wiki 站点（跨文件 wikilink 解析、sitemap）超出本次"单篇转换"范围，留作后续 |
| A9 | 不引入 highlight.js/prism（代码高亮主题用 CSS class 约定） | 避免再增依赖；用户后续可自行引入 |

---

## 八、验证步骤

1. `cd electron-app && npm run typecheck` —— 类型检查通过
2. `npm run dev` —— 启动成功，无控制台报错
3. 导航「通用工具」下出现「Markdown → 静态网页」菜单项，点击进入页面
4. 粘贴 [test_data/example/赤心巡天第1章.md](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/test_data/example/赤心巡天第1章.md) 内容到输入框
5. 加一段 Obsidian 语法测试：
   ```
   [[笔记A|显示A]]  ![[图片.png]]  #标签  %%注释%%  
   > [!note] 这是一个 callout
   > 内容
   ```
6. 切换规则预设「Obsidian→Wiki」「极简纯文本」「GitHub 文档风格」，预览 iframe 内容应随之变化
7. 内容筛选测试：`filter.excludeHeadings` 填入某标题正则，预览中对应 section 消失
8. 动态字段测试：`output.filenameTemplate` 设为 `{{title}}.html`，下载文件名应为首个 H1 标题
9. 单文件模式：下载 `.html`，双击在浏览器打开，样式完整、无外部资源依赖
10. 多文件模式：下载得到 `index.html` + `assets/style.css` + `assets/script.js`，浏览器打开 index.html 正常
11. 预设导入导出：导出 JSON → 删除预设 → 导入 JSON → 还原
12. 深/浅色主题切换：页面 UI 跟随 `useTheme()` 颜色变化，预览 iframe 内网页主题独立于应用主题（由规则 `style.theme` 决定）

---

## 九、不在本次范围

- 多 md 文件批量转换 / wiki 站点整体生成
- 跨文件 wikilink 解析与反向链接图
- 图片资源实际打包进 HTML（base64）
- 代码高亮实际渲染（仅输出带 class 的 `<code>`，主题 CSS 已预留）
- Gradio 端 / CLI 端同步该功能
- 规则预设的跨设备云同步
