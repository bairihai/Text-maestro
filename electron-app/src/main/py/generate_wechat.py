#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
微信聊天记录图片生成脚本（v2）
接收参数: <messagesFile> <theme> <canvasWidth> <fontSize> <fontPath> <overridesJson> <showAvatar> <showTime> <title> <statusBarTime> <batteryLevel> <avatarMapJson> <meName> <format>
- messagesFile: 存放消息 JSON 数组的文件路径
- overridesJson: 主题颜色覆盖的 JSON 字符串（或空字符串表示不覆盖）
- avatarMapJson: {sender: avatar_path} 字典的 JSON 字符串（或空字符串）
使用 Pillow 绘制微信风格聊天截图（v2，对齐真实微信视觉），返回 base64 编码的图片
输出 JSON: {"success": true, "data": "base64字符串"}
"""

import sys
import os
import json
import base64
from io import BytesIO

# 将 gradio-app 目录加入 sys.path，复用 utils_wechat 模块
_gradio_app_path = os.environ.get('GRADIO_APP_PATH')
if not _gradio_app_path:
    _gradio_app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'gradio-app'))
sys.path.insert(0, _gradio_app_path)

import utils_wechat


def generate_wechat_image(
    messages,
    theme='ios_classic',
    canvas_width=420,
    font_size=15,
    font_path=None,
    overrides=None,
    show_avatar=True,
    show_time=True,
    title='微信',
    status_bar_time='14:32',
    battery_level=70,
    avatar_map=None,
    me_name='我',
    output_format='png',
):
    """生成微信聊天截图并返回 base64 字符串"""
    img = utils_wechat.generate_wechat_chat(
        messages=messages,
        theme=theme,
        canvas_width=int(canvas_width),
        font_size=int(font_size),
        font_path=font_path if font_path else None,
        overrides=overrides,
        show_avatar=bool(show_avatar),
        show_time=bool(show_time),
        title=title,
        status_bar_time=status_bar_time,
        battery_level=int(battery_level),
        avatar_map=avatar_map,
        me_name=me_name,
    )

    img_buffer = BytesIO()
    fmt = output_format.upper() if output_format != 'jpeg' else 'JPEG'
    img.save(img_buffer, format=fmt)
    return base64.b64encode(img_buffer.getvalue()).decode('utf-8')


if __name__ == '__main__':
    try:
        # 参数顺序: messagesFile theme canvasWidth fontSize fontPath overridesJson showAvatar showTime title statusBarTime batteryLevel avatarMapJson meName format
        messages_file_path = sys.argv[1] if len(sys.argv) > 1 else ''
        theme = sys.argv[2] if len(sys.argv) > 2 else 'ios_classic'
        canvas_width = sys.argv[3] if len(sys.argv) > 3 else '420'
        font_size = sys.argv[4] if len(sys.argv) > 4 else '15'
        font_path = sys.argv[5] if len(sys.argv) > 5 and sys.argv[5] != '' else None
        overrides_json = sys.argv[6] if len(sys.argv) > 6 and sys.argv[6] != '' else ''
        show_avatar = sys.argv[7] if len(sys.argv) > 7 else '1'
        show_time = sys.argv[8] if len(sys.argv) > 8 else '1'
        title = sys.argv[9] if len(sys.argv) > 9 else '微信'
        status_bar_time = sys.argv[10] if len(sys.argv) > 10 else '14:32'
        battery_level = sys.argv[11] if len(sys.argv) > 11 else '70'
        avatar_map_json = sys.argv[12] if len(sys.argv) > 12 and sys.argv[12] != '' else ''
        me_name = sys.argv[13] if len(sys.argv) > 13 else '我'
        output_format = sys.argv[14] if len(sys.argv) > 14 else 'png'

        if not messages_file_path or not os.path.exists(messages_file_path):
            raise ValueError(f'消息文件不存在: {messages_file_path}')

        with open(messages_file_path, 'r', encoding='utf-8') as f:
            messages_content = f.read()

        messages = utils_wechat.parse_messages_from_json(messages_content)

        overrides = None
        if overrides_json:
            try:
                overrides = json.loads(overrides_json)
            except json.JSONDecodeError:
                overrides = None

        avatar_map = None
        if avatar_map_json:
            try:
                avatar_map = json.loads(avatar_map_json)
            except json.JSONDecodeError:
                avatar_map = None

        result = generate_wechat_image(
            messages=messages,
            theme=theme,
            canvas_width=canvas_width,
            font_size=font_size,
            font_path=font_path,
            overrides=overrides,
            show_avatar=(show_avatar in ('1', 'true', 'True', '1.0')),
            show_time=(show_time in ('1', 'true', 'True', '1.0')),
            title=title,
            status_bar_time=status_bar_time,
            battery_level=battery_level,
            avatar_map=avatar_map,
            me_name=me_name,
            output_format=output_format,
        )
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
