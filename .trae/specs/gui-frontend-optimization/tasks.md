# Tasks

## 第一阶段：CLI 输出工具层
- [x] Task 1: 在 cli/main.py 中新增输出工具函数（或新建 cli/output.py）
  - [x] SubTask 1.1: ANSI 颜色常量（GREEN/RED/YELLOW/BLUE/BOLD/RESET）+ 自动检测终端是否支持颜色
  - [x] SubTask 1.2: print_success(msg) / print_error(msg) / print_warning(msg) / print_info(msg) / print_title(msg)
  - [x] SubTask 1.3: print_table(headers, rows) — 对齐表格输出（计算列宽，自动 padding）
  - [x] SubTask 1.4: Spinner 类 — 在耗时操作中显示旋转动画（⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏）
  - [x] SubTask 1.5: read_input() — 优先从参数读取，无参数时从 stdin 读取（支持管道）

## 第二阶段：CLI 现有命令呈现优化
- [x] Task 2: 为所有子命令添加 epilog 示例
  - [x] SubTask 2.1: text 子命令组 epilog
  - [x] SubTask 2.2: color / timestamp / markdown / file / words / social 子命令组 epilog
- [x] Task 3: 改造现有命令的输出格式
  - [x] SubTask 3.1: color rgb2hex/hex2rgb → 结果绿色高亮
  - [x] SubTask 3.2: timestamp → 结果绿色高亮
  - [x] SubTask 3.3: text count → 标题加粗 + 数字蓝色
  - [x] SubTask 3.4: text diff → 保留红绿高亮（已有），优化输出格式
  - [x] SubTask 3.5: words freq → 表格输出（词语 | 次数）
  - [x] SubTask 3.6: file csv-preview → 表格输出
  - [x] SubTask 3.7: words cloud → spinner 进度 + 成功提示
  - [x] SubTask 3.8: file tree → spinner 进度（大目录时）
- [x] Task 4: 改造错误处理
  - [x] SubTask 4.1: main() 包裹 try/except，捕获异常后 print_error + sys.exit(1)
  - [x] SubTask 4.2: 文件不存在、参数缺失等常见错误友好提示
- [x] Task 5: 添加 stdin 支持
  - [x] SubTask 5.1: text count / text s2t / text t2s / text unicode / text filter 支持从 stdin 读取
  - [x] SubTask 5.2: words freq 支持从 stdin 读取
- [x] Task 6: 添加 --version 参数和启动 banner

## 第三阶段：CLI 新增子命令
- [x] Task 7: 新增 `file weekly` 子命令
  - [x] SubTask 7.1: 参数：--file-list（文件列表路径）、--target（目标文件夹）、--year（年份，默认当前年）、--time-format（时间格式，默认 MM.DD-HHmm a）、--auto-create（自动创建文件夹）
  - [x] SubTask 7.2: 调用 utils_folder.organize_files_by_week
  - [x] SubTask 7.3: 输出 BAT 脚本（可 -o 保存到文件）
- [x] Task 8: 新增 `social discord time-slot` 子命令
  - [x] SubTask 8.1: 参数：--file（频道时频数据文件）、--input（直接输入文本）
  - [x] SubTask 8.2: 调用 utils.calculate_time_slot_frequency
- [x] Task 9: 新增 `social discord preference` 子命令
  - [x] SubTask 9.1: 参数：--user-file（用户时频数据文件）、--channel-file（频道时频数据文件）
  - [x] SubTask 9.2: 调用 utils.calculate_user_preference

## 第四阶段：Electron 补充缺失功能
- [x] Task 10: 新增周回文件夹管理页面
  - [x] SubTask 10.1: 主进程新增 `weekly-folder` IPC handler → 调用 Python utils_folder.organize_files_by_week
  - [x] SubTask 10.2: 创建 `pages/features/weekly-folder.tsx` 页面
  - [x] SubTask 10.3: 路由注册 + Navbar 菜单项
- [x] Task 11: Discord 分析页面补充 Tab
  - [x] SubTask 11.1: 主进程新增 `discord-time-slot` IPC handler → 调用 Python utils.calculate_time_slot_frequency
  - [x] SubTask 11.2: 主进程新增 `discord-preference` IPC handler → 调用 Python utils.calculate_user_preference
  - [x] SubTask 11.3: discord-analysis.tsx 新增「频道时频」和「偏好度」Tab
  - [x] SubTask 11.4: Preload 声明新增 API

## 第五阶段：验证
- [x] Task 12: CLI 验证
  - [x] SubTask 12.1: `python cli/main.py --help` 显示彩色 banner + 示例
  - [x] SubTask 12.2: `python cli/main.py text count "你好世界"` 输出彩色格式化结果
  - [x] SubTask 12.3: `echo "你好" | python cli/main.py text count` stdin 正常
  - [x] SubTask 12.4: `python cli/main.py file read nonexistent.txt` 输出红色错误信息
  - [x] SubTask 12.5: `python cli/main.py words freq --file input.txt` 输出表格
  - [x] SubTask 12.6: `python cli/main.py file weekly --help` 显示帮助
  - [x] SubTask 12.7: `python cli/main.py social discord time-slot --help` 显示帮助
- [x] Task 13: Electron 验证
  - [x] SubTask 13.1: `npx tsc --noEmit` 无错误
  - [x] SubTask 13.2: `npm run dev` 启动应用
  - [x] SubTask 13.3: 周回文件夹管理页面可用
  - [x] SubTask 13.4: Discord 分析新 Tab 可用

# Task Dependencies
- Task 2-6 依赖 Task 1（输出工具层）
- Task 7-9 可与 Task 2-6 并行（新命令直接使用新工具函数）
- Task 10-11 可与 CLI 优化并行
- Task 12 依赖 Task 1-9
- Task 13 依赖 Task 10-11
