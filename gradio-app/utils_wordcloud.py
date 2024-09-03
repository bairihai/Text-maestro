# 词云这块儿做的人太多了 比如 github.com/AlionSSS/wordcloud-webui/
# 因为是比较笨重的功能，咱就简单做做，点到为止吧，还是以文本分析为主要卖点。

from wordcloud import WordCloud
import matplotlib.pyplot as plt
import base64
from io import BytesIO

def generate_wordcloud(word_freq, font_path):
    wordcloud = WordCloud(font_path=font_path, width=800, height=400, background_color='white')
    wordcloud.generate_from_frequencies(word_freq)
    
    # 将词云图保存到内存中
    img_buffer = BytesIO()
    wordcloud.to_image().save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    # 将图像转换为base64编码
    img_base64 = base64.b64encode(img_buffer.getvalue()).decode('utf-8')
    return img_base64