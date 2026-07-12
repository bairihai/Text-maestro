# 词云工具模块
# 原始版本：简单实现，仅支持频率表输入
# 增强版本：集成自 https://github.com/AlionSSS/wordcloud-webui (Apache-2.0)
# 原作者: Lion A
# 原文件: src/wordcloud_webui/util/lib_wordcloud.py
# 集成内容: Mask 模式、普通模式增强（宽高/背景色/max_words）、文本直输

import os
from wordcloud import WordCloud, ImageColorGenerator
import numpy as np
from PIL import Image
from io import BytesIO

# 停用词库路径（集成自 AlionSSS/wordcloud-webui）
_STOPWORDS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'resources', 'stopwords_cn_en.txt')


def _load_stopwords():
    """加载停用词库（来源: AlionSSS/wordcloud-webui resources/stopwords_cn_en.txt）"""
    try:
        with open(_STOPWORDS_FILE, encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip()]
    except (OSError, IOError):
        return []


def _validate_font_path(font_path):
    """字体路径校验，空则返回 None"""
    if not font_path or '' == str(font_path).strip():
        return None
    return font_path


def _validate_bg_color(background_color):
    """背景色校验，空则返回 white"""
    if not background_color or '' == str(background_color).strip():
        return 'white'
    return background_color


def generate_wordcloud_normal(
    word_freq,
    font_path=None,
    background_color='white',
    margin=2,
    min_font_size=4,
    max_font_size=200,
    width=400,
    height=200,
    max_words=2000,
    random_state=42,
    prefer_horizontal=0.9,
):
    """
    普通模式：频率表 → 词云图（增强版，支持宽高/背景色）
    逻辑来源: AlionSSS/wordcloud-webui text2wordcount_normal()
    集成自 https://github.com/AlionSSS/wordcloud-webui (Apache-2.0)

    参数:
        word_freq: dict, 词语→频率
        font_path: str, 字体文件路径
        background_color: str, 背景色（颜色名或 hex，如 'white' 或 '#fee2e2'）
        margin: int, 词间距
        min_font_size: int, 最小字号
        max_font_size: int, 最大字号
        width: int, 图像宽度
        height: int, 图像高度
        max_words: int, 最大词数
        random_state: int, 随机种子（保证可复现）
        prefer_horizontal: float, 横向排列概率
    返回:
        PIL.Image 对象
    """
    font_path = _validate_font_path(font_path)
    background_color = _validate_bg_color(background_color)
    if not min_font_size or min_font_size < 1:
        min_font_size = 4
    if not max_font_size or max_font_size < 4:
        max_font_size = 200
    if not width or width < 1:
        width = 400
    if not height or height < 1:
        height = 200

    wordcloud = WordCloud(
        font_path=font_path,
        width=width,
        height=height,
        background_color=background_color,
        max_words=max_words,
        margin=margin,
        min_font_size=min_font_size,
        max_font_size=max_font_size,
        prefer_horizontal=prefer_horizontal,
        random_state=random_state,
    )
    wordcloud.generate_from_frequencies(word_freq)
    return wordcloud.to_image()


def generate_wordcloud_mask(
    word_freq,
    font_path=None,
    background_color='white',
    margin=2,
    min_font_size=4,
    max_font_size=200,
    mask_image=None,
    mask_color=None,
    contour_width=3,
    contour_color='steelblue',
    max_words=2000,
    random_state=42,
    prefer_horizontal=0.9,
):
    """
    Mask 模式：频率表 + 蒙版图像 → 词云图
    逻辑来源: AlionSSS/wordcloud-webui text2wordcount_mask()
    集成自 https://github.com/AlionSSS/wordcloud-webui (Apache-2.0)

    参数:
        word_freq: dict, 词语→频率
        font_path: str, 字体文件路径
        background_color: str, 背景色
        margin: int, 词间距
        min_font_size: int, 最小字号
        max_font_size: int, 最大字号
        mask_image: numpy.ndarray 或 PIL.Image, 蒙版图像（决定词云形状）
        mask_color: numpy.ndarray 或 PIL.Image, 颜色蒙版（决定词云颜色，不传则用 mask_image）
        contour_width: int, 轮廓线粗细
        contour_color: str, 轮廓线颜色
        max_words: int, 最大词数
        random_state: int, 随机种子
        prefer_horizontal: float, 横向排列概率
    返回:
        PIL.Image 对象
    """
    font_path = _validate_font_path(font_path)
    background_color = _validate_bg_color(background_color)
    if not min_font_size or min_font_size < 1:
        min_font_size = 4
    if not max_font_size or max_font_size < 4:
        max_font_size = 200
    if not contour_width or contour_width < 0:
        contour_width = 3
    if not contour_color or '' == str(contour_color).strip():
        contour_color = 'steelblue'

    # mask 图像转为 numpy array
    if hasattr(mask_image, 'size'):  # PIL.Image
        mask_array = np.array(mask_image)
    else:
        mask_array = mask_image

    # 颜色生成器：优先用 mask_color，否则用 mask_image
    # 逻辑来源: AlionSSS/wordcloud-webui ImageColorGenerator 用法
    if mask_color is not None:
        if hasattr(mask_color, 'size'):  # PIL.Image
            mask_color_array = np.array(mask_color)
        else:
            mask_color_array = mask_color
        image_colors = ImageColorGenerator(mask_color_array, True)
    else:
        image_colors = ImageColorGenerator(mask_array, True)

    wordcloud = WordCloud(
        font_path=font_path,
        mask=mask_array,
        background_color=background_color,
        color_func=image_colors,
        contour_width=contour_width,
        contour_color=contour_color,
        max_words=max_words,
        margin=margin,
        min_font_size=min_font_size,
        max_font_size=max_font_size,
        prefer_horizontal=prefer_horizontal,
        random_state=random_state,
    )
    wordcloud.generate_from_frequencies(word_freq)
    return wordcloud.to_image()


