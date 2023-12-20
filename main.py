import os
import jieba
import jieba.posseg as pseg
from wordcloud import WordCloud

# 定义文件夹路径
folder_path = r'C:\Users\阿白\Nutstore\1\Obsidian\新空间-日记'

# 获取符合条件的文件路径列表
file_paths = []
for root, dirs, files in os.walk(folder_path):
    for file in files:
        file_path = os.path.join(root, file)  # 定义file_path变量，用于扔掉那几个git库之类的文件夹，定义当前文件完整路径
        if '2023' in file_path and os.path.splitext(file)[1] == '.md':  # 文件路径包含"2023"且扩展名为.md
            file_paths.append(os.path.join(root, file))

# 将文件内容合并为一个字符串，并统计总字数词数
text = ''
total_chars = 0
total_words = 0
for file_path in file_paths:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
        total_chars += len(content)
        text += content

# 使用jieba分词
words = jieba.lcut(text)
total_words = len(words)

# 统计总字数、总词数
print(f"Total characters: {total_chars}")
print(f"Total words: {total_words}")

# 使用jieba分词并进行词性标注
words = pseg.lcut(text)

# 创建停用词列表
stopwords = ['评论','文章','篇文章','内容','2023', 'tag', 'zhihu', 'note', 'mycompany', 'soulbrowser','android','image', 'IMG', 'png', 'jpg', 'screenshot', 'Pasted', 'com']

# 统计词频
word_counts = {}
for word, flag in words:
    if len(word) > 1 and word not in stopwords and flag.startswith('n'):  # 过滤掉单个字的词、停用词和非名词
        word_counts[word] = word_counts.get(word, 0) + 1

# 生成词云
wordcloud = WordCloud(font_path=r'E:\100 项目\180 主题素材与灵感库\5 字体\猫啃什锦黑1.30_猫啃网\猫啃什锦黑1.30\MaokenAssortedSans.ttf', width=800, height=400, background_color='white')
wordcloud.generate_from_frequencies(word_counts)

# 显示词云
import matplotlib.pyplot as plt
plt.imshow(wordcloud, interpolation='bilinear')
plt.axis('off')
plt.show()