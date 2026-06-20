# Text-maestro 功能迁移与实装计划
（基于 Gradio 已实现功能 → Electron 桌面端）

## 一、项目现状全景

### 1.1 Gradio 端已实现的功能清单（按模块分组）

| 模块 | 功能 | Python 文件 | 说明 |
|------|------|-------------|------|
| **基础工具** | greet 打招呼 | utils.py | 演示用 |
| | Unicode ↔ 中文 双向转换 | utils.py | 文本编码工具 |
| | 文本比较 Diff | utils.py | difflib 实现差异高亮 |
| | RGB ↔ 十六进制颜色码 双向转换 | utils.py | 简单颜色工具 |
| | 搜索结果筛选（正则） | utils.py | 每行匹配/不匹配分组 |
| **文件操作** | 通过路径读取文本文件 | utils.py | utf-8 读取 |
| | 通过文件对象读取 | utils.py | Gradio File 组件用 |
| | UTF-8 编码预览 CSV | utils.py | 解决 WPS 默认 GBK 乱码 |
| | 多篇文本文件有序拼接 | utils.py | 每行一个路径 → 合并文本 |
| | 多个 CSV 文件有序拼接 | utils.py | pandas concat |
| **目录操作** | 目录树生成（tree/ls 样式） | utils_folder.py | ✅ **Electron 已有等效实现** |
| | 目录大小统计 | utils_folder.py | ✅ **Electron 已有等效实现** |
| | 硬盘空间信息 | utils_folder.py | ✅ **Electron 已有等效实现** |
| | 当前工作目录 | utils_folder.py | 简单自检 |
| | 按周回整理文件（生成BAT移动脚本） | utils_folder.py | 文件名带日期时间的自动归档 |
| **分词统计** | 字数/词数统计 | utils_jieba.py | jieba 分词 |
| | 词频统计（停用词+自定义词典） | utils_jieba.py | 仅统计2字以上名词 |
| **词云** | 词频 → 词云图生成 | utils_wordcloud.py | Python wordcloud 库，需字体文件 |
| **简繁转换** | 简体 → 繁体 | utils.py | opencc-python 库 |
| | 繁体 → 简体 | utils.py | opencc-python 库 |
| **Markdown 工具** | 提取文章大纲 | utils.py | 正则匹配 # 标题 |
| | 两个文档大纲合并（去重） | utils.py | 按大章节合并子章节 |
| | 根据新大纲重组文章 | utils.py | 移动章节顺序 |
| **聊天/社交分析** | Discord 用户名筛选 CSV | utils.py | pandas 按列筛选 |
| | Discord 发言时段频率统计 | utils.py | 按 N 分钟窗口分组 |
| | Discord 频道时段偏好度分析 | utils.py | 用户% / 频道% = 偏好度 |
| | Twitch 直播间弹幕分析（JSON文件） | utils_social_media.py | 高光时刻/铁粉/徽章画像 |
| | Twitch 直播间弹幕分析（JSON文本） | utils_social_media.py | 同上，输入改为粘贴文本 |
| **文件搜索（Everything）** | 目录下文件快速搜索 | utils_everything.py | 需要 Everything 后台运行 + SDK DLL |

### 1.2 Electron 端当前状态

**已实现且可用的功能：**
| 功能 | 位置 | 状态 |
|------|------|------|
| 目录树生成 + 磁盘统计 | pages/features/foldertree.tsx | ✅ 可用（布局刚修正） |
| 检查服务连通性（TCP端口） | components/StatusCheck.tsx | ✅ 可用 |
| 应用偏好设置（读写 JSON） | pages/setting.tsx | ✅ 可用 |
| 主进程 IPC Handler | main/index.ts | ✅ ping / read-file / set-preferences / get-preferences / check-server / generate-tree |

**Navbar 声明但未实现的页面入口：**