def text_to_wordcloud(
    text,
    font_path=None,
    background_color='white',
    margin=2,
    min_font_size=4,
    max_font_size=200,
    width=400,
    height=200,
    mask_image=None,
    mask_color=None,
    contour_width=3,
    contour_color='steelblue',
    stopwords=None,
    userdict=None,
    use_jieba=True,
    prefer_horizontal=0.9,
    max_words=2000,
    random_state=42,
):
    """
    文本直输模式：原始文本 → jieba 分词 → 词云图
    分词逻辑参考: AlionSSS/wordcloud-webui jieba_processing_txt()
    集成自 https://github.com/AlionSSS/wordcloud-webui (Apache-2.0)

    内部调用项目已有 utils_jieba.word_frequency 生成频率表，
    然后根据是否有 mask 调用 generate_wordcloud_normal 或 generate_wordcloud_mask。

    参数:
        text: str, 原始文本
        font_path: str, 字体文件路径
        background_color: str, 背景色
        margin: int, 词间距
        min_font_size/max_font_size: int, 字号范围
        width/height: int, 图像宽高（仅普通模式生效）
        mask_image: 蒙版图像（传入则使用 Mask 模式）
        mask_color: 颜色蒙版
        contour_width/contour_color: 轮廓线参数（仅 Mask 模式生效）
        stopwords: str, 停用词（逗号分隔），不传则用内置停用词库
        userdict: str, 自定义分词词典（逗号分隔）
        use_jieba: bool, 是否使用 jieba 分词（False 则按空格分词）
        prefer_horizontal: float, 横向排列概率
        max_words: int, 最大词数
        random_state: int, 随机种子
    返回:
        PIL.Image 对象
    """
    # 分词并生成频率表
    # 复用项目已有的 utils_jieba 模块（单一数据源）
    import utils_jieba

    # 停用词处理：优先用用户传入的，否则加载内置停用词库
    if stopwords is None or '' == str(stopwords).strip():
        builtin_stopwords = _load_stopwords()
        stopwords_str = ','.join(builtin_stopwords) if builtin_stopwords else '我,的,和,有,不,是'
    else:
        stopwords_str = stopwords

    # 自定义词典
    userdict_str = userdict if userdict else ''

    # 调用 utils_jieba.word_frequency 生成频率表 dict
    word_freq = utils_jieba.word_frequency(text, stopwords_str, userdict_str)

    if not word_freq:
        raise ValueError('分词后未得到任何词语，请检查输入文本或停用词设置')

    # 根据是否有 mask 选择模式
    if mask_image is not None:
        return generate_wordcloud_mask(
            word_freq,
            font_path=font_path,
            background_color=background_color,
            margin=margin,
            min_font_size=min_font_size,
            max_font_size=max_font_size,
            mask_image=mask_image,
            mask_color=mask_color,
            contour_width=contour_width,
            contour_color=contour_color,
            max_words=max_words,
            random_state=random_state,
            prefer_horizontal=prefer_horizontal,
        )
    else:
        return generate_wordcloud_normal(
            word_freq,
            font_path=font_path,
            background_color=background_color,
            margin=margin,
            min_font_size=min_font_size,
            max_font_size=max_font_size,
            width=width,
            height=height,
            max_words=max_words,
            random_state=random_state,
            prefer_horizontal=prefer_horizontal,
        )


def generate_wordcloud(word_freq, font_path, max_font_size=100, min_font_size=20, margin=2, prefer_horizontal=0.9):
    """
    [向后兼容] 原始词云生成函数
    保留此函数以兼容现有调用方（Gradio 旧 UI、Electron 旧脚本）
    内部改为调用 generate_wordcloud_normal
    """
    return generate_wordcloud_normal(
        word_freq,
        font_path=font_path,
        max_font_size=max_font_size,
        min_font_size=min_font_size,
        margin=margin,
        prefer_horizontal=prefer_horizontal,
    )
