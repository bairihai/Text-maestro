#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Discord 聊天记录分析脚本（频道时频统计 + 用户偏好度分析）
接收参数: <mode: time_slot|preference> <input1File> [input2File]
  - mode:       分析模式
    - time_slot:  频道时频统计，1 个输入（频道时频数据文本）
    - preference: 用户偏好度分析，2 个输入（用户时频数据 + 频道时频数据）
  - input1File: 第一个输入的临时文件路径
  - input2File: 第二个输入的临时文件路径（仅 preference 模式需要）
通过 sys.path.insert 引入 gradio-app 模块，调用 utils.calculate_time_slot_frequency / calculate_user_preference
输出 JSON: {"success": true, "data": "分析结果文本"} 或 {"success": false, "error": "..."}
"""

import sys
import os
import json


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "缺少参数: python discord_analysis.py <mode> <input1File> [input2File]"}))
        sys.exit(1)

    mode = sys.argv[1]
    input1File = sys.argv[2]
    input2File = sys.argv[3] if len(sys.argv) > 3 else None

    # 引入 gradio-app 模块：优先使用环境变量指定的路径，其次尝试基于脚本位置的回退路径
    gradioAppPath = os.environ.get('GRADIO_APP_PATH')
    if not gradioAppPath or not os.path.isdir(gradioAppPath):
        candidates = [
            os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'gradio-app')),
            os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'gradio-app')),
            os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'gradio-app')),
        ]
        for candidate in candidates:
            if os.path.isdir(candidate):
                gradioAppPath = candidate
                break

    if not gradioAppPath or not os.path.isdir(gradioAppPath):
        print(json.dumps({"success": False, "error": "未找到 gradio-app 目录"}))
        sys.exit(1)

    sys.path.insert(0, gradioAppPath)
    from utils import calculate_time_slot_frequency, calculate_user_preference

    # 从临时文件读取输入数据
    with open(input1File, 'r', encoding='utf-8') as f:
        input1 = f.read()

    if mode == "time_slot":
        # 频道时频统计：1 个输入
        result = calculate_time_slot_frequency(input1)
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    elif mode == "preference":
        # 用户偏好度分析：2 个输入
        if not input2File:
            print(json.dumps({"success": False, "error": "preference 模式需要第二个输入文件"}))
            sys.exit(1)
        with open(input2File, 'r', encoding='utf-8') as f:
            input2 = f.read()
        result = calculate_user_preference(input1, input2)
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    else:
        print(json.dumps({"success": False, "error": f"未知模式: {mode}，支持 time_slot 或 preference"}))
        sys.exit(1)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
