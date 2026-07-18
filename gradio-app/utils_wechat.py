# 微信聊天记录图片生成模块
# 依赖: Pillow
# 功能: JSON 消息序列 -> 微信风格聊天截图（PIL.Image）
#
# 消息格式:
#   [
#     {"sender": "我",   "text": "你好",            "time": "14:30", "type": "text"},
#     {"sender": "对方", "text": "你也好",          "time": "14:31", "type": "text"},
#     {"sender": "",     "text": "对方撤回一条消息", "type": "system"}
#   ]
#
# 风格预设:
#   - ios_classic:  iOS 经典绿（#95EC69 气泡靠右，#FFFFFF 气泡靠左）
#   - ios_dark:     iOS 暗黑模式（深色背景 + 浅色气泡）
#   - android:      Android 风格（更扁平的气泡）
#
# 用户可微调:
#   background_color, my_bubble_color, other_bubble_color, font_size, show_avatar, show_time

import io
import os
import json
from PIL import Image, ImageDraw, ImageFont

# ============================================================
# 风格预设
# ============================================================
THEME_PRESETS = {
    'ios_classic': {
        'background_color': '#EDEDED',
        'header_color': '#EDEDED',
        'header_text_color': '#111111',
        'my_bubble_color': '#95EC69',
        'other_bubble_color': '#FFFFFF',
        'my_text_color': '#000000',
        'other_text_color': '#000000',
        'system_text_color': '#999999',
        'time_text_color': '#999999',
        'avatar_bg_me': '#7BB6E8',
        'avatar_bg_other': '#FFBE5C',
        'avatar_text_color': '#FFFFFF',
        'header_height': 64,
        'bubble_radius': 8,
    },
    'ios_dark': {
        'background_color': '#1A1A1A',
        'header_color': '#2C2C2E',
        'header_text_color': '#FFFFFF',
        'my_bubble_color': '#2D5B3E',
        'other_bubble_color': '#3A3A3C',
        'my_text_color': '#FFFFFF',
        'other_text_color': '#FFFFFF',
        'system_text_color': '#888888',
        'time_text_color': '#888888',
        'avatar_bg_me': '#7BB6E8',
        'avatar_bg_other': '#FFBE5C',
        'avatar_text_color': '#FFFFFF',
        'header_height': 64,
        'bubble_radius': 8,
    },
    'android': {
        'background_color': '#F5F5F5',
        'header_color': '#E0E0E0',
        'header_text_color': '#212121',
        'my_bubble_color': '#B2DFDB',
        'other_bubble_color': '#FFFFFF',
        'my_text_color': '#212121',
        'other_text_color': '#212121',
        'system_text_color': '#9E9E9E',
        'time_text_color': '#9E9E9E',
        'avatar_bg_me': '#4DB6AC',
        'avatar_bg_other': '#FFA726',
        'avatar_text_color': '#FFFFFF',
        'header_height': 56,
        'bubble_radius': 4,
    },
}

