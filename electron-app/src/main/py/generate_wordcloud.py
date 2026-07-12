#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
词云图生成脚本（增强版）
接收参数: <freqJsonOrTextFile> <fontPath> <maxFont> <minFont> <margin> <preferH> [mode] [width] [height] [bgColor] [maskPath] [maskColorPath] [contourWidth] [contourColor] [stopwords] [userdict] [format]
使用 wordcloud 库生成词云图，返回 base64 编码的图片
输出 JSON: {"success": true, "data": "base64字符串"}

增强功能集成自 https://github.com/AlionSSS/wordcloud-webui (Apache-2.0)
原作者: Lion A
集成内容: Mask 模式、普通模式增强、文本直输模式
"""

import sys
import os
import json
import base64
from io import BytesIO

# 将 gradio-app 目录加入 sys.path，复用 utils_wordcloud 模块
# 与 weekly_folder.py 模式一致
_gradio_app_path = os.environ.get('GRADIO_APP_PATH')
if not _gradio_app_path:
    _gradio_app_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', 'gradio-app'))
sys.path.insert(0, _gradio_app_path)

import utils_wordcloud
# utils_wordcloud 中的新函数集成自 AlionSSS/wordcloud-webui (Apache-2.0)


def generate_wordcloud_enhanced(
    freq_json=None,
    text=None,
    font_path='',
    max_font_size=100,
    min_font_size=20,
    margin=2,
    prefer_horizontal=0.9,
    mode='freq',
    width=400,
    height=200,
    bg_color='white',
    mask_path=None,
    mask_color_path=None,
    contour_width=3,
    contour_color='steelblue',
    stopwords=None,
    userdict=None,
    output_format='png',
):
    """
    增强版词云生成（集成自 AlionSSS/wordcloud-webui Apache-2.0）
    支持三种模式: freq（频率表）/ text（文本直输）/ mask（Mask 模式）
    """
    from PIL import Image as PILImage

    mask_img = None
    mask_color_img = None

    # 加载 mask 图像
    if mask_path:
        mask_img = PILImage.open(mask_path)
    if mask_color_path:
        mask_color_img = PILImage.open(mask_color_path)

    if mode == 'text' or text is not None:
        # 文本直输模式：原始文本 → jieba 分词 → 词云
        img = utils_wordcloud.text_to_wordcloud(
            text,
            font_path=font_path,
            background_color=bg_color,
            margin=int(margin),
            min_font_size=int(min_font_size),
            max_font_size=int(max_font_size),
            width=int(width),
            height=int(height),
            mask_image=mask_img,
            mask_color=mask_color_img,
            contour_width=int(contour_width),
            contour_color=contour_color,
            stopwords=stopwords,
            userdict=userdict,
            prefer_horizontal=float(prefer_horizontal),
        )
    elif mode == 'mask' or mask_img is not None:
        # Mask 模式
        word_freq = json.loads(freq_json)
        img = utils_wordcloud.generate_wordcloud_mask(
            word_freq,
            font_path=font_path,
            background_color=bg_color,
            margin=int(margin),
            min_font_size=int(min_font_size),
            max_font_size=int(max_font_size),
            mask_image=mask_img,
            mask_color=mask_color_img,
            contour_width=int(contour_width),
            contour_color=contour_color,
            prefer_horizontal=float(prefer_horizontal),
        )
    else:
        # 普通模式（增强版）
        word_freq = json.loads(freq_json)
        img = utils_wordcloud.generate_wordcloud_normal(
            word_freq,
            font_path=font_path,
            background_color=bg_color,
            margin=int(margin),
            min_font_size=int(min_font_size),
            max_font_size=int(max_font_size),
            width=int(width),
            height=int(height),
            prefer_horizontal=float(prefer_horizontal),
        )

    # 保存到内存并转为 base64
    img_buffer = BytesIO()
    fmt = output_format.upper() if output_format != 'jpeg' else 'JPEG'
    img.save(img_buffer, format=fmt)
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')

    return img_base64


if __name__ == '__main__':
    try:
        # 参数顺序: freqFile/textFile fontPath maxFont minFont margin preferH mode width height bgColor maskPath maskColorPath contourWidth contourColor stopwords userdict format
        # 第一个参数是频率表 JSON 文件或文本文件的路径
        input_file_path = sys.argv[1] if len(sys.argv) > 1 else ''
        font_path = sys.argv[2] if len(sys.argv) > 2 else ''
        max_font = sys.argv[3] if len(sys.argv) > 3 else '100'
        min_font = sys.argv[4] if len(sys.argv) > 4 else '20'
        margin_val = sys.argv[5] if len(sys.argv) > 5 else '2'
        prefer_h = sys.argv[6] if len(sys.argv) > 6 else '0.9'
        mode = sys.argv[7] if len(sys.argv) > 7 else 'freq'
        width_val = sys.argv[8] if len(sys.argv) > 8 else '400'
        height_val = sys.argv[9] if len(sys.argv) > 9 else '200'
        bg_color = sys.argv[10] if len(sys.argv) > 10 else 'white'
        mask_path = sys.argv[11] if len(sys.argv) > 11 and sys.argv[11] != '' else None
        mask_color_path = sys.argv[12] if len(sys.argv) > 12 and sys.argv[12] != '' else None
        contour_width_val = sys.argv[13] if len(sys.argv) > 13 else '3'
        contour_color = sys.argv[14] if len(sys.argv) > 14 else 'steelblue'
        stopwords = sys.argv[15] if len(sys.argv) > 15 and sys.argv[15] != '' else None
        userdict = sys.argv[16] if len(sys.argv) > 16 and sys.argv[16] != '' else None
        output_format = sys.argv[17] if len(sys.argv) > 17 else 'png'

        # 从文件读取输入
        with open(input_file_path, 'r', encoding='utf-8') as f:
            input_content = f.read()

        # 根据模式决定输入内容
        freq_json = None
        text_content = None
        if mode == 'text':
            text_content = input_content
        else:
            freq_json = input_content

        result = generate_wordcloud_enhanced(
            freq_json=freq_json,
            text=text_content,
            font_path=font_path,
            max_font_size=max_font,
            min_font_size=min_font,
            margin=margin_val,
            prefer_horizontal=prefer_h,
            mode=mode,
            width=width_val,
            height=height_val,
            bg_color=bg_color,
            mask_path=mask_path,
            mask_color_path=mask_color_path,
            contour_width=contour_width_val,
            contour_color=contour_color,
            stopwords=stopwords,
            userdict=userdict,
            output_format=output_format,
        )
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
