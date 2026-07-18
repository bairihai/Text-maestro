#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
二维码生成脚本
接收参数: <dataFile> <boxSize> <border> <errorCorrect> <fillColor> <backColor> <logoPath> <logoRatio> <outputWidth> <outputHeight> <format>
- dataFile: 存放要编码的文本/URL 的文件路径（避免命令行长度限制）
使用 qrcode + Pillow 生成二维码，返回 base64 编码的图片
输出 JSON: {"success": true, "data": "base64字符串"}
"""

import sys
import os
import json
import base64
from io import BytesIO

# 将 gradio-app 目录加入 sys.path，复用 utils_qrcode 模块
_gradio_app_path = os.environ.get('GRADIO_APP_PATH')
if not _gradio_app_path:
    _gradio_app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'gradio-app'))
sys.path.insert(0, _gradio_app_path)

import utils_qrcode


def generate_qrcode_image(
    data,
    box_size=10,
    border=4,
    error_correct='M',
    fill_color='black',
    back_color='white',
    logo_path=None,
    logo_size_ratio=0.2,
    output_width=None,
    output_height=None,
    output_format='png',
):
    """生成二维码图片并返回 base64 字符串"""
    output_size = None
    if output_width and output_height:
        output_size = (int(output_width), int(output_height))

    img = utils_qrcode.generate_qrcode(
        data=data,
        box_size=int(box_size),
        border=int(border),
        error_correct=error_correct,
        fill_color=fill_color,
        back_color=back_color,
        logo_path=logo_path if logo_path else None,
        logo_size_ratio=float(logo_size_ratio),
        output_size=output_size,
    )

    img_buffer = BytesIO()
    fmt = output_format.upper() if output_format != 'jpeg' else 'JPEG'
    img.save(img_buffer, format=fmt)
    return base64.b64encode(img_buffer.getvalue()).decode('utf-8')


if __name__ == '__main__':
    try:
        # 参数顺序: dataFile boxSize border errorCorrect fillColor backColor logoPath logoRatio outputWidth outputHeight format
        data_file_path = sys.argv[1] if len(sys.argv) > 1 else ''
        box_size = sys.argv[2] if len(sys.argv) > 2 else '10'
        border = sys.argv[3] if len(sys.argv) > 3 else '4'
        error_correct = sys.argv[4] if len(sys.argv) > 4 else 'M'
        fill_color = sys.argv[5] if len(sys.argv) > 5 else 'black'
        back_color = sys.argv[6] if len(sys.argv) > 6 else 'white'
        logo_path = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] != '' else None
        logo_ratio = sys.argv[8] if len(sys.argv) > 8 else '0.2'
        output_width = sys.argv[9] if len(sys.argv) > 9 and sys.argv[9] != '' else None
        output_height = sys.argv[10] if len(sys.argv) > 10 and sys.argv[10] != '' else None
        output_format = sys.argv[11] if len(sys.argv) > 11 else 'png'

        if not data_file_path or not os.path.exists(data_file_path):
            raise ValueError(f'数据文件不存在: {data_file_path}')

        with open(data_file_path, 'r', encoding='utf-8') as f:
            data = f.read()

        if not data:
            raise ValueError('二维码内容不能为空')

        result = generate_qrcode_image(
            data=data,
            box_size=box_size,
            border=border,
            error_correct=error_correct,
            fill_color=fill_color,
            back_color=back_color,
            logo_path=logo_path,
            logo_size_ratio=logo_ratio,
            output_width=output_width,
            output_height=output_height,
            output_format=output_format,
        )
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    except Exception as e:
        import traceback
        traceback.print_exc(file=sys.stderr)
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
