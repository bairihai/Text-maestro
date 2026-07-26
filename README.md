# Text-maestro 文本分析工具箱

[![宣传网页](https://img.shields.io/badge/🌐_宣传网页-docs/index.html-f5b942?style=flat-square)](./docs/index.html) [![技术笔记](https://img.shields.io/badge/📖_技术笔记-README--project.md-4ec9b0?style=flat-square)](./README-project.md) [![Gitee](https://img.shields.io/badge/Gitee-text--maestro-c678dd?style=flat-square)](https://gitee.com/bairihai/text-maestro)

自动清洗必要的数据，文本分析可视化。更适合 obsidian 文档、微信留痕、discord 聊天记录等的文本分析工具。

作者：chatgpt(poe)、cursor、白日海

> **[🌐 宣传网页](./docs/index.html)** — 单文件、零依赖的项目一页式介绍页（Hero + 四端总览 + 功能矩阵 + 快速上手），可直接用浏览器打开 `docs/index.html` 预览，也支持 Gitee/GitHub Pages 托管。本文档与宣传网页内容同源，详细部署/架构仍以本文为准；技术笔记与开发细节另见 [README-project.md](./README-project.md)。

## 四端总览

| 版本 | 状态 | 技术栈 | 适用场景 |
|------|------|--------|----------|
| **Gradio-app** | 主力，活跃 | Python + Gradio | 浏览器 WebUI，原型验证与核心功能源头 |
| **CLI** | 活跃 | Python argparse（复用 gradio-app 模块） | 命令行、自动化脚本、管道 |
| **Electron-app** | 活跃（已实装 17 功能页） | Electron + React + TypeScript | 桌面应用，部分功能需 Python 加速 |
| **Obsidian 插件** | 规划中 | — | Obsidian 内嵌调用（预留） |

> 三端共享 `gradio-app/` 下的 Python 功能模块（utils.py / utils_folder.py / utils_jieba.py / utils_wordcloud.py / utils_social_media.py），gradio-app 是单一事实源。

## 快速上手

### Gradio-app（主力）

```shell
cd gradio-app
pip install -r requirements.txt
python app.py
```

启动后按输出提示在浏览器打开本地 URL。`gradio app.py` 亦可，支持部分热重载。

> 部分 Everything SDK 功能需后台运行 [Everything](https://www.voidtools.com/) 搜索软件。

### CLI

部署同 Gradio-app（共用 `gradio-app/requirements.txt` 依赖）。

```shell
# 查看所有命令
python cli/main.py --help

# 单次执行
python cli/main.py text count "你好世界"
python cli/main.py file tree D:\projects --depth 3 --stats

# 管道输入
echo "你好" | python cli/main.py text count

# 交互式 REPL（支持 Tab 补全、历史记录）
python cli/main.py -i
```

### Electron-app

需 Node.js 18+。部分功能（词频统计、词云生成、周回文件夹、Discord 时频/偏好度、目录树加速）需本机安装 Python。

```shell
cd electron-app
npm install
npm run dev
```

启动后按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> 打开 DevTools 调试。

### Obsidian 插件

未开发，预留。

## 功能矩阵

状态标记：✅ 已实装 ｜ ⚠️ 部分实装 ｜ ❌ 未实装 ｜ — 不适用

### 1. 文本工具

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| Unicode ↔ 中文双向转换 | ✅ | ✅ | ✅ | — |
| 文本比较（逐字符 diff） | ✅ | ✅ | ✅ | — |
| 字数词数统计 | ✅ | ✅ | ✅ | — |
| 简繁互转 | ✅ | ✅ | ✅ | — |
| 正则筛选文件列表 | ✅ | ✅ | ✅ | — |

### 2. 颜色与时间戳

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| RGB ↔ Hex 颜色码转换 | ✅ | ✅ | ✅ | — |
| 时间戳 ↔ 日期双向转换 | ✅ | ✅ | ✅ | — |
| 获取当前时间戳 | ✅ | ✅ | ✅ | — |

### 3. 文件操作

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| 目录树生成 | ✅ | ✅ | ✅ | — |
| 目录大小 + 磁盘占用统计 | ✅ | ✅ | ✅ | — |
| 文件读取（路径） | ✅ | ✅ | ✅ | — |
| 文件读取（上传） | ✅ | — | ✅ | — |
| 多文档拼接（txt） | ✅ | ✅ | ✅ | — |
| 多文档拼接（csv） | ✅ | ✅ | ✅ | — |
| CSV 预览（UTF-8） | ✅ | ✅ | ✅ | — |

### 4. Markdown 工具

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| 提取文章大纲 | ✅ | ✅ | ✅ | — |
| 两大纲合并 | ✅ | ✅ | ✅ | — |
| 按新大纲重组文章 | ✅ | ✅ | ✅ | — |
| 多文档大纲统一 | ⚠️ | ❌ | ❌ | — |

### 5. 词频与词云

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| 词频统计（jieba 分词） | ⚠️ | ✅ | ✅ | — |
| 词云图 - 频率表模式 | ✅ | ✅ | ✅ | — |
| 词云图 - 文本直输模式 | ✅ | ✅ | ✅ | — |
| 词云图 - Mask 蒙版模式 | ✅ | ✅ | ✅ | — |

> Gradio 词频统计的表单格式选项（csv/xls/md）尚未开放，仅支持 txt。词云增强功能集成自 [AlionSSS/wordcloud-webui](https://github.com/AlionSSS/wordcloud-webui) (Apache-2.0)。

### 6. 社交媒体分析

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| Discord 个人发言提取 | ✅ | ✅ | ✅ | — |
| Discord 发言频率统计 | ✅ | ✅ | ✅ | — |
| Discord 频道时频统计 | ✅ | ✅ | ✅ | — |
| Discord 用户偏好度分析 | ✅ | ✅ | ✅ | — |
| Twitch 弹幕高阶分析 | ✅ | ✅ | ✅ | — |

### 7. 周回文件夹管理

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| 整理文件到周回（生成 BAT） | ✅ | ✅ | ✅ | — |
| 创建周回文件夹（生成 BAT） | ❌ | ❌ | ❌ | — |

### 8. 文件搜索

| 功能 | Gradio | CLI | Electron | Obsidian 插件 |
|------|:------:|:---:|:--------:|:------------:|
| Everything SDK 文件搜索 | ✅ | ❌ | ❌ | — |

> Gradio 独有功能，需后台运行 Everything 搜索软件。仅限 Windows。

### 各端独有功能

| 端 | 独有功能 |
|----|----------|
| **CLI** | 交互式 REPL 模式（`-i`）、stdin 管道输入、彩色输出、Tab 补全、命令历史 |
| **Electron** | 偏好设置持久化、服务状态检查、Python 环境检测、目录树 Python 加速开关、可拖拽侧边栏 |

## 架构与开发

### 三端复用关系

```
gradio-app/                    ← 单一事实源（Python 功能模块）
  ├── utils.py
  ├── utils_folder.py
  ├── utils_jieba.py
  ├── utils_wordcloud.py
  └── utils_social_media.py
        │
        ├─── CLI：sys.path.insert 直接 import
        │
        └─── Electron：IPC → exec Python 脚本 → 脚本内 sys.path.insert import
```

- **Gradio-app** 是功能源头，所有核心逻辑在此
- **CLI** 通过 `sys.path.insert` 直接复用，零逻辑重写
- **Electron** 通过 IPC 调用 `electron-app/src/main/py/` 下的 Python 脚本，脚本再 import gradio-app 模块
- **Obsidian 插件**（规划中）：预计通过 Node 调用 CLI 或直接调 Python

### 目录结构

```
Text-maestro/
├── gradio-app/          # 主力，Python 功能源头
│   ├── app.py           # Gradio WebUI 入口
│   ├── utils*.py        # 功能模块（被三端复用）
│   ├── requirements.txt
│   └── Everything-SDK/  # Everything SDK（Windows 文件搜索加速）
├── cli/                 # CLI 版本
│   └── main.py          # argparse + REPL 入口
├── electron-app/        # Electron 桌面版
│   ├── src/main/        # 主进程 + IPC + Python 脚本
│   ├── src/renderer/    # React + Arco + Tailwind 前端
│   └── package.json
├── docs/                # 宣传网页（单文件，零依赖）
│   └── index.html       # 项目一页式介绍页，README 内容的精简可视化版
├── example/             # 测试用例
├── README.md            # 本文档（与 docs/index.html 同源）
└── README-project.md    # 技术笔记与开发细节
```

### 开发指南

- **Gradio**：改 `gradio-app/app.py`（UI 接线）+ `utils*.py`（功能逻辑）
- **CLI**：改 `cli/main.py`，通过 `sys.path.insert` 复用 gradio-app 模块，无需重写逻辑
- **Electron**：改 `electron-app/`，新增功能需补三处——React 页面 + IPC handler + Python 脚本（放 `src/main/py/`）
- **Obsidian 插件**：预留

## 版本与发布

### 版本号策略

遵循 [SemVer](https://semver.org/lang/zh-CN/)（语义化版本）：`MAJOR.MINOR.PATCH`

- **MAJOR**：不兼容的 API 变更
- **MINOR**：向后兼容的新功能
- **PATCH**：向后兼容的缺陷修复

**三端版本号统一从 `v1.0.0` 起步**，初始阶段保持同步。版本号定义位置：

| 端 | 版本号定义位置 | 暴露方式 |
|---|---|---|
| Gradio-app | [gradio-app/app.py](./gradio-app/app.py) 顶部 `__version__` | WebUI 标题 |
| CLI | [cli-app/main.py](./cli-app/main.py) 顶部 `__version__` | `python cli/main.py --version` |
| Electron-app | [electron-app/package.json](./electron-app/package.json) `version` 字段 | 应用关于页 |

未来三端迭代节奏可能不一致（例如 CLI 升 `1.0.1` 时 Electron 仍为 `1.0.0`），届时各自独立递增。发布时给仓库打 git tag：`git tag v1.0.0`。

### 各端发布方式

| 端 | 发布方式 | 产物 | 用户前置环境 |
|---|---|---|---|
| Gradio-app | **仅源码分发**，不打包 | `git clone` 源码 | Python 3.10+ |
| CLI | **PyInstaller 单文件 exe** | `Text-maestro-CLI-<version>.exe` | 无（开箱即用） |
| Electron-app | **electron-builder NSIS 安装包**（本地分发） | `Text-maestro-Setup-<version>.exe` | 无（开箱即用） |

#### Gradio-app（不打包）

Gradio 作为功能源头与开发主力端，不进行产物打包，仅以源码形式分发：

```shell
git clone https://gitee.com/bairihai/text-maestro.git
cd text-maestro/gradio-app
pip install -r requirements.txt
python app.py
```

未来也不计划做 PyInstaller / Docker 打包，保持开发态原貌。

#### CLI（PyInstaller 单文件 exe）

打包脚本：[cli-app/build_exe.py](./cli-app/build_exe.py)

```shell
# 一次性准备环境
pip install pyinstaller
pip install -r gradio-app/requirements.txt

# 打包
cd cli-app
python build_exe.py            # 默认单文件 exe
python build_exe.py --clean     # 清理上次产物后重新打包
```

产物路径：`cli-app/dist/Text-maestro-CLI-1.0.0.exe`

打包要点：
- `--paths gradio-app` 让 PyInstaller 把 `gradio-app/utils*.py` 作为顶层模块收集进 exe
- `--add-data gradio-app/resources:resources` 把停用词等数据文件打入 exe 内部
- `utils_everything.py` 不被 CLI 引用，故 Everything-SDK 不打入（仅 Gradio 端使用）
- 排除 PyQt/PySide/tkinter 等不必要模块以减小体积

#### Electron-app（NSIS 安装包，本地分发）

打包配置：[electron-app/electron-builder.yml](./electron-app/electron-builder.yml)

```shell
cd electron-app
npm install
npm run build:win     # Windows NSIS 安装包
npm run build:mac     # macOS dmg
npm run build:linux   # Linux AppImage/snap/deb
```

产物路径：`electron-app/dist/Text-maestro-Setup-1.0.0.exe`

**当前阶段（v1.0.0）：仅本地分发，不接入自动更新**。`electron-builder.yml` 中 `publish: null`，主进程未调用 `autoUpdater.checkForUpdates()`。`electron-updater` 依赖已安装、配置入口已保留，便于后续切换。

### 后续升级路径

#### Electron 自动更新（未来）

切到 GitHub Releases 作为自动更新源时，需要：

1. 新增 github remote：`git remote add github git@github.com:<user>/text-maestro.git`
2. 修改 [electron-app/electron-builder.yml](./electron-app/electron-builder.yml) 中的 `publish` 段：

   ```yaml
   publish:
     provider: github
     owner: <github-username>
     repo: text-maestro
   ```

3. 修改 [electron-app/dev-app-update.yml](./electron-app/dev-app-update.yml) 同步配置
4. 在 [electron-app/src/main/index.ts](./electron-app/src/main/index.ts) 接入：

   ```typescript
   import { autoUpdater } from 'electron-updater'
   autoUpdater.checkForUpdatesAndNotify()
   ```

5. 发布时给仓库打 git tag，electron-builder 会自动上传 `latest.yml` 和安装包到 GitHub Releases

#### CLI 分发渠道扩展（未来）

如需更广的分发，可后续考虑：
- 发布到 PyPI（`pip install text-maestro-cli`）：新增 `pyproject.toml`，将 `cli-app/` + `gradio-app/utils*.py` 做成 Python 包
- 同时产 exe 和 PyPI 双轨分发

### 发布 Checklist

每次发版前确认：

- [ ] 三端版本号同步更新（或按计划独立递增）
- [ ] `cli-app/main.py` `__version__`
- [ ] `gradio-app/app.py` `__version__`
- [ ] `electron-app/package.json` `version`
- [ ] 测试三端核心功能正常
- [ ] 核对 `docs/index.html` 与 README 功能矩阵一致（新增/移除功能时同步）
- [ ] 打 git tag：`git tag v<x.y.z>` 并 `git push gitee-remote v<x.y.z>`
- [ ] 构建 CLI exe（`python cli-app/build_exe.py --clean`）
- [ ] 构建 Electron 安装包（`cd electron-app && npm run build:win`）
- [ ] 在 Gitee Release 上传产物（exe、安装包、Release Notes）

## 附录

### 宣传网页

项目附带一个一页式宣传网页 [docs/index.html](./docs/index.html)，与本 README 内容同源但形式互补：

- **README.md**：面向开发者的完整文档（部署、架构、版本管理、发布 checklist）
- **docs/index.html**：面向访客的精简可视化版（Hero + 四端总览卡片 + 8 大功能模块 + 快速上手命令）
- **README-project.md**：面向作者本人的技术笔记与开发细节

宣传网页设计原则：**单文件、零依赖、无构建步骤**。修改时直接编辑 `docs/index.html`，无需任何打包工具。内容若与 README 出现偏差，以 README 为准。

#### 本地预览

直接用浏览器打开 `docs/index.html` 即可。或：

```shell
# Python 内置 HTTP 服务
python -m http.server 8000 -d docs
# 浏览器访问 http://localhost:8000/
```

#### 托管到 Gitee Pages（可选）

1. Gitee 仓库 → 服务 → Gitee Pages → 部署目录填 `docs` → 启动
2. 访问 `https://<user>.gitee.io/text-maestro/` 即获得公网入口

### 测试用例

随仓库附带 `example/` 文件夹，含 Discord CSV、字体文件、Markdown 样本等，可用于测试各功能运行情况。

### 参考清单

1. [DiVoMiner 及其推荐的 UCINET](https://zhuanlan.zhihu.com/p/359610083)
2. [Discordmate - Discord Chat Exporter（Chrome 拓展）](https://chromewebstore.google.com/detail/discordmate-discord-chat/ofjlibelpafmdhigfgggickpejfomamk)
3. [vite + electron 教程](https://blog.csdn.net/qq_42365534/article/details/129887911)
4. [彭道宽 - electron 掘金教程 & github 仓库](https://github.com/PDKSophia/visResumeMook)
5. [AlionSSS/wordcloud-webui](https://github.com/AlionSSS/wordcloud-webui) (Apache-2.0) — 词云增强功能（Mask 模式、文本直输模式、普通模式增强）集成自此项目，原作者 Lion A

### 赞助

赞助云都官能团，成为"云山原子"，并为我们的 IP 事业提供建议。
