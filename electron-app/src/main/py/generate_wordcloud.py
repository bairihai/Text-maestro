#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
词云图生成脚本
接收参数: <freqJson> <fontPath> <maxFont> <minFont> <margin> <preferH>
使用 WordCloud 库生成词云图，返回 base64 编码的 PNG 图片
输出 JSON: {"success": true, "data": "base64字符串"}
"""

import sys
import json
import base64
from io import BytesIO

def generate_wordcloud(freq_json, font_path, max_font_size=100, min_font_size=20, margin=2, prefer_horizontal=0.9):
    from wordcloud import WordCloud

    # 解析频率表
    word_freq = json.loads(freq_json)

    # 生成词云
    wordcloud = WordCloud(
        font_path=font_path,
        width=800,
        height=400,
        background_color='white',
        max_font_size=int(max_font_size),
        min_font_size=int(min_font_size),
        margin=int(margin),
        prefer_horizontal=float(prefer_horizontal)
    )
    wordcloud.generate_from_frequencies(word_freq)

    # 保存到内存并转为 base64
    img_buffer = BytesIO()
    wordcloud.to_image().save(img_buffer, format='PNG')
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')

    return img_base64

if __name__ == '__main__':
    try:
        # 第一个参数是频率表 JSON 文件的路径（避免命令行长度限制）
        freq_file_path = sys.argv[1] if len(sys.argv) > 1 else ''
        font_path = sys.argv[2] if len(sys.argv) > 2 else ''
        max_font = sys.argv[3] if len(sys.argv) > 3 else '100'
        min_font = sys.argv[4] if len(sys.argv) > 4 else '20'
        margin = sys.argv[5] if len(sys.argv) > 5 else '2'
        prefer_h = sys.argv[6] if len(sys.argv) > 6 else '0.9'

        # 从文件读取频率表 JSON
        with open(freq_file_path, 'r', encoding='utf-8') as f:
            freq_json = f.read()

        result = generate_wordcloud(freq_json, font_path, max_font, min_font, margin, prefer_h)
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