| 分类 | Navbar 条目 | 预期路由 | 对应 Gradio 功能 |
|------|------------|----------|-----------------|
| 通用文档 | obsidian 单篇文档分析 | /common/obsidian-single | 字数统计 + 大纲 + 待办统计（需新增） |
| | obsidian 多文档分析 | /common/obsidian-multi | 同上 + 目录遍历 |
| | 掘金小册 上云 action 生成 | /common/juejin-action | ❓ Gradio 中未直接实现 |
| | Hiplot 作图 meta 生成 | /common/hiplot-meta | ❓ Gradio 中未直接实现 |
| | Apifox/Postman 双向配置改造 | /common/api-config | ❓ Gradio 中未直接实现 |
| 社交-论坛 | b站评论 | /forum/bili-comment | ❓ Gradio 中未直接实现 |
| | 知乎用户回答 | /forum/zhihu-answer | ❓ Gradio 中未直接实现 |
| | b站收藏夹 | /forum/bili-fav | ❓ Gradio 中未直接实现 |
| 社交-聊天 | discord 聊天记录 | /chat/discord | ✅ Gradio 已有（utils.py 中多函数） |
| | qq 聊天记录 | /chat/qq | ❓ Gradio 中未直接实现 |
| | 微信聊天记录 | /chat/wechat | ❓ Gradio 中未直接实现 |
| 游戏工具 | MAA 明日方舟库存管理 | /game/maa-inventory | ❓ Gradio 中未直接实现 |
| | 明日方舟寻访记录管理 | /game/ak-recruit | ❓ Gradio 中未直接实现 |
| 图像 | 手写信生成 | /image/handwrite | ❓ Gradio 中未直接实现 |
| | 学信网学历截图 | /image/xuexin | ❓ Gradio 中未直接实现 |

**Gradio 已有但 Electron 完全没做（Navbar 也没声明入口）：**

| 功能 | 建议的 Electron 实现方式 |
|------|------------------------|
| Unicode ↔ 中文双向转换 | 纯前端 JS，encodeURIComponent / JSON.parse 配合 |
| 文本比较 Diff | 用 `diff` npm 包，或原生 JS 实现 Myers diff |
| RGB ↔ 十六进制颜色码 | 纯前端 JS，几行逻辑 |
| 字数/词数统计 | 前端 JS 版 jieba：`segmentit` 或 `@node-rs/jieba`（原生模块，Electron 可用） |
| 词频统计 | 同上，分词后 Map 计数 |
| 词云图 | 前端方案：`wordcloud2.js`（canvas）|
| 简繁转换 | `opencc-js` npm 包（纯 JS，无需系统依赖）|
| Markdown 大纲提取/合并/重组 | 纯前端，正则或 `marked` 解析 |
| 多文件拼接（文本/CSV） | 前端多文件选择 + fs.readFile + 拼接 |
| UTF-8 CSV 预览 | 前端 `papaparse` npm 包 |
| 搜索结果筛选（正则） | 前端 RegExp.test |
| 文件路径读取 | ✅ Electron 已有 `read-file` IPC |
| Discord 聊天分析（3 个子功能） | 主进程实现：csv-parse 替代 pandas |
| Twitch 弹幕分析 | 主进程实现：JSON.parse 替代 json 库 |
| 按周回整理文件（BAT脚本生成） | 主进程 Node.js：fs + path + Date 处理即可 |
| Everything 快速文件搜索 | 可选功能：主进程调用 DLL，或降级用 Node fs.walk 实现 |

---

## 二、迁移策略与技术选型

### 2.1 总体原则

1. **纯 Node.js + 前端实现，不依赖 Python/Gradio**
   - Electron 本身就跑在 Node.js + Chromium 上，所有文本处理都可以直接用 JS 做
   - 省去 Gradio 端口监听、Python 环境、依赖管理等一系列问题

2. **Gradio 的 Python 实现是「业务逻辑规格说明」**
   - 逐行理解 `utils_folder.py`、`utils.py`、`utils_jieba.py` 等文件中的算法
   - 在 JavaScript/TypeScript 中重写等效逻辑

3. **主进程/渲染进程分工**
   - **主进程（main/index.ts）**：文件系统操作、大文件流处理、IPC Handler
   - **渲染进程（React 页面）**：UI 交互、输入验证、结果展示、纯计算逻辑（可直接在前端做）
   - **通信**：`window.electron.ipcRenderer.invoke(channel, args)`

4. **UI 风格统一**：沿用 `foldertree.tsx` 的 GitHub 深色主题 + 代码块输出样式

### 2.2 关键依赖选型（Gradio Python 库 → JS 等效替代）

| Gradio 依赖 | Electron 可用方案 | 说明 |
|-------------|-------------------|------|
| `jieba`（分词） | `@node-rs/jieba`（Rust 实现的 Node 原生模块） 或 `segmentit`（纯 JS） | 两者在 Electron 都可用。推荐 `@node-rs/jieba`，性能好，中文分词准确。 |
| `opencc`（简繁转换） | `opencc-js`（纯 JS，npm 可装） | 100% 前端实现，无需系统依赖 |
| `wordcloud`（词云图） | `wordcloud2.js`（前端 canvas 绘制） | 纯前端，用户体验比 Python 生成图片更好 |
| `pandas`（CSV/DataFrame） | `papaparse`（CSV 解析）+ 原生 Array 操作 | CSV 解析 papaparse 够用；数据分析逻辑手写 JavaScript |
| `difflib`（文本 diff） | `diff`（npm 包，diff-match-patch 的简化版）或原生实现 | 纯前端 |
| `Everything SDK`（文件搜索） | Node `fs` 递归遍历 或 通过 `ffi-napi` 调 DLL | 推荐降级实现：fs 遍历（虽然慢但零依赖），保留「启用 Everything 加速」作为可选开关 |

### 2.3 需要添加的 IPC Handler（主进程）

在 `electron-app/src/main/index.ts` 中新增以下 channel：

| IPC Channel | 参数 | 返回 | 对应 Gradio 功能源 |
|-------------|------|------|-------------------|
| `analyze-markdown` | filePath: string | { wordCount, charCount, headings[], tags[], todos[], codeBlocks[] } | 新增（Obsidian 文档分析） |
| `analyze-markdown-folder` | dirPath: string | 同上，但返回多文件统计汇总 | 新增 |
| `parse-csv` | filePath: string | { headers, rows[][] } | utils.py `preview_csv` + `filter_by_username` |
| `analyze-discord-chat` | filePath: string, options: { username? , granularityMin? } | { frequencyTable, preferenceTable, userFilteredCsv } | utils.py `count_message_frequency` + `calculate_user_preference` |
| `analyze-twitch-chat` | filePath or jsonText | { report: string, totalMsgs, uniqueUsers, peakMoments, topUsers, badges } | utils_social_media.py |
| `concatenate-files` | filePaths: string[], type: 'text' \| 'csv' | 拼接后的字符串 | utils.py `concatenate_text_files` / `concatenate_csv_files` |
| `organize-files-by-week` | { filePaths, timeFormat, targetFolder, year, weekStartType } | 生成的 BAT 脚本字符串 | utils_folder.py `organize_files_by_week` |
| `file-search` | { directory, keyword, recursive } | string[] 路径列表 | utils_everything.py（降级用 fs 实现） |

---

## 三、分批实施计划

### 第 1 批：简单纯文本工具（最快完成，验证端到端链路）

**目标**：创建 4 个简单页面，所有逻辑都可以在前端直接完成，不需要新增 IPC。

| # | 功能 | 对应 Gradio 源 | 技术方案 | 页面路由 |
|---|------|---------------|---------|---------|
| 1.1 | Unicode ↔ 中文 双向转换 | utils.py | 纯前端：`JSON.parse('"'+text+'"')` / `escape` | /tools/unicode-converter |
| 1.2 | RGB ↔ 十六进制 颜色码转换 | utils.py | 纯前端：字符串操作 + parseInt | /tools/color-converter |
| 1.3 | 简繁中文双向转换 | utils.py (opencc) | 前端装 `opencc-js` npm 包 | /tools/simplified-traditional |
| 1.4 | 搜索结果筛选（正则匹配） | utils.py `filter_files` | 纯前端：textarea 输入 + RegExp | /tools/regex-filter |

**改动文件**：
- `electron-app/package.json` → 新增 devDependency: `opencc-js`
- `electron-app/src/renderer/src/App.tsx` → 新增 4 个路由
- `electron-app/src/renderer/src/components/Navbar.tsx` → 将 4 个入口加到"通用工具"分组
- `electron-app/src/renderer/src/pages/features/` → 新建 4 个页面组件（复用 foldertree 的样式）

### 第 2 批：文件操作 + 聊天分析（需要新增 IPC）

**目标**：实现 Discord/Twitch 聊天分析 + 文件工具，涉及文件读取和数据分析。

| # | 功能 | 对应 Gradio 源 | 技术方案 | 页面路由 |
|---|------|---------------|---------|---------|
| 2.1 | UTF-8 CSV 预览 + 按列筛选 | utils.py `preview_csv` + `filter_by_username` | 主进程 `parse-csv` handler（papaparse） | /tools/csv-preview |
| 2.2 | 多文件拼接（文本/CSV） | utils.py `concatenate_text_files` / `concatenate_csv_files` | 主进程 `concatenate-files` handler | /tools/file-concatenate |
| 2.3 | Discord 聊天记录分析（三合一） | utils.py 多个函数 | 主进程 `analyze-discord-chat` handler | /chat/discord |
| 2.4 | Twitch 直播间弹幕分析 | utils_social_media.py | 主进程 `analyze-twitch-chat` handler | /chat/twitch |

