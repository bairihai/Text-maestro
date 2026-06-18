# Tasks
- [ ] Task 1: 删除重复文件 `gradio-app/utils_twitch.py`
  - 确认 `utils_twitch.py` 与 `utils_social_media.py` 内容完全相同
  - 删除 `utils_twitch.py`（app.py import 的是 `utils_social_media`，无需改动 import）
- [ ] Task 2: 移除 `gradio-app/app.py` 中错误接线的 "发言相邻的用户（频率）" tab
  - 删除 `with gr.Tab("发言相邻的用户（频率）"):` 整个代码块（约 app.py:284-287）
  - 保留其上方的 "发言时间段（频率）" tab 不动
- [ ] Task 3: 修复 `organize_files_by_week` 的 `week_start_type` 参数传递 bug
  - 在 `gradio-app/utils_folder.py` 的 `organize_files_by_week` 签名中新增 `week_start_type="skip_partial"` 参数
  - 将该参数传递给 `WeekCalculator(year, week_start_type)`
  - 在 `gradio-app/app.py` 的 "生成移动文件bat" 按钮 click 调用中，把 `week_type_input` 加入 inputs
  - 在函数内部把 UI 的中文单选值映射到 `first_week` / `zero_week` / `skip_partial`（"视为第1周"→first_week，"视为第0周"→zero_week，"跳过第一个不完整的周"→skip_partial）
- [ ] Task 4: 提交整理后的改动到 git
  - `git add` 相关文件（app.py、utils_folder.py、utils_social_media.py、README-project.md、删除的 utils_twitch.py）
  - 提交，commit message 概括"整理 gradio-app：删除重复文件、移除错误 tab、修复周计算参数 bug"
- [ ] Task 5: 本地运行 gradio app 验证启动无错误
  - 在 `gradio-app/` 目录下运行 `gradio app.py`（或 `python app.py`）
  - 确认无 ImportError、无运行时异常、webUI 正常启动并输出本地访问 URL
  - 验证后可停止进程

# Task Dependencies
- Task 4 依赖 Task 1、2、3 完成
- Task 5 依赖 Task 4 完成（基于已提交的代码运行验证）
