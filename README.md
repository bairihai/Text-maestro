# Text-maestro 文本分析工具箱

自动清洗必要的数据，文本分析可视化。更适合 obsidian 文档、微信留痕、discord 聊天记录等的文本分析工具。

作者：chatgpt(poe)、cursor、白日海

> 技术笔记与开发细节见 [README-project.md](./README-project.md)

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
├── example/             # 测试用例
├── README.md            # 本文档
└── README-project.md    # 技术笔记与开发细节
```

### 开发指南

- **Gradio**：改 `gradio-app/app.py`（UI 接线）+ `utils*.py`（功能逻辑）
- **CLI**：改 `cli/main.py`，通过 `sys.path.insert` 复用 gradio-app 模块，无需重写逻辑
- **Electron**：改 `electron-app/`，新增功能需补三处——React 页面 + IPC handler + Python 脚本（放 `src/main/py/`）
- **Obsidian 插件**：预留

## 附录

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
