#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
周回文件夹整理 BAT 脚本生成
接收参数: <fileListFile> <timeFormat> <targetFolder> <year> <autoCreate>
  - fileListFile: 包含待整理文件列表（每行一个绝对路径）的临时文件路径
  - timeFormat:   文件名时间格式（如 MM.DD-HHmm a）
  - targetFolder: 目标文件夹路径
  - year:         年份
  - autoCreate:   是否自动创建不存在的周回文件夹（0 或 1）
通过 sys.path.insert 引入 gradio-app 模块，调用 utils_folder.organize_files_by_week
输出 JSON: {"success": true, "data": "BAT脚本内容"} 或 {"success": false, "error": "..."}
"""

import sys
import os
import json


def main():
    if len(sys.argv) < 6:
        print(json.dumps({"success": False, "error": "缺少参数: python weekly_folder.py <fileListFile> <timeFormat> <targetFolder> <year> <autoCreate>"}))
        sys.exit(1)

    fileListFile = sys.argv[1]
    timeFormat = sys.argv[2]
    targetFolder = sys.argv[3]
    year = sys.argv[4]
    autoCreate = sys.argv[5] == "1"

    # 引入 gradio-app 模块：优先使用环境变量指定的路径，其次尝试基于脚本位置的回退路径
    gradioAppPath = os.environ.get('GRADIO_APP_PATH')
    if not gradioAppPath or not os.path.isdir(gradioAppPath):
        # 回退路径：从脚本位置向上查找 gradio-app 目录
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
    from utils_folder import organize_files_by_week

    # 从临时文件读取文件列表
    with open(fileListFile, 'r', encoding='utf-8') as f:
        fileList = f.read()

    yearInt = int(year)
    batContent = organize_files_by_week(fileList, timeFormat, targetFolder, yearInt, autoCreate)
    print(json.dumps({"success": True, "data": batContent}, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