# ============================================================
# 字体加载
# ============================================================
_FONT_CANDIDATES = {
    'win32': [
        'C:/Windows/Fonts/msyh.ttc',       # 微软雅黑
        'C:/Windows/Fonts/msyhl.ttc',
        'C:/Windows/Fonts/simhei.ttf',     # 黑体
        'C:/Windows/Fonts/simsun.ttc',     # 宋体
    ],
    'darwin': [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Medium.ttc',
        '/Library/Fonts/Arial Unicode.ttf',
    ],
    'other': [
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
        '/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    ],
}


def _find_system_font():
    """返回系统中第一个可用的中文字体路径，找不到返回 None。"""
    import sys as _sys
    key = 'win32' if _sys.platform == 'win32' else ('darwin' if _sys.platform == 'darwin' else 'other')
    for p in _FONT_CANDIDATES[key]:
        if os.path.exists(p):
            return p
    return None


def _load_font(font_path, font_size):
    """加载字体，失败时回退到 PIL 默认字体。"""
    path = font_path or _find_system_font()
    if path and os.path.exists(path):
        try:
            return ImageFont.truetype(path, font_size)
        except Exception:
            pass
    # PIL 兜底字体（不一定支持中文）
    try:
        return ImageFont.load_default(size=font_size)
    except Exception:
        return ImageFont.load_default()


# ============================================================
# 颜色解析
# ============================================================
def _hex_to_rgb(color):
    """'#RRGGBB' / 'RRGGBB' / 颜色名 -> (r, g, b)"""
    if color is None:
        return (0, 0, 0)
    if isinstance(color, (tuple, list)) and len(color) == 3:
        return tuple(int(c) for c in color)
    if isinstance(color, str):
        s = color.strip().lstrip('#')
        if len(s) == 6:
            try:
                return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16))
            except ValueError:
                pass
        if len(s) == 3:
            try:
                return (int(s[0] * 2, 16), int(s[1] * 2, 16), int(s[2] * 2, 16))
            except ValueError:
                pass
    return (0, 0, 0)


# ============================================================
# 文本测量与换行
# ============================================================
def _text_width(font, text):
    """返回文本像素宽度。Pillow 9.5.0+ 推荐 getlength，老版本用 getbbox 兜底。"""
    try:
        return int(font.getlength(text))
    except AttributeError:
        pass
    try:
        bbox = font.getbbox(text)
        return bbox[2] - bbox[0]
    except Exception:
        return len(text) * 12


def _wrap_text(font, text, max_width):
    """
    按像素宽度对文本进行换行，支持中英文混合。
    返回行列表。
    """
    if not text:
        return ['']
    lines = []
    current_line = ''

    # 先按显式换行符切
    for forced_line in text.split('\n'):
        current_line = ''
        for ch in forced_line:
            test = current_line + ch
            if _text_width(font, test) <= max_width:
                current_line = test
            else:
                if current_line:
                    lines.append(current_line)
                current_line = ch
        lines.append(current_line)

    return lines


# ============================================================
# 气泡高度计算
# ============================================================
def _measure_message(draw_ctx, msg, font, theme, canvas_width, padding):
    """
    测量单条消息的渲染高度。返回高度（像素）。
    用于第一遍布局计算总高度。
    """
    msg_type = msg.get('type', 'text')
    if msg_type == 'system':
        # 系统消息：单行居中，带上下间距
        return 36
    if msg_type == 'time':
        # 时间分隔符
        return 32

    avatar_size = 36
    text = msg.get('text', '')
    # 气泡最大宽度 = 画布宽度 - 头像 - 内边距 - 气泡边距
    max_bubble_width = canvas_width - avatar_size - padding * 4 - 20
    if max_bubble_width < 80:
        max_bubble_width = 80

    lines = _wrap_text(font, text, max_bubble_width - padding * 2)
    line_height = int(font.size * 1.45)
    text_height = line_height * len(lines)
    bubble_height = text_height + padding * 2
    return max(bubble_height, avatar_size) + 16  # 上下间距


