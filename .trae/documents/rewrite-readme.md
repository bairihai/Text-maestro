# 重写 README.md 计划

## Summary
重写项目根目录 [README.md](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/README.md)，采用**双栏式结构**（上半部分用户导向快速上手 + 下半部分开发者导向架构说明），核心是一张**按功能模块分组的三端功能矩阵**（Gradio / CLI / Electron + 预留 Obsidian 插件版列）。保持精简，技术笔记和个人化内容仍归属 README-project.md 不动。

## Current State Analysis

### 现有 README.md 的问题
1. **信息过时**：第 9 行写"py扩展+electron-vite+mysql数据库（后端）"，实际无 mysql；第 20-31 行的三端对比表把 Gradio 标为"优先更新"、Electron 标为"完成 gradio 之后引入"，但 Electron 实际已实装 17 个功能页
2. **功能列表与代码脱节**：第 110-157 行的"支持的功能"用 dev-0.6.1/dev-0.7 等旧版本号标注，且漏了 Twitch 分析、周回文件夹、时间戳转换等已实装功能
3. **部署命令有误**：第 56 行 `pip install requirements.txt` 应为 `pip install -r requirements.txt`；第 58 行 `gradio app.py` 应为 `python app.py` 或 `gradio app.py`（两者都行但应注明）
4. **Electron 段标注"停用"但实际有 17 个路由**：与代码现状严重不符
5. **无三端功能对比矩阵**：用户无法一眼看出哪个功能在哪个版本可用

### 三端实际功能盘点（基于代码阅读）

**Gradio-app**（[app.py](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/gradio-app/app.py) 640 行，主力）：
- 文本工具：Unicode双向转换、文本比较、字数统计、简繁互转、正则筛选
- 颜色/时间：RGB↔Hex、时间戳转换（3 tab）
- 文件操作：目录树+统计、文件读取（路径/上传）、多文档拼接（txt/csv）、CSV预览
- Markdown：大纲提取、两大纲合并、文章重组、多文档合并（**空壳，无 Button**）
- 词频词云：词频统计（标注施工中）、词云生成（频率表/文本直输/Mask 三模式）
- 社交分析：Discord 个人提取/发言频率/频道时频/偏好度、Twitch 弹幕分析
- 周回文件夹：整理文件到周回（创建文件夹 tab 被注释掉）
- Everything SDK 文件搜索（**Gradio 独有**）
- 自检、问候（测试用）

**CLI**（[main.py](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/cli/main.py) 1463 行）：
- 7 个主命令：text / color / timestamp / markdown / file / words / social
- 通过 `sys.path.insert` 复用 gradio-app 模块，零逻辑重写
- **CLI 独有**：交互式 REPL 模式（-i）、stdin 管道支持、彩色输出、Tab 补全
- 覆盖 Gradio 除 Everything SDK、自检、问候外的全部功能

**Electron-app**（[routesCommon.js](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/router/routesCommon.js) 17 个路由）：
- 17 个功能页全部实装（folder-tree/unicode/color/s2t/regex/text-diff/word-count/markdown-outline/csv-preview/file-reader/doc-merge/discord/twitch/word-frequency/wordcloud/timestamp/weekly-folder）
- 通过 IPC 调用 Python 脚本（word_frequency.py / generate_wordcloud.py / weekly_folder.py / discord_analysis.py / generate_tree.py）
- **Electron 独有**：偏好设置持久化、服务状态检查、Python 环境检测、目录树 Python 加速开关
- Navbar 仍有大量占位菜单项（游戏文件/论坛app/聊天app/文与图等未实装）

**Obsidian 插件版**：未开发，预留位置。

### 复用关系
- `gradio-app/` 是**单一事实源**：utils.py / utils_folder.py / utils_jieba.py / utils_wordcloud.py / utils_social_media.py
- CLI：`sys.path.insert` 直接 import
- Electron：IPC → exec Python 脚本 → 脚本内 `sys.path.insert` import
- Obsidian 插件（未来）：预计通过 Node 调用 CLI 或直接调 Python

## Proposed Changes

### 文件：`README.md`（整体重写）

新结构如下：