**改动文件**：
- `electron-app/package.json` → 新增: `papaparse`
- `electron-app/src/main/index.ts` → 新增 4 个 IPC handler
- `electron-app/src/renderer/src/App.tsx` → 新增 4 个路由
- Navbar 新增入口（/chat/discord /chat/twitch 等已在 Navbar 有占位，但需要补全路由）
- 新建页面组件 × 4

### 第 3 批：Markdown / Obsidian 工具

| # | 功能 | 对应 Gradio 源 | 技术方案 | 页面路由 |
|---|------|---------------|---------|---------|
| 3.1 | Markdown 大纲提取 | utils.py `extract_markdown_outline` | 纯前端正则 | /tools/markdown-outline |
| 3.2 | Markdown 大纲合并（两篇文档） | utils.py `merge_two_docs` | 纯前端 | /tools/markdown-merge |
| 3.3 | 按新大纲重组文章 | utils.py `reorganize_article` | 纯前端 | /tools/article-reorganize |
| 3.4 | Obsidian 单篇文档分析 | 需要新增：字数、标签、待办、代码块统计 | 主进程 `analyze-markdown` handler | /common/obsidian-single |
| 3.5 | Obsidian 多文档统计 | 同上 + 目录遍历 | 主进程 `analyze-markdown-folder` handler | /common/obsidian-multi |

### 第 4 批：分词统计 + 词云（重型功能）

| # | 功能 | 对应 Gradio 源 | 技术方案 | 页面路由 |
|---|------|---------------|---------|---------|
| 4.1 | 字数/词数统计 | utils_jieba.py `count_chars_and_words` | 前端 `@node-rs/jieba` | /tools/word-count |
| 4.2 | 词频统计（停用词+自定义词典） | utils_jieba.py `word_frequency` | 同上 | /tools/word-frequency |
| 4.3 | 词频 → 词云图 | utils_wordcloud.py | 前端 `wordcloud2.js` canvas 绘制 | /tools/wordcloud |

**注意**：`@node-rs/jieba` 是 Rust 编译的 Node 原生模块，在 Electron 打包时需要 `electron-builder rebuild` 确保二进制兼容。

### 第 5 批：目录管理与文件搜索（Electron 端已有部分功能）

| # | 功能 | 对应 Gradio 源 | 技术方案 | 页面路由 |
|---|------|---------------|---------|---------|
| 5.1 | 按周回整理文件（生成BAT脚本） | utils_folder.py `organize_files_by_week` + `WeekCalculator` 类 | 主进程 `organize-files-by-week` handler | /tools/weekly-organizer |
| 5.2 | 快速文件搜索 | utils_everything.py | 主进程 `file-search` handler，默认 fs 遍历，可选 Everything 加速 | /tools/file-search |
| 5.3 | 文本比较 Diff | utils.py `diff_texts` | 前端 `diff` npm 包 | /tools/text-diff |

### 第 6 批：Navbar 已声明但 Gradio 未直接实现的功能

这些功能在 Gradio 端没有现成实现，需要从零设计：

| # | Navbar 条目 | 预期功能 | 建议实现方式 |
|---|------------|---------|------------|
| 6.1 | b站评论 | 解析 b 站评论导出数据，统计活跃用户、关键词 | 主进程解析 HTML/JSON，同 Twitch 方案 |
| 6.2 | 知乎用户回答 | 解析知乎回答导出，统计话题、时间分布 | 同上 |
| 6.3 | b站收藏夹 | 解析收藏夹导出，统计 UP 主、视频标题关键词 | 同上 |
| 6.4 | QQ 聊天记录 | 解析 QQ 导出的 txt/html，统计消息、用户、时段 | 主进程解析 + 前端展示 |
| 6.5 | 微信聊天记录 | 解析微信导出，同上 | 主进程解析 + 前端展示 |
| 6.6 | MAA 明日方舟库存管理 | 解析 MAA 导出的 JSON 库存数据 | 主进程解析 + 前端表格展示 |
| 6.7 | 明日方舟寻访记录 | 解析寻访抽卡记录，6 星间隔/稀有度统计 | 主进程解析 + 前端展示 |
| 6.8 | 手写信生成 | 生成手写风格排版图像截图 | Electron `contents.capturePage` 或前端 canvas |
| 6.9 | 学信网学历截图 | 模板化文档截图带水印 | 同上 |
| 6.10 | 掘金小册 上云 action 生成 | 根据输入参数生成 GitHub Actions workflow YAML | 纯前端字符串模板 |
| 6.11 | Hiplot 作图 meta 生成 | 生成 Hiplot 工具所需的元数据配置 | 纯前端表单 → JSON 输出 |
| 6.12 | Apifox/Postman 双向配置改造 | 两种 API 工具配置格式互转 | 纯前端 JSON 转换 |