# ============================================================
# 主生成函数
# ============================================================
def generate_wechat_chat(
    messages,
    theme='ios_classic',
    canvas_width=420,
    font_size=16,
    font_path=None,
    overrides=None,
    show_avatar=True,
    show_time=True,
    title='微信',
):
    """
    生成微信风格聊天截图。

    参数:
        messages: list, 消息列表（见模块文档）
        theme: str, 风格预设 ios_classic / ios_dark / android
        canvas_width: int, 画布宽度（默认 420）
        font_size: int, 字号（默认 16）
        font_path: str|None, 字体文件路径（None 自动找系统字体）
        overrides: dict|None, 覆盖主题颜色，键同 THEME_PRESETS 中的字段
        show_avatar: bool, 是否绘制头像
        show_time: bool, 是否绘制时间
        title: str, 顶部标题（默认 "微信"）

    返回:
        PIL.Image 对象（RGB 模式）
    """
    if not isinstance(messages, list):
        raise ValueError('messages 必须是列表')
    if not messages:
        raise ValueError('messages 不能为空')

    # 合并主题
    base_theme = dict(THEME_PRESETS.get(theme, THEME_PRESETS['ios_classic']))
    if overrides and isinstance(overrides, dict):
        for k, v in overrides.items():
            if v is not None and v != '':
                base_theme[k] = v

    font = _load_font(font_path, font_size)
    padding = 10
    avatar_size = 36

    # 第一遍：测量总高度
    dummy_img = Image.new('RGB', (10, 10))
    dummy_draw = ImageDraw.Draw(dummy_img)

    header_h = base_theme['header_height']
    total_height = header_h + 20  # 顶部留白

    for msg in messages:
        h = _measure_message(dummy_draw, msg, font, base_theme, canvas_width, padding)
        total_height += h

    total_height += 30  # 底部留白

    # 第二遍：绘制
    img = Image.new('RGB', (canvas_width, total_height), _hex_to_rgb(base_theme['background_color']))
    draw = ImageDraw.Draw(img)

    # ===== 顶部状态栏 + 标题栏（简化为单层）=====
    draw.rectangle([0, 0, canvas_width, header_h], fill=_hex_to_rgb(base_theme['header_color']))
    # 标题居中
    title_font = _load_font(font_path, font_size + 4)
    title_w = _text_width(title_font, title)
    title_x = (canvas_width - title_w) // 2
    title_y = (header_h - (font_size + 4)) // 2
    draw.text((title_x, title_y), title, fill=_hex_to_rgb(base_theme['header_text_color']), font=title_font)

    # ===== 消息绘制 =====
    y = header_h + 20
    for idx, msg in enumerate(messages):
        msg_type = msg.get('type', 'text')

        if msg_type == 'system':
            # 系统消息：居中灰色文字
            text = msg.get('text', '')
            sys_font = _load_font(font_path, font_size - 2)
            tw = _text_width(sys_font, text)
            tx = (canvas_width - tw) // 2
            ty = y + 12
            draw.text((tx, ty), text, fill=_hex_to_rgb(base_theme['system_text_color']), font=sys_font)
            y += 36
            continue

        if msg_type == 'time':
            text = msg.get('text', '') or msg.get('time', '')
            t_font = _load_font(font_path, font_size - 2)
            tw = _text_width(t_font, text)
            tx = (canvas_width - tw) // 2
            ty = y + 8
            draw.text((tx, ty), text, fill=_hex_to_rgb(base_theme['time_text_color']), font=t_font)
            y += 32
            continue

        # 普通文本消息
        sender = msg.get('sender', '')
        text = msg.get('text', '')
        time_str = msg.get('time', '')

        # 判断"我"还是"对方"：sender == "我" 视为右侧；其他都视为左侧
        is_me = (sender == '我' or sender.lower() == 'me')

        # 头像位置
        avatar_y = y
        if is_me:
            avatar_x = canvas_width - padding - avatar_size
            bubble_right = canvas_width - padding - avatar_size - 8
            bubble_left = None  # 待计算
            bubble_color = base_theme['my_bubble_color']
            text_color = base_theme['my_text_color']
        else:
            avatar_x = padding
            bubble_left = padding + avatar_size + 8
            bubble_right = None
            bubble_color = base_theme['other_bubble_color']
            text_color = base_theme['other_text_color']

        # 计算气泡文本换行
        if is_me:
            max_bubble_width = bubble_right - padding * 2 - 8
        else:
            max_bubble_width = canvas_width - bubble_left - padding * 2 - 8
        if max_bubble_width < 80:
            max_bubble_width = 80

        lines = _wrap_text(font, text, max_bubble_width - padding * 2)
        line_height = int(font_size * 1.45)
        text_height = line_height * len(lines)
        bubble_height = text_height + padding * 2

        # 计算气泡 left/right
        longest_line_w = max(_text_width(font, line) for line in lines) if lines else 0
        natural_bubble_width = longest_line_w + padding * 2

        if is_me:
            # 右侧气泡：bubble_right 已定，求 bubble_left
            b_right = bubble_right
            b_left = b_right - max(natural_bubble_width, 60)
            b_left = max(b_left, padding + avatar_size + 8)
            text_x = b_left + padding
        else:
            b_left = bubble_left
            b_right = b_left + max(natural_bubble_width, 60)
            b_right = min(b_right, canvas_width - padding - avatar_size - 8)
            text_x = b_left + padding

        b_top = avatar_y
        b_bottom = b_top + bubble_height

        # 绘制气泡（圆角矩形）
        radius = base_theme['bubble_radius']
        draw.rounded_rectangle(
            [b_left, b_top, b_right, b_bottom],
            radius=radius,
            fill=_hex_to_rgb(bubble_color),
        )

        # 绘制气泡文本
        text_y = b_top + padding
        for line in lines:
            draw.text((text_x, text_y), line, fill=_hex_to_rgb(text_color), font=font)
            text_y += line_height

        # 绘制头像（圆形色块 + 首字母）
        if show_avatar:
            avatar_letter = (sender[:1] if sender else '?').upper()
            avatar_color = base_theme['avatar_bg_me'] if is_me else base_theme['avatar_bg_other']
            draw.ellipse(
                [avatar_x, avatar_y, avatar_x + avatar_size, avatar_y + avatar_size],
                fill=_hex_to_rgb(avatar_color),
            )
            # 头像首字母
            av_font = _load_font(font_path, int(avatar_size * 0.5))
            lw = _text_width(av_font, avatar_letter)
            lh = int(avatar_size * 0.5)
            draw.text(
                (avatar_x + (avatar_size - lw) // 2, avatar_y + (avatar_size - lh) // 2 - 2),
                avatar_letter,
                fill=_hex_to_rgb(base_theme['avatar_text_color']),
                font=av_font,
            )

        # 绘制时间（可选）
        if show_time and time_str:
            t_font = _load_font(font_path, font_size - 4)
            tw = _text_width(t_font, time_str)
            if is_me:
                tx = b_right - tw
            else:
                tx = b_left
            ty = b_bottom + 2
            draw.text((tx, ty), time_str, fill=_hex_to_rgb(base_theme['time_text_color']), font=t_font)
            y = b_bottom + 18
        else:
            y = b_bottom + 16

    return img


def image_to_bytes(img, fmt='png'):
    """PIL.Image -> BytesIO"""
    buf = io.BytesIO()
    fmt_upper = fmt.upper() if fmt.lower() != 'jpeg' else 'JPEG'
    img.save(buf, format=fmt_upper)
    buf.seek(0)
    return buf


def parse_messages_from_json(json_str):
    """
    解析 JSON 字符串为消息列表。
    兼容:
      - JSON 数组 [{...}, {...}]
      - JSON 对象 {messages: [...]}
    """
    if not json_str or not json_str.strip():
        raise ValueError('JSON 内容为空')
    data = json.loads(json_str)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and 'messages' in data:
        return data['messages']
    raise ValueError('JSON 格式不正确，应为数组或包含 messages 字段的对象')


# 默认示例消息
EXAMPLE_MESSAGES = [
    {'sender': '我', 'text': '你好，在吗？', 'time': '14:30', 'type': 'text'},
    {'sender': '对方', 'text': '在的，怎么了？', 'time': '14:30', 'type': 'text'},
    {'sender': '我', 'text': '想问下明天的会议几点开始？', 'time': '14:31', 'type': 'text'},
    {'sender': '对方', 'text': '上午十点，会议室三楼。', 'time': '14:32', 'type': 'text'},
    {'sender': '我', 'text': '收到，谢谢！', 'time': '14:32', 'type': 'text'},
]
