# 思来想去觉得还是统一引入，而非每个函数引入一次，没啥必要
import jieba

def count_chars_and_words(text):
    total_chars = len(text)
    total_words = len(jieba.lcut(text))
    return total_chars, total_words