```
# Text-maestro 文本分析工具箱

## 综述
- 一句话定位 + 作者
- 四端总览表（Gradio / CLI / Electron / Obsidian插件）
  列：版本 | 状态 | 技术栈 | 适用场景

## 快速上手
### Gradio-app（主力）
  - 部署：pip install -r requirements.txt
  - 启动：python app.py 或 gradio app.py
  - 访问：浏览器打开输出的本地 URL
### CLI
  - 部署：同上（共用 gradio-app 依赖）
  - 启动：python cli/main.py --help
  - REPL：python cli/main.py -i
### Electron-app
  - 状态说明：已实装 17 功能页，但部分依赖 Python 环境
  - 部署：cd electron-app && npm install
  - 启动：npm run dev
### Obsidian 插件
  - （未开发，预留）

## 功能矩阵
按 8 个功能模块分组，每组一张表。
列：功能 | Gradio | CLI | Electron | Obsidian插件
状态标记：✅ 已实装 | ⚠️ 部分实装 | ❌ 未实装 | — 不适用

模块分组：
1. 文本工具（Unicode/比较/字数/简繁/正则筛选）
2. 颜色与时间戳（RGB↔Hex / 时间戳转换）
3. 文件操作（目录树/读取/拼接/CSV预览）
4. Markdown 工具（大纲提取/合并/重组）
5. 词频与词云（词频统计/词云三模式）
6. 社交媒体分析（Discord 4功能 / Twitch）
7. 周回文件夹管理
8. 文件搜索（Everything SDK）

## 架构与开发
### 三端复用关系
  - mermaid 图或文字说明：gradio-app 为单一事实源
  - CLI 复用方式：sys.path.insert
  - Electron 复用方式：IPC → Python 脚本
### 目录结构
  - 精简版目录树（只到二级）
### 开发指南
  - Gradio：改 app.py + utils*.py
  - CLI：改 cli/main.py，复用 gradio-app 模块
  - Electron：改 electron-app/，新增功能需补 IPC + Python 脚本
  - Obsidian 插件：（预留说明）

## 附录
### 测试用例
  - example/ 文件夹说明
### 参考清单
  - 保留原有的参考链接（DiVoMiner、Discordmate、vite+electron教程、彭道宽教程、AlionSSS/wordcloud-webui）
```

### 具体内容决策

1. **功能矩阵数据来源**：严格基于上述代码盘点，不虚构。每个 ✅/⚠️/❌ 都有代码依据
2. **四端总览表**：
   - Gradio：主力，活跃，Python+Gradio
   - CLI：活跃，Python argparse，命令行/自动化
   - Electron：活跃（已解冻），Electron+React+TS，桌面应用
   - Obsidian 插件：规划中，预留
3. **部署命令修正**：
   - `pip install -r requirements.txt`（非 `pip install requirements.txt`）
   - 注明 Gradio 和 CLI 共用 gradio-app/requirements.txt
   - Electron 注明需 Node.js 18+
4. **Electron 状态描述**：不再写"停用"，改为"已实装 17 功能页，部分功能需 Python 环境加速"
5. **保留的原有内容**：
   - 综述的作者署名（chatgpt/cursor/白日海）
   - 测试用例说明（example 文件夹）
   - 参考清单（5 个链接）
   - 赞助链接（简短保留）
6. **不保留的原有内容**：
   - 过时的 dev-0.6.1/dev-0.7 版本号标注
   - "原计划制作两个版本，一个electron一个qt"的历史叙述
   - mysql 数据库的错误描述
   - 旧的三端对比表（用新的功能矩阵替代）
7. **Obsidian 插件预留**：在总览表和功能矩阵中都加一列，状态全标"—（规划中）"

### 不修改的文件
- `README-project.md`：技术笔记和个人化内容原样保留
- `gradio-app/app.py`、`cli/main.py`、`electron-app/`：本次只改 README，不动代码

## Assumptions & Decisions

1. **假设**：用户说的"只有 readme-project 里面才有这些吧"是指技术笔记（node降级/tailwindcss/redux/TGI指数等）本就属于 README-project.md，新 README 无需处理它们
2. **决策**：新 README 精简为主，技术细节一律指向 README-project.md
3. **决策**：功能矩阵用 ✅/⚠️/❌/— 四种标记，不用文字描述状态（节省篇幅）
4. **决策**：Obsidian 插件版在总览表和功能矩阵中都占一列，状态全标"—（规划中）"，让用户未来填
5. **决策**：不写版本号（如 v1.0/dev-0.7），因为项目版本号混乱（CLI banner 写 v1.0.0，REPL 写 v1.1.0，README badge 写 1.0），等后续统一
6. **决策**：保留作者署名和赞助链接（用户未要求删除，且这是个人项目）

## Verification Steps

1. 阅读新 README.md，确认结构完整：综述 → 快速上手 → 功能矩阵 → 架构与开发 → 附录
2. 核对功能矩阵中每个 ✅ 标记与代码实际实装情况一致：
   - Gradio 列对照 [app.py](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/gradio-app/app.py) 的 gr.Tab / gr.Button 接线
   - CLI 列对照 [cli/main.py](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/cli/main.py) 的子命令注册
   - Electron 列对照 [routesCommon.js](file:///e:/100%20项目/130%20编程开发/132%20其他中期或长期项目/Text-maestro（文本分析工具箱）/electron-app/src/renderer/src/router/routesCommon.js) 的路由
3. 确认部署命令可执行：`pip install -r requirements.txt`、`python app.py`、`python cli/main.py --help`、`npm install && npm run dev`
4. 确认 Obsidian 插件列在总览表和功能矩阵中都已预留
5. 确认未引入任何代码修改，仅重写 README.md 一个文件
