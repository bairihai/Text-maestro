# CLI 前端呈现优化与三端逻辑同步 Spec

## Why
CLI 端当前呈现较为原始：输出无颜色/格式区分、无进度反馈、help 信息缺少示例、错误提示不友好。同时三端间存在功能缺失（Gradio 独有的周回文件夹管理、Discord 时频/偏好度统计未同步到 CLI/Electron）。需要优化 CLI 的命令行用户体验，并补充缺失功能。

## What Changes

### 一、CLI 前端呈现优化
- **彩色输出**：使用 ANSI 转义码为不同类型输出着色（成功绿色、错误红色、警告黄色、信息蓝色、标题加粗）
- **输出格式化**：词频统计、CSV 预览等表格类数据用对齐表格输出（非纯 JSON）
- **进度反馈**：词云生成、目录树生成等耗时操作显示 spinner 或进度提示
- **help 信息增强**：每个子命令添加 usage 示例（argparse epilog）
- **错误处理优化**：捕获异常后输出友好错误信息（红色），而非原始 traceback
- **stdin 支持**：所有文本类子命令支持从 stdin 读取输入（管道 `cat file.txt | python cli/main.py text count`）
- **版本号与 banner**：添加 `--version` 参数和启动 banner

### 二、补充缺失功能（三端同步）
- **CLI 新增**：
  - `file weekly` 子命令 → 复用 utils_folder.organize_files_by_week（周回文件夹管理）
  - `social discord time-slot` 子命令 → 复用 utils.calculate_time_slot_frequency（频道时频统计）
  - `social discord preference` 子命令 → 复用 utils.calculate_user_preference（偏好度统计）
- **Electron 新增**：
  - 周回文件夹管理页面 + IPC
  - Discord 分析页面补充时频/偏好度 Tab + IPC

### 三、手工适配方式探讨结论
当前三端开发方式分析：
- **CLI 端**：通过 `sys.path.insert` 直接复用 gradio-app Python 模块，零逻辑重写 ✅
- **Electron 端**：部分功能用 JS 重写（存在行为差异），部分通过 IPC 调用 Python ✅/⚠️
- **Gradio 端**：Python 原生实现，是功能源头 ✅

结论：CLI 的复用方式是正确的，应保持。Electron 端应逐步将存在行为差异的 JS 重写改为 IPC 调用 Python。本次 spec 不涉及 Electron 端 JS→IPC 迁移（留待后续 spec），仅补充缺失功能。

## Impact
- Affected code:
  - `cli/main.py`（主要修改对象：彩色输出、格式化、help 增强、错误处理、stdin 支持、新子命令）
  - `cli/__init__.py`（可能新增输出工具函数）
  - `electron-app/src/main/index.ts`（新增 IPC handler）
  - `electron-app/src/renderer/src/pages/features/weekly-folder.tsx`（新增）
  - `electron-app/src/renderer/src/pages/features/discord-analysis.tsx`（补充 Tab）
  - `electron-app/src/renderer/src/router/routesCommon.js` + `Navbar.tsx`（注册路由）

## ADDED Requirements

### Requirement: CLI 彩色输出
CLI SHALL 使用 ANSI 转义码为输出着色，区分成功/错误/警告/信息/标题。

#### Scenario: 成功输出
- **WHEN** 用户执行 `python cli/main.py color rgb2hex 255 128 0`
- **THEN** 输出 `#FF8000`，结果用绿色高亮

#### Scenario: 错误输出
- **WHEN** 用户执行 `python cli/main.py file read nonexistent.txt`
- **THEN** 输出红色错误信息 `错误：文件不存在: nonexistent.txt`，而非原始 traceback

### Requirement: CLI 表格格式化输出
CLI SHALL 将词频统计、CSV 预览等结构化数据以对齐表格形式输出。

#### Scenario: 词频统计表格输出
- **WHEN** 用户执行 `python cli/main.py words freq --file input.txt`
- **THEN** 输出对齐的两列表格（词语 | 次数），按次数降序排列

### Requirement: CLI stdin 支持
CLI 的文本类子命令 SHALL 支持从 stdin 读取输入。

#### Scenario: 管道输入
- **WHEN** 用户执行 `echo "你好世界" | python cli/main.py text count`
- **THEN** 从 stdin 读取文本并输出统计结果

### Requirement: CLI 进度反馈
CLI 的耗时操作（词云生成、大目录树生成）SHALL 显示进度提示。

#### Scenario: 词云生成进度
- **WHEN** 用户执行 `python cli/main.py words cloud --freq freq.json --font simhei.ttf`
- **THEN** 显示 `⠋ 正在生成词云...` spinner 动画，完成后显示 `✓ 词云图已保存到 wordcloud.png`

### Requirement: CLI help 信息增强
每个子命令的 help 信息 SHALL 包含 usage 示例。

#### Scenario: 查看子命令帮助
- **WHEN** 用户执行 `python cli/main.py text --help`
- **THEN** 显示参数说明 + 示例用法

### Requirement: 周回文件夹管理（CLI）
CLI SHALL 提供 `file weekly` 子命令，复用 utils_folder.organize_files_by_week。

#### Scenario: 生成周回整理 BAT
- **WHEN** 用户执行 `python cli/main.py file weekly --file-list files.txt --target D:\sorted --year 2025`
- **THEN** 输出 mkdir + move 的 BAT 脚本

### Requirement: Discord 时频统计（CLI）
CLI SHALL 提供 `social discord time-slot` 子命令，复用 utils.calculate_time_slot_frequency。

### Requirement: Discord 偏好度统计（CLI）
CLI SHALL 提供 `social discord preference` 子命令，复用 utils.calculate_user_preference。

### Requirement: 周回文件夹管理（Electron）
Electron 端 SHALL 新增周回文件夹管理页面，通过 IPC 调用 Python。

### Requirement: Discord 时频/偏好度（Electron）
Electron 端 Discord 分析页面 SHALL 补充频道时频统计和偏好度统计 Tab。

## MODIFIED Requirements

### Requirement: CLI 错误处理
CLI SHALL 捕获所有异常并输出友好的错误信息，而非原始 traceback。退出码为 1。
