# 思来想去觉得还是统一引入，而非每个函数引入一次，没啥必要
import jieba
import jieba.posseg as pseg

def count_chars_and_words(text):
    total_chars = len(text)
    total_words = len(jieba.lcut(text))
    return total_chars, total_words

def word_frequency(text, stopwords, custom_dict):
    # 加载自定义词典
    for word in custom_dict.split(','):
        jieba.add_word(word.strip())
    
    # 使用jieba分词并进行词性标注
    words = pseg.lcut(text)
    
    # 统计词频
    word_counts = {}
    for word, flag in words:
        if len(word) > 1 and word not in stopwords and flag.startswith('n'):  # 过滤掉单个字的词、停用词和非名词
            word_counts[word] = word_counts.get(word, 0) + 1
    
    # 返回词频统计结果
    return word_counts
