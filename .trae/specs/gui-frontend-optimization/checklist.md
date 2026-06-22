# Checklist

## CLI 输出工具层
- [x] ANSI 颜色常量定义（GREEN/RED/YELLOW/BLUE/BOLD/RESET）
- [x] 终端颜色支持自动检测（非 TTY 时禁用颜色）
- [x] print_success / print_error / print_warning / print_info / print_title 函数可用
- [x] print_table 函数可输出对齐表格（自动计算列宽）
- [x] Spinner 类可在耗时操作中显示旋转动画
- [x] read_input 函数支持从参数或 stdin 读取输入

## CLI 现有命令呈现优化
- [x] 所有子命令 help 信息包含 usage 示例（epilog）
- [x] color rgb2hex/hex2rgb 结果绿色高亮
- [x] timestamp 结果绿色高亮
- [x] text count 输出标题加粗 + 数字蓝色
- [x] text diff 保留红绿高亮
- [x] words freq 输出对齐表格（词语 | 次数）
- [x] file csv-preview 输出对齐表格
- [x] words cloud 显示 spinner 进度 + 成功提示
- [x] file tree 大目录时显示 spinner 进度

## CLI 错误处理
- [x] main() 包裹 try/except，异常时输出红色错误信息
- [x] 文件不存在时输出友好提示（非 traceback）
- [x] 参数缺失时输出友好提示
- [x] 错误时退出码为 1

## CLI stdin 支持
- [x] text count 支持管道输入
- [x] text s2t / t2s 支持管道输入
- [x] text unicode 支持管道输入
- [x] text filter 支持管道输入
- [x] words freq 支持管道输入

## CLI 版本信息
- [x] --version 参数显示版本号
- [x] --help 显示项目 banner

## CLI 新增子命令
- [x] file weekly 子命令可用，输出 BAT 脚本
- [x] social discord time-slot 子命令可用
- [x] social discord preference 子命令可用

## Electron 补充功能
- [x] 周回文件夹管理页面已创建且可用
- [x] 周回文件夹管理 IPC handler 已注册
- [x] 周回文件夹管理路由已注册
- [x] 周回文件夹管理 Navbar 菜单项已添加
- [x] Discord 分析页面新增「频道时频」Tab
- [x] Discord 分析页面新增「偏好度」Tab
- [x] discord-time-slot IPC handler 已注册
- [x] discord-preference IPC handler 已注册
- [x] Preload 中声明新增 API 类型

## 编译与运行
- [x] CLI `python cli/main.py --help` 正常显示
- [x] CLI 各功能输出彩色格式化
- [x] CLI 新子命令可用
- [x] Electron `npx tsc --noEmit` 无错误
- [x] Electron `npm run dev` 正常启动
- [x] Electron 新功能页面可访问