**建议**：6.1-6.9 先不做，等前 5 批落地且用户体验验证后再说；6.10-6.12 相对简单（纯文本转换）可以穿插在第 1/3 批之间做。

---

## 四、第 1 批详细实施步骤（示例）

以「简繁转换」为例说明每个功能的实现模式：

### 步骤 A：安装依赖（如果需要）

```bash
cd electron-app
npm install opencc-js --save
```

### 步骤 B：创建页面组件

```typescript
// electron-app/src/renderer/src/pages/features/simplified-traditional.tsx
// 风格完全同 foldertree.tsx：GitHub 深色主题 + 代码块输出 + 复制按钮

// 组件状态：
// - inputText: string (textarea 输入)
// - direction: 's2t' | 't2s' (单选按钮)
// - outputText: string (结果)
// - copyState: 'idle' | 'copied' (复制按钮状态)

// 逻辑：onChange 时即时转换（opencc-js 是同步的，快）
```

### 步骤 C：注册路由

在 `App.tsx` 的 Routes 中新增：
```tsx
<Route path="/tools/simplified-traditional" element={<SimplifiedTraditional />} />
```

### 步骤 D：Navbar 添加入口

在 `Navbar.tsx` 的 Menu items 中新增一项，指向新路由。

---

## 五、风险点与处理方案

| 风险 | 影响 | 处理方案 |
|------|------|---------|
| `@node-rs/jieba` 在 Electron 打包后二进制不兼容 | 第 4 批功能不可用 | 1. 用 `electron-builder --mac --win` 时确保 rebuild；2. 备选方案用纯 JS 的 `segmentit` |
| Everything SDK 仅 Windows 可用 | 跨平台问题 | 默认用 fs 遍历实现搜索，明确写"Windows 用户可启用 Everything 加速" |
| 页面数量过多导致 Navbar 过长 | UI 体验 | 分组 + 可折叠菜单（Arco Menu 原生支持） |
| 大文件/大目录分析卡住 UI | 性能 | 主进程用 `Promise` + `setImmediate` 分片处理，渲染进程显示 loading 状态 |
| Discord/QQ/微信导出格式多种多样 | 解析失败 | 支持最常见的 2-3 种格式，在页面内明确列出"支持的格式版本" |

---

## 六、实施顺序与工时估计

| 批次 | 功能 | 估计工时 | 依赖前置 |
|------|------|---------|---------|
| 1 | 纯文本工具 × 4（Unicode、颜色码、简繁、正则筛选） | 1-2 小时 | 无 |
| 2 | 文件操作 + Discord/Twitch 聊天分析 × 4 | 3-4 小时 | 无 |
| 3 | Markdown/Obsidian 工具 × 5 | 2-3 小时 | 无 |
| 4 | 分词 + 词频 + 词云 × 3 | 2-3 小时 | npm 依赖装完验证 |
| 5 | 周回整理 + 文件搜索 + Diff × 3 | 2-3 小时 | 无 |
| 6 | Navbar 未实现功能（6.1-6.12） | 按需，暂不估计 | 前 5 批完成后 |

**合计**：约 10-15 小时可完成 Gradio 中已有的全部核心功能在 Electron 的迁移。

---

## 七、「为什么设置页面看到 Gradio 服务未启动？」

**简答**：设置页面的 StatusCheck 组件在检测 `127.0.0.1:7860` 端口是否有服务在监听。这个端口本来是给 Gradio 用的，但当前项目策略是**放弃 Gradio，全部用 Electron 原生实现**。

**建议的改动**：
1. 保留 StatusCheck 组件（它是一个通用的 TCP 端口连通性检测工具）
2. 在设置页面中把默认检测目标改成用户可自定义（输入 IP + 端口），或改为检测"Electron 主进程自身是否正常响应 ping"（即 `invoke('ping')`）
3. 把「Gradio 面板服务」的提示文案改为「外部服务连通性检测」，让用户知道这是可选的

或者更彻底的方案：**删除 StatusCheck，改为在设置页面直接显示 Electron 主进程状态（通过 `invoke('ping')` 成功与否判断）**。
