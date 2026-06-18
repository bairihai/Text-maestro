# Gradio-app 整理与本地运行验证 Spec

## Why
项目工作区堆积了未提交的改动（Twitch 分析模块、README 格式清理等），其中存在重复文件、按钮错误接线、已知参数传递 bug 等问题。在继续推进新功能（如 Everything content 文本内搜索）之前，需要先整理现有代码并本地运行验证，确保基线可用。

## What Changes
- 删除重复文件 `gradio-app/utils_twitch.py`（与 `utils_social_media.py` 内容完全相同，app.py 实际 import 的是后者）
- 移除 `gradio-app/app.py` 中错误接线的 "发言相邻的用户（频率）" tab（按钮错误绑到 `filter_files` 并复用了文件筛选 tab 的控件，功能未实现）
- 修复 `gradio-app/utils_folder.py` 中 `organize_files_by_week` 未传递 `week_start_type` 参数的已知 bug（README 注释中标注的"选择视为第1周时，移动功能依旧计算为第0周"）
- 提交整理后的改动到 git
- 本地运行 `gradio app.py` 验证启动无错误

## Impact
- Affected code:
  - `gradio-app/utils_twitch.py`（删除）
  - `gradio-app/app.py`（移除错误 tab、补全 organize_files_by_week 的 inputs）
  - `gradio-app/utils_folder.py`（organize_files_by_week 接收并传递 week_start_type）
- 不影响 electron-app（已冻结）和其他 utils 模块

## ADDED Requirements
（无新增功能需求，本次为整理与修复）

## MODIFIED Requirements
### Requirement: 周回文件夹整理功能应尊重用户选择的周数计算方式
`organize_files_by_week` SHALL 接收 `week_start_type` 参数，并将其传递给 `WeekCalculator`。UI 的 `week_type_input` SHALL 作为 inputs 传入按钮 click 调用。中文单选项 SHALL 映射到 `WeekCalculator` 内部使用的键值（`first_week` / `zero_week` / `skip_partial`）。

#### Scenario: 用户选择"将1月1日至当周周天视为第1周"
- **WHEN** 用户在周数计算方式中选择"将1月1日至当周周天视为第1周"并生成移动 bat
- **THEN** 生成的目标文件夹名中的周号应按 first_week 规则计算，而非默认的 skip_partial

### Requirement: app.py 不应包含未实现且错误接线的 tab
"发言相邻的用户（频率）" tab SHALL 被移除，直到该功能真正实现前不再出现在界面中。

## REMOVED Requirements
### Requirement: 发言相邻的用户（频率）分析 tab
**Reason**: 该 tab 的按钮错误绑定到 `filter_files`（文件筛选函数）并复用了文件筛选 tab 的 `regex_input` / `filter_output` 控件，功能完全未实现，会误导用户。
**Migration**: 功能实现时再重新添加，并编写对应的 `utils` 分析函数。
