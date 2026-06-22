#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
词频统计脚本
接收参数: <text> <stopwords> <customDict>
使用 jieba.posseg 进行分词和词性标注，过滤单字/停用词/非名词
输出 JSON: {"success": true, "data": {"词语": 次数, ...}}
"""

import sys
import json

def word_frequency(text, stopwords, custom_dict):
    import jieba
    import jieba.posseg as pseg

    # 加载自定义词典
    for word in custom_dict.split(','):
        word = word.strip()
        if word:
            jieba.add_word(word)

    # 停用词集合
    stop_set = set(w.strip() for w in stopwords.split(',') if w.strip())

    # 分词并进行词性标注
    words = pseg.lcut(text)

    # 统计词频：过滤单字、停用词、非名词
    word_counts = {}
    for word, flag in words:
        if len(word) > 1 and word not in stop_set and flag.startswith('n'):
            word_counts[word] = word_counts.get(word, 0) + 1

    # 按词频降序排序
    sorted_counts = dict(sorted(word_counts.items(), key=lambda x: x[1], reverse=True))
    return sorted_counts

if __name__ == '__main__':
    try:
        text = sys.argv[1] if len(sys.argv) > 1 else ''
        stopwords = sys.argv[2] if len(sys.argv) > 2 else ''
        custom_dict = sys.argv[3] if len(sys.argv) > 3 else ''

        result = word_frequency(text, stopwords, custom_dict)
        print(json.dumps({"success": True, "data": result}, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
