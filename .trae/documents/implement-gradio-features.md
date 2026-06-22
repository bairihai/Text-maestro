# 实装 Gradio 原版剩余功能计划

## 概述
将 Gradio 原版中已有但 Electron 版尚未实现的功能全部移植。共 10 个新功能页面，分两批实现。

## 当前状态
- 已实装 5 个功能：目录树、Unicode 转换、RGB/Hex 转换、简繁转换、正则筛选
- 页面组件统一放在 `pages/features/`，路由在 `router/routesCommon.js`，Navbar 菜单在 `components/Navbar.tsx`
- 页面样式模式统一：`useTheme()` 取色 + header + content + configBlock + output codeBlock
- 已有 IPC：`read-file`（ipcMain.on + reply 模式）、`generate-tree`（ipcMain.handle 模式）、`check-gradio-status`

## 第一批：纯前端功能（8个页面，无需 Python）

### 1. 文本比较 `/tools/text-diff`
- **文件**: `pages/features/text-diff.tsx`
- **逻辑**: 逐字符 diff（JS 实现 LCS 算法），输出高亮差异（红色删除/绿色新增）
- **输入**: 两个 textarea；**输出**: 高亮差异展示

### 2. 字数词数统计 `/tools/word-count`
- **文件**: `pages/features/word-count.tsx`
- **逻辑**: 字符数 = `text.length`；词数 = 中文按字符计 + 英文按空格分词
- **输入**: textarea；**输出**: 总字符数 + 总词数

### 3. Markdown 大纲工具 `/tools/markdown-outline`
- **文件**: `pages/features/markdown-outline.tsx`
- **3个 Tab**: 提取大纲（正则 `^(#{1,6})\s+(.+)$`）、合并两大纲（解析 `##` 大章节 + `#` 小节去重合并）、按新大纲重组文章
- **纯前端正则实现**，移植 `utils.py` 的 `extract_markdown_outline`/`merge_two_docs`/`reorganize_article` 逻辑

### 4. CSV 预览 `/tools/csv-preview`
- **文件**: `pages/features/csv-preview.tsx`
- **逻辑**: 纯前端 CSV 解析（按逗号分割，处理引号包裹），渲染为表格
- **输入**: textarea 粘贴 CSV 文本 或 文件上传（FileReader）

### 5. 文本读取 `/tools/file-reader`
- **文件**: `pages/features/file-reader.tsx`
- **2个 Tab**: 路径读取（新增 IPC `read-file-by-path`）、文件上传（FileReader）
- **输出**: 文件内容 textarea

### 6. 多文档拼接 `/tools/doc-merge`
- **文件**: `pages/features/doc-merge.tsx`
- **2个 Tab**: 文本拼接（多个文件内容用 `\n\n` 连接）、CSV 拼接（合并表格）
- **输入方式**: 文件上传（多选）或路径列表 textarea
- **需要 IPC**: 新增 `read-multiple-files`（接收路径数组，返回内容数组）

### 7. Discord 聊天记录分析 `/tools/discord-analysis`
- **文件**: `pages/features/discord-analysis.tsx`
- **2个 Tab**: 个人发言提取（按 Username 筛选 CSV）、发言频率统计（按时间粒度分组计数）
- **纯前端 CSV 解析**，移植 `utils.py` 的 `filter_by_username`/`count_message_frequency` 逻辑

### 8. Twitch 弹幕分析 `/tools/twitch-analysis`
- **文件**: `pages/features/twitch-analysis.tsx`
- **2个 Tab**: JSON 文件上传分析、JSON 文本粘贴分析
- **逻辑**: 解析 `comments` 数组，计算 4 项指标（总弹幕数/独立人数/人均发言、Top3 高光时刻、Top5 核心粉丝、徽章画像）
- **纯前端 JS 实现**，移植 `utils_social_media.py` 逻辑

## 第二批：需要 Python 的功能（2个页面 + Python 脚本 + IPC）

### 9. 词频统计 `/tools/word-frequency`
- **文件**: `pages/features/word-frequency.tsx`
- **Python 脚本**: `main/py/word_frequency.py` — 接收 `<text> <stopwords> <customDict>`，用 jieba.posseg 分词，过滤单字/停用词/非名词，返回 JSON 词频 dict
- **IPC**: 新增 `word-frequency`（ipcMain.handle）
- **UI**: 需要 Python 加速标签（`needPython: true`）

### 10. 词云图生成 `/tools/wordcloud`
- **文件**: `pages/features/wordcloud.tsx`
- **Python 脚本**: `main/py/generate_wordcloud.py` — 接收 `<freqJson> <fontPath> <maxFont> <minFont> <margin> <preferH>`，用 WordCloud 生成图片，返回 base64 PNG
- **IPC**: 新增 `generate-wordcloud`（ipcMain.handle）
- **UI**: 需要 Python 加速标签，输入频率表 + 字体路径 + 参数滑块，输出图片预览

## 共同修改

### Navbar 更新 (`components/Navbar.tsx`)
在"通用工具"子菜单（key `3a`）中新增所有 10 个菜单项：
```
{ key: '3a_4', label: '文本比较', to: '/tools/text-diff' },
{ key: '3a_5', label: '字数词数统计', to: '/tools/word-count' },
{ key: '3a_6', label: 'Markdown 大纲工具', to: '/tools/markdown-outline' },
{ key: '3a_7', label: 'CSV 预览', to: '/tools/csv-preview' },
{ key: '3a_8', label: '文本读取', to: '/tools/file-reader' },
{ key: '3a_9', label: '多文档拼接', to: '/tools/doc-merge' },
{ key: '3a_10', label: 'Discord 聊天记录分析', to: '/tools/discord-analysis' },
{ key: '3a_11', label: 'Twitch 弹幕分析', to: '/tools/twitch-analysis' },
{ key: '3a_12', label: '词频统计', to: '/tools/word-frequency', needPython: true },
{ key: '3a_13', label: '词云图生成', to: '/tools/wordcloud', needPython: true },
```
同时修复：`needGradio` → `needPython`（第78行和第233行的属性名）

### 路由注册 (`router/routesCommon.js`)
新增 10 条路由，import 10 个组件

### 主进程 IPC (`main/index.ts`)
新增 4 个 IPC handler:
- `read-file-by-path`: 读取指定路径文件（utf-8）
- `read-multiple-files`: 批量读取文件
- `word-frequency`: 调用 `py/word_frequency.py`
- `generate-wordcloud`: 调用 `py/generate_wordcloud.py`

### Preload 类型声明 (`preload/index.d.ts`)
新增对应 IPC 方法的类型声明

## 假设与决策
1. 纯前端功能不依赖 Python，确保最大兼容性
2. 词频统计和词云图生成必须用 Python（jieba 中文分词无 JS 替代品）
3. 文件读取优先用文件上传（FileReader），路径读取作为备选需新增 IPC
4. 所有页面遵循现有样式模式（useTheme + header + content + codeBlock）
5. CSV 预览和 Discord 分析用纯前端 CSV 解析，不依赖 pandas
6. Twitch 分析用纯前端 JSON 解析，不依赖 pandas

## 验证步骤
1. `npx tsc --noEmit` 无 TypeScript 错误
2. `npm run dev` 启动应用
3. 逐个测试 10 个新功能页面
4. 测试词频统计和词云的 Python 加速路径
