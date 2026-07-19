# 微信聊天记录图片生成模块（v2 重写版）
# 依赖: Pillow
# 参考开源项目: https://github.com/bairihai/wechat-dialog-generator
#
# 核心改进（相对 v1）:
#   1. 默认头像使用真实微信默认头像（assets/wechat_default_avatar.jpg）
#   2. 多消息类型: text / image / redpacket / transfer / voice / time / system
#   3. 顶部状态栏（信号/WiFi/电池/时间）+ 标题栏（返回箭头+联系人名称+更多按钮）
#   4. 时间显示规则: 仿真实微信，间隔 >5min 才显示时间节点
#   5. Markdown 文本导入: 支持 **用户名**：内容 格式
#   6. 头像圆角矩形（不再是圆形色块）
#   7. 系统消息灰色圆角小卡片
#
# 消息格式（JSON）:
#   [
#     {"sender": "张三", "text": "你好", "time": "14:30", "type": "text"},
#     {"sender": "李四", "text": "[图片]", "type": "image", "image_path": "/path/to/img.jpg"},
#     {"sender": "张三", "text": "恭喜发财", "type": "redpacket"},
#     {"sender": "李四", "amount": "200", "text": "饭钱", "type": "transfer"},
#     {"sender": "张三", "duration": 5, "type": "voice"},
#     {"sender": "", "text": "3月1日 14:32", "type": "time"},
#     {"sender": "", "text": "对方撤回了一条消息", "type": "system"}
#   ]
#
# Markdown 文本格式（兼容开源项目）:
#   **【3月1日 14:32】**            -> 时间节点
#   **张三**：你好                  -> 文字消息
#   **张三**：[图片]                -> 图片消息（用默认占位图）
#   **张三**：[图片]/path/to/img.jpg -> 图片消息（指定路径）
#   **张三**：[红包]恭喜发财        -> 红包
#   **张三**：[转账]200:饭钱        -> 转账
#   **张三**：[语音]5               -> 语音 5 秒

import io
import os
import re
import json
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont

# ============================================================
# 默认头像路径
# ============================================================
_DEFAULT_AVATAR_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets', 'wechat_default_avatar.jpg')

# ============================================================
# 风格预设
# ============================================================
THEME_PRESETS = {
    'ios_classic': {
        'background_color': '#EDEDED',
        'status_bar_color': '#EDEDED',
        'status_bar_text_color': '#000000',
        'header_color': '#EDEDED',
        'header_text_color': '#111111',
        'header_border_color': '#DCDCDC',
        'my_bubble_color': '#95EC69',
        'other_bubble_color': '#FFFFFF',
        'my_text_color': '#000000',
        'other_text_color': '#000000',
        'system_bg_color': '#DADADA',
        'system_text_color': '#999999',
        'time_bg_color': '#DADADA',
        'time_text_color': '#FFFFFF',
        'time_node_text_color': '#999999',
        'redpacket_color': '#FA9D3B',
        'redpacket_text_color': '#FFFFFF',
        'transfer_color': '#FF7D7D',
        'transfer_text_color': '#FFFFFF',
        'voice_color': '#95EC69',
        'voice_text_color': '#000000',
        'link_color': '#576B95',
        'status_bar_height': 24,
        'header_height': 48,
        'bubble_radius': 8,
        'avatar_radius': 6,
        'avatar_size': 38,
    },
    'ios_dark': {
        'background_color': '#1A1A1A',
        'status_bar_color': '#2C2C2E',
        'status_bar_text_color': '#FFFFFF',
        'header_color': '#2C2C2E',
        'header_text_color': '#FFFFFF',
        'header_border_color': '#3A3A3C',
        'my_bubble_color': '#2D5B3E',
        'other_bubble_color': '#3A3A3C',
        'my_text_color': '#FFFFFF',
        'other_text_color': '#FFFFFF',
        'system_bg_color': '#3A3A3C',
        'system_text_color': '#BBBBBB',
        'time_bg_color': '#3A3A3C',
        'time_text_color': '#FFFFFF',
        'time_node_text_color': '#888888',
        'redpacket_color': '#C77A2E',
        'redpacket_text_color': '#FFFFFF',
        'transfer_color': '#CC6666',
        'transfer_text_color': '#FFFFFF',
        'voice_color': '#2D5B3E',
        'voice_text_color': '#FFFFFF',
        'link_color': '#7B8FB5',
        'status_bar_height': 24,
        'header_height': 48,
        'bubble_radius': 8,
        'avatar_radius': 6,
        'avatar_size': 38,
    },
    'android': {
        'background_color': '#F5F5F5',
        'status_bar_color': '#E0E0E0',
        'status_bar_text_color': '#212121',
        'header_color': '#E0E0E0',
        'header_text_color': '#212121',
        'header_border_color': '#BDBDBD',
        'my_bubble_color': '#B2DFDB',
        'other_bubble_color': '#FFFFFF',
        'my_text_color': '#212121',
        'other_text_color': '#212121',
        'system_bg_color': '#E0E0E0',
        'system_text_color': '#757575',
        'time_bg_color': '#E0E0E0',
        'time_text_color': '#FFFFFF',
        'time_node_text_color': '#757575',
        'redpacket_color': '#FB8C00',
        'redpacket_text_color': '#FFFFFF',
        'transfer_color': '#E57373',
        'transfer_text_color': '#FFFFFF',
        'voice_color': '#B2DFDB',
        'voice_text_color': '#212121',
        'link_color': '#5C6BC0',
        'status_bar_height': 24,
        'header_height': 48,
        'bubble_radius': 4,
        'avatar_radius': 4,
        'avatar_size': 38,
    },
}

# ============================================================
# 字体加载
# ============================================================
_FONT_CANDIDATES = {
    'win32': [
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/msyhl.ttc',
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/simsun.ttc',
    ],
    'darwin': [
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Medium.ttc',
    ],
    'other': [
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
        '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',
    ],
}


def _find_system_font():
    import sys as _sys
    key = 'win32' if _sys.platform == 'win32' else ('darwin' if _sys.platform == 'darwin' else 'other')
    for p in _FONT_CANDIDATES[key]:
        if os.path.exists(p):
            return p
    return None


def _load_font(font_path, font_size):
    path = font_path or _find_system_font()
    if path and os.path.exists(path):
        try:
            return ImageFont.truetype(path, font_size)
        except Exception:
            pass
    try:
        return ImageFont.load_default(size=font_size)
    except Exception:
        return ImageFont.load_default()


# ============================================================
# 颜色解析
# ============================================================
def _hex_to_rgb(color):
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
    try:
        return int(font.getlength(text))
    except AttributeError:
        pass
    try:
        bbox = font.getbbox(text)
        return bbox[2] - bbox[0]
    except Exception:
        return len(text) * 12


def _text_height(font, text):
    try:
        bbox = font.getbbox(text)
        return bbox[3] - bbox[1]
    except Exception:
        return font.size


def _wrap_text(font, text, max_width):
    if not text:
        return ['']
    lines = []
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
# 圆角矩形辅助
# ============================================================
def _draw_rounded_rect(draw, xy, radius, fill):
    """Pillow 9.4+ 支持 rounded_rectangle，老版本用圆+矩形组合"""
    try:
        draw.rounded_rectangle(xy, radius=radius, fill=fill)
    except AttributeError:
        x0, y0, x1, y1 = xy
        r = radius
        draw.rectangle([x0 + r, y0, x1 - r, y1], fill=fill)
        draw.rectangle([x0, y0 + r, x1, y1 - r], fill=fill)
        draw.pieslice([x0, y0, x0 + 2 * r, y0 + 2 * r], 180, 270, fill=fill)
        draw.pieslice([x1 - 2 * r, y0, x1, y0 + 2 * r], 270, 360, fill=fill)
        draw.pieslice([x0, y1 - 2 * r, x0 + 2 * r, y1], 90, 180, fill=fill)
        draw.pieslice([x1 - 2 * r, y1 - 2 * r, x1, y1], 0, 90, fill=fill)


def _draw_circle(draw, cx, cy, r, fill):
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=fill)


# ============================================================
# 头像加载（带缓存）
# ============================================================
_avatar_cache = {}


def _load_avatar(path, size):
    """
    加载头像并裁剪为圆角矩形。
    - path: 图片路径，None 或不存在则用默认微信头像
    - size: 目标尺寸 (w, h)
    """
    if not path or not os.path.exists(path):
        path = _DEFAULT_AVATAR_PATH
        if not os.path.exists(path):
            # 默认头像也不存在，生成纯色占位
            cache_key = ('__placeholder__', size)
            if cache_key in _avatar_cache:
                return _avatar_cache[cache_key]
            img = Image.new('RGB', size, '#7BB6E8')
            _avatar_cache[cache_key] = img
            return img

    cache_key = (path, size)
    if cache_key in _avatar_cache:
        return _avatar_cache[cache_key]

    try:
        img = Image.open(path).convert('RGB')
        # 中心裁剪为正方形
        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))
        img = img.resize(size, Image.LANCZOS)
    except Exception:
        img = Image.new('RGB', size, '#7BB6E8')

    _avatar_cache[cache_key] = img
    return img


def _apply_rounded_corners(img, radius):
    """给图片加圆角（返回 RGBA）"""
    w, h = img.size
    # 用 mask 实现
    mask = Image.new('L', (w, h), 0)
    md = ImageDraw.Draw(mask)
    try:
        md.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    except AttributeError:
        md.rectangle([radius, 0, w - radius, h], fill=255)
        md.rectangle([0, radius, w, h - radius], fill=255)
        md.pieslice([0, 0, 2 * radius, 2 * radius], 180, 270, fill=255)
        md.pieslice([w - 2 * radius, 0, w, 2 * radius], 270, 360, fill=255)
        md.pieslice([0, h - 2 * radius, 2 * radius, h], 90, 180, fill=255)
        md.pieslice([w - 2 * radius, h - 2 * radius, w, h], 0, 90, fill=255)

    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    img.putalpha(mask)
    return img


# ============================================================
# 时间解析与格式化（仿真实微信）
# ============================================================
def _parse_time_str(time_str):
    """
    解析时间字符串，返回 datetime 对象。
    支持格式：
      'HH:MM'       -> 今天
      '昨天 HH:MM'
      '星期X HH:MM'
      'M月D日 HH:MM'  或 'M月D日H点M分'
      'YYYY年M月D日 HH:MM'
      'YYYY/M/D HH:MM'
    失败返回 None。
    """
    if not time_str:
        return None
    s = time_str.strip()
    now = datetime.now()

    # 纯时间 HH:MM
    m = re.match(r'^(\d{1,2}):(\d{2})$', s)
    if m:
        return now.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=0, microsecond=0)

    # 昨天 HH:MM
    m = re.match(r'^昨天\s*(\d{1,2}):(\d{2})$', s)
    if m:
        yesterday = now - timedelta(days=1)
        return yesterday.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=0, microsecond=0)

    # 星期X HH:MM
    m = re.match(r'^星期([一二三四五六日天])\s*(\d{1,2}):(\d{2})$', s)
    if m:
        weekday_map = {'一': 0, '二': 1, '三': 2, '四': 3, '五': 4, '六': 5, '日': 6, '天': 6}
        target_wd = weekday_map.get(m.group(1))
        if target_wd is not None:
            diff = (now.weekday() - target_wd) % 7
            target = now - timedelta(days=diff)
            return target.replace(hour=int(m.group(2)), minute=int(m.group(3)), second=0, microsecond=0)

    # M月D日 HH:MM
    m = re.match(r'^(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})$', s)
    if m:
        try:
            return now.replace(month=int(m.group(1)), day=int(m.group(2)),
                               hour=int(m.group(3)), minute=int(m.group(4)), second=0, microsecond=0)
        except ValueError:
            return None

    # YYYY年M月D日 HH:MM
    m = re.match(r'^(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})$', s)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            return None

    # YYYY/M/D HH:MM
    m = re.match(r'^(\d{4})/(\d{1,2})/(\d{1,2})\s+(\d{1,2}):(\d{2})$', s)
    if m:
        try:
            return datetime(int(m.group(1)), int(m.group(2)), int(m.group(3)),
                            int(m.group(4)), int(m.group(5)))
        except ValueError:
            return None

    # 【3月1日 14:32】格式
    m = re.match(r'^【?(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})】?$', s)
    if m:
        try:
            return now.replace(month=int(m.group(1)), day=int(m.group(2)),
                               hour=int(m.group(3)), minute=int(m.group(4)), second=0, microsecond=0)
        except ValueError:
            return None

    return None


def _format_time_for_display(dt):
    """
    仿微信时间显示规则。
    - 今天: 上午 9:30 / 下午 2:32
    - 昨天: 昨天 上午 9:30
    - 本周: 星期三 下午 2:32
    - 更早: 2024年3月1日 下午 2:32
    """
    if dt is None:
        return ''
    now = datetime.now()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    target_day = dt.replace(hour=0, minute=0, second=0, microsecond=0)
    diff_days = (today - target_day).days

    hour = dt.hour
    minute = dt.minute
    # 上下午
    if hour < 6:
        period = '凌晨'
    elif hour < 12:
        period = '上午'
    elif hour < 18:
        period = '下午'
        hour12 = hour - 12 if hour > 12 else 12
        time_str = f'{period} {hour12}:{minute:02d}'
    else:
        period = '晚上'
        hour12 = hour - 12
        time_str = f'{period} {hour12}:{minute:02d}'

    if hour < 12:
        time_str = f'{period} {hour}:{minute:02d}'
    elif hour == 12:
        time_str = f'{period} 12:{minute:02d}'

    if diff_days == 0:
        return time_str
    elif diff_days == 1:
        return f'昨天 {time_str}'
    elif diff_days < 7:
        weekday_names = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日']
        return f'{weekday_names[dt.weekday()]} {time_str}'
    else:
        return f'{dt.year}年{dt.month}月{dt.day}日 {time_str}'


def _should_show_time_node(prev_time, curr_time):
    """
    仿微信规则：相邻消息间隔 >5 分钟才显示时间节点。
    """
    if prev_time is None or curr_time is None:
        return True
    delta = abs((curr_time - prev_time).total_seconds())
    return delta > 5 * 60


# ============================================================
# 顶部状态栏 + 标题栏 绘制
# ============================================================
def _draw_status_bar(draw, x0, y0, width, height, time_str, theme):
    """
    绘制顶部状态栏（仿微信）：左 -时间，右 -信号/WiFi/电池
    """
    bg = _hex_to_rgb(theme['status_bar_color'])
    tc = _hex_to_rgb(theme['status_bar_text_color'])
    draw.rectangle([x0, y0, x0 + width, y0 + height], fill=bg)

    # 左：时间
    font = _load_font(None, 13)
    draw.text((x0 + 16, y0 + (height - 13) // 2 - 1), time_str, fill=tc, font=font)

    # 右：信号 (4 个递增竖条)
    bar_x = x0 + width - 80
    bar_y_top = y0 + height // 2 - 1
    for i in range(4):
        h = 3 + i * 2
        draw.rectangle([bar_x + i * 4, bar_y_top + 8 - h, bar_x + i * 4 + 2, bar_y_top + 8], fill=tc)

    # WiFi (3 个弧线 - 用同心圆弧近似)
    wifi_cx = x0 + width - 60
    wifi_cy = y0 + height // 2
    for i, r in enumerate([3, 6, 9]):
        # 画上半圆弧（用 ellipse + 截取顶部）
        draw.arc([wifi_cx - r, wifi_cy - r, wifi_cx + r, wifi_cy + r], start=0, end=180, fill=tc, width=1)

    # 电池（外框 + 内部填充 + 头）
    bat_x = x0 + width - 40
    bat_y = y0 + height // 2 - 5
    draw.rounded_rectangle([bat_x, bat_y, bat_x + 22, bat_y + 10], radius=2, outline=tc, width=1)
    draw.rectangle([bat_x + 22, bat_y + 3, bat_x + 24, bat_y + 7], fill=tc)  # 电池头
    # 内部填充（约 70%）
    draw.rectangle([bat_x + 2, bat_y + 2, bat_x + 16, bat_y + 8], fill=tc)


def _draw_header(draw, x0, y0, width, height, title, theme):
    """
    绘制标题栏：左 <（返回箭头），中 -标题，右 -⋯（更多）
    """
    bg = _hex_to_rgb(theme['header_color'])
    tc = _hex_to_rgb(theme['header_text_color'])
    border = _hex_to_rgb(theme['header_border_color'])

    draw.rectangle([x0, y0, x0 + width, y0 + height], fill=bg)
    # 底部细线
    draw.line([(x0, y0 + height - 1), (x0 + width, y0 + height - 1)], fill=border, width=1)

    # 左：< 返回箭头（用线条画）
    arrow_x = x0 + 16
    arrow_cy = y0 + height // 2
    arrow_color = tc
    # 简化用 "<" 字符
    arrow_font = _load_font(None, 22)
    draw.text((arrow_x, arrow_cy - 11), '<', fill=arrow_color, font=arrow_font)

    # 中：标题
    title_font = _load_font(None, 17)
    tw = _text_width(title_font, title)
    title_x = x0 + (width - tw) // 2
    title_y = y0 + (height - 17) // 2 - 1
    draw.text((title_x, title_y), title, fill=tc, font=title_font)

    # 右：⋯ 更多按钮（画三个点）
    dot_cx = x0 + width - 20
    dot_cy = y0 + height // 2
    dot_r = 2
    for i in range(3):
        draw.ellipse([dot_cx - dot_r, dot_cy - dot_r + (i - 1) * 6,
                      dot_cx + dot_r, dot_cy + dot_r + (i - 1) * 6], fill=tc)


# ============================================================
# 各消息类型绘制
# ============================================================
def _draw_bubble_text(draw, msg, font, theme, is_me, x_left, x_right, y, padding, max_bubble_width):
    """
    绘制文本气泡。返回 (bubble_top, bubble_bottom, b_left, b_right)
    """
    text = msg.get('text', '')
    bubble_color = _hex_to_rgb(theme['my_bubble_color'] if is_me else theme['other_bubble_color'])
    text_color = _hex_to_rgb(theme['my_text_color'] if is_me else theme['other_text_color'])

    lines = _wrap_text(font, text, max_bubble_width - padding * 2)
    line_height = int(font.size * 1.45)
    text_height = line_height * len(lines)
    bubble_height = text_height + padding * 2

    # 计算气泡宽度（取最长行）
    longest_line_w = max((_text_width(font, line) for line in lines), default=0)
    natural_bubble_width = max(longest_line_w + padding * 2, 50)

    if is_me:
        b_right = x_right
        b_left = max(b_right - natural_bubble_width, x_left)
        text_x = b_left + padding
    else:
        b_left = x_left
        b_right = min(b_left + natural_bubble_width, x_right)
        text_x = b_left + padding

    b_top = y
    b_bottom = b_top + bubble_height

    _draw_rounded_rect(draw, [b_left, b_top, b_right, b_bottom], theme['bubble_radius'], bubble_color)

    # 绘制小尖角（气泡指向头像）
    spike_color = bubble_color
    if is_me:
        # 右下角小尖角
        spike_x = b_right
        spike_y = b_top + 12
        draw.polygon([(spike_x, spike_y - 6), (spike_x + 6, spike_y), (spike_x, spike_y + 6)], fill=spike_color)
    else:
        spike_x = b_left
        spike_y = b_top + 12
        draw.polygon([(spike_x, spike_y - 6), (spike_x - 6, spike_y), (spike_x, spike_y + 6)], fill=spike_color)

    # 绘制文本
    text_y = b_top + padding
    for line in lines:
        draw.text((text_x, text_y), line, fill=text_color, font=font)
        text_y += line_height

    return b_top, b_bottom, b_left, b_right


def _draw_bubble_image(img, draw, msg, theme, is_me, x_left, x_right, y, avatar_size):
    """
    绘制图片消息气泡。返回 (bubble_top, bubble_bottom, b_left, b_right)
    图片来源：
      - msg.image_path（本地文件路径）
      - 无则用默认占位图（灰色矩形 + "图片"二字）
    """
    # 图片目标尺寸（仿微信：最大 200x200，按原图比例缩放）
    target_w, target_h = 180, 180
    image_path = msg.get('image_path') or msg.get('image_url')

    if image_path and os.path.exists(image_path):
        try:
            pil_img = Image.open(image_path).convert('RGB')
            w, h = pil_img.size
            # 等比缩放到目标尺寸内
            ratio = min(target_w / w, target_h / h)
            new_w = max(1, int(w * ratio))
            new_h = max(1, int(h * ratio))
            pil_img = pil_img.resize((new_w, new_h), Image.LANCZOS)
        except Exception:
            pil_img = Image.new('RGB', (target_w, target_h), '#CCCCCC')
            d2 = ImageDraw.Draw(pil_img)
            d2.text((target_w // 2 - 20, target_h // 2 - 10), '图片', fill='#999999', font=_load_font(None, 16))
    else:
        pil_img = Image.new('RGB', (target_w, target_h), '#CCCCCC')
        d2 = ImageDraw.Draw(pil_img)
        d2.text((target_w // 2 - 20, target_h // 2 - 10), '图片', fill='#999999', font=_load_font(None, 16))

    pil_img = _apply_rounded_corners(pil_img, theme['bubble_radius'])

    bw, bh = pil_img.size
    if is_me:
        b_right = x_right
        b_left = b_right - bw
    else:
        b_left = x_left
        b_right = b_left + bw

    b_top = y
    b_bottom = b_top + bh

    # 用 alpha 合成到主图
    img.paste(pil_img, (b_left, b_top), pil_img)

    return b_top, b_bottom, b_left, b_right


def _draw_bubble_redpacket(draw, msg, font, theme, is_me, x_left, x_right, y, padding, max_bubble_width):
    """红包气泡"""
    text = msg.get('text', '恭喜发财，大吉大利')
    bg = _hex_to_rgb(theme['redpacket_color'])
    tc = _hex_to_rgb(theme['redpacket_text_color'])

    title_font = _load_font(None, font.size + 1)
    lines = _wrap_text(title_font, text, max_bubble_width - padding * 2)
    line_height = int(title_font.size * 1.4)
    text_height = line_height * len(lines)
    bubble_height = text_height + padding * 2 + 24  # 顶部 24px 留白放图标

    longest_line_w = max((_text_width(title_font, line) for line in lines), default=0)
    natural_bubble_width = max(longest_line_w + padding * 2, 180)

    if is_me:
        b_right = x_right
        b_left = max(b_right - natural_bubble_width, x_left)
        text_x = b_left + padding
    else:
        b_left = x_left
        b_right = min(b_left + natural_bubble_width, x_right)
        text_x = b_left + padding

    b_top = y
    b_bottom = b_top + bubble_height
    _draw_rounded_rect(draw, [b_left, b_top, b_right, b_bottom], theme['bubble_radius'], bg)

    # 顶部图标（用文字"￥"近似）
    icon_font = _load_font(None, 18)
    draw.text((b_left + padding, b_top + 4), '￥', fill=tc, font=icon_font)

    # 文本
    text_y = b_top + 24
    for line in lines:
        draw.text((text_x, text_y), line, fill=tc, font=title_font)
        text_y += line_height

    # 底部"微信红包"小字
    sub_font = _load_font(None, font.size - 3)
    draw.text((b_left + padding, b_bottom - 16), '微信红包', fill=tc, font=sub_font)

    return b_top, b_bottom, b_left, b_right


def _draw_bubble_transfer(draw, msg, font, theme, is_me, x_left, x_right, y, padding, max_bubble_width):
    """转账气泡"""
    amount = msg.get('amount', '0')
    text = msg.get('text', '')
    bg = _hex_to_rgb(theme['transfer_color'])
    tc = _hex_to_rgb(theme['transfer_text_color'])

    amount_text = f'￥{amount}'
    amount_font = _load_font(None, font.size + 4)
    amount_w = _text_width(amount_font, amount_text)

    sub_text = text if text else '转账'
    sub_font = _load_font(None, font.size - 3)
    sub_w = _text_width(sub_font, sub_text)

    inner_w = max(amount_w, sub_w)
    bubble_width = max(inner_w + padding * 2, 180)
    bubble_height = 56 + padding * 2

    if is_me:
        b_right = x_right
        b_left = max(b_right - bubble_width, x_left)
    else:
        b_left = x_left
        b_right = min(b_left + bubble_width, x_right)

    b_top = y
    b_bottom = b_top + bubble_height
    _draw_rounded_rect(draw, [b_left, b_top, b_right, b_bottom], theme['bubble_radius'], bg)

    # 金额（顶部居中）
    ax = b_left + (bubble_width - amount_w) // 2
    draw.text((ax, b_top + 8), amount_text, fill=tc, font=amount_font)

    # 备注（底部）
    sx = b_left + (bubble_width - sub_w) // 2
    draw.text((sx, b_bottom - 22), sub_text, fill=tc, font=sub_font)

    return b_top, b_bottom, b_left, b_right


def _draw_bubble_voice(draw, msg, font, theme, is_me, x_left, x_right, y, padding):
    """语音气泡"""
    duration = msg.get('duration', 1)
    bg = _hex_to_rgb(theme['voice_color'] if not is_me else theme['my_bubble_color'])
    tc = _hex_to_rgb(theme['voice_text_color'] if not is_me else theme['my_text_color'])

    # 语音气泡宽度根据时长（10-200px）
    bubble_width = max(60, min(180, 50 + int(duration) * 8))
    bubble_height = 36

    if is_me:
        b_right = x_right
        b_left = b_right - bubble_width
    else:
        b_left = x_left
        b_right = b_left + bubble_width

    b_top = y
    b_bottom = b_top + bubble_height
    _draw_rounded_rect(draw, [b_left, b_top, b_right, b_bottom], theme['bubble_radius'], bg)

    # 语音图标（用文字"♪"近似，或者画 3 个小竖条）
    icon_x = b_left + 8 if not is_me else b_right - 20
    icon_cy = b_top + bubble_height // 2
    for i in range(3):
        h = 4 + i * 3
        draw.rectangle([icon_x + i * 3, icon_cy - h // 2, icon_x + i * 3 + 2, icon_cy + h // 2], fill=tc)

    # 时长
    dur_text = f'{int(duration)}\''
    dw = _text_width(font, dur_text)
    if is_me:
        dt_x = b_left + 8
    else:
        dt_x = b_right - 8 - dw
    draw.text((dt_x, b_top + (bubble_height - font.size) // 2 - 1), dur_text, fill=tc, font=font)

    return b_top, b_bottom, b_left, b_right


def _draw_system_message(draw, msg, font, theme, canvas_width, y):
    """系统消息：灰色圆角小卡片居中"""
    text = msg.get('text', '')
    bg = _hex_to_rgb(theme['system_bg_color'])
    tc = _hex_to_rgb(theme['system_text_color'])

    tw = _text_width(font, text)
    pad_x, pad_y = 8, 4
    bw = tw + pad_x * 2
    bh = font.size + pad_y * 2

    bx = (canvas_width - bw) // 2
    by = y

    _draw_rounded_rect(draw, [bx, by, bx + bw, by + bh], 4, bg)
    draw.text((bx + pad_x, by + pad_y - 1), text, fill=tc, font=font)

    return by + bh


def _draw_time_node(draw, text, font, theme, canvas_width, y):
    """时间节点：灰色圆角小卡片居中"""
    bg = _hex_to_rgb(theme['time_bg_color'])
    tc = _hex_to_rgb(theme['time_text_color'])

    tw = _text_width(font, text)
    pad_x, pad_y = 8, 4
    bw = tw + pad_x * 2
    bh = font.size + pad_y * 2

    bx = (canvas_width - bw) // 2
    by = y

    _draw_rounded_rect(draw, [bx, by, bx + bw, by + bh], 4, bg)
    draw.text((bx + pad_x, by + pad_y - 1), text, fill=tc, font=font)

    return by + bh


# ============================================================
# 消息高度测量（第一遍布局）
# ============================================================
def _measure_message(msg, font, theme, canvas_width, padding):
    """测量单条消息高度"""
    msg_type = msg.get('type', 'text')
    if msg_type in ('system', 'time'):
        return 28
    avatar_size = theme['avatar_size']
    if msg_type == 'image':
        return 180 + 14
    if msg_type == 'redpacket':
        lines = _wrap_text(_load_font(None, font.size + 1), msg.get('text', '恭喜发财'), canvas_width - avatar_size * 2 - padding * 4)
        return 24 + int((font.size + 1) * 1.4) * len(lines) + padding * 2 + 16 + 14
    if msg_type == 'transfer':
        return 56 + padding * 2 + 14
    if msg_type == 'voice':
        return 36 + 14
    # text
    max_bubble_width = canvas_width - avatar_size * 2 - padding * 4 - 20
    if max_bubble_width < 80:
        max_bubble_width = 80
    lines = _wrap_text(font, msg.get('text', ''), max_bubble_width - padding * 2)
    line_height = int(font.size * 1.45)
    bubble_height = line_height * len(lines) + padding * 2
    return max(bubble_height, avatar_size) + 14


# ============================================================
# 主生成函数
# ============================================================
def generate_wechat_chat(
    messages,
    theme='ios_classic',
    canvas_width=420,
    font_size=15,
    font_path=None,
    overrides=None,
    show_avatar=True,
    show_time=True,
    title='微信',
    status_bar_time='14:32',
    battery_level=70,
    avatar_map=None,
    me_name='我',
):
    """
    生成微信风格聊天截图（v2 重写版，对齐真实微信视觉）。

    参数:
        messages: list, 消息列表（见模块文档）
        theme: str, 风格预设 ios_classic / ios_dark / android
        canvas_width: int, 画布宽度（默认 420）
        font_size: int, 字号（默认 15）
        font_path: str|None, 字体文件路径
        overrides: dict|None, 覆盖主题颜色
        show_avatar: bool, 是否绘制头像
        show_time: bool, 是否自动插入时间节点（间隔 >5min）
        title: str, 标题栏文字（联系人名称）
        status_bar_time: str, 顶部状态栏显示的时间
        battery_level: int, 电量百分比（0-100）
        avatar_map: dict|None, {sender_name: avatar_image_path}，未指定的用默认头像
        me_name: str, "我"的发送者名称（默认 '我'）

    返回:
        PIL.Image 对象（RGB 模式）
    """
    if not isinstance(messages, list):
        raise ValueError('messages 必须是列表')
    if not messages:
        raise ValueError('messages 不能为空')

    base_theme = dict(THEME_PRESETS.get(theme, THEME_PRESETS['ios_classic']))
    if overrides and isinstance(overrides, dict):
        for k, v in overrides.items():
            if v is not None and v != '':
                base_theme[k] = v

    avatar_map = avatar_map or {}

    font = _load_font(font_path, font_size)
    padding = 8

    # 头像尺寸
    avatar_size_px = base_theme['avatar_size']
    avatar_dims = (avatar_size_px, avatar_size_px)

    # ===== 第一遍：测量总高度，并计算时间节点插入位置 =====
    # 先规范化消息（补 type、解析时间）
    normalized_msgs = []
    for msg in messages:
        m = dict(msg)
        if 'type' not in m:
            m['type'] = 'text'
        if m['type'] == 'text' and 'sender' not in m:
            m['sender'] = ''
        # 解析时间字段
        if 'time' in m and m['time']:
            m['_dt'] = _parse_time_str(m['time'])
        normalized_msgs.append(m)

    # 计算时间节点插入
    render_items = []  # [(kind, msg_or_text, dt), ...]
    prev_dt = None
    for m in normalized_msgs:
        if m['type'] == 'time':
            # 显式时间节点
            text = m.get('text') or m.get('time', '')
            render_items.append(('time', text, None))
            continue
        if m['type'] == 'system':
            render_items.append(('system', m, None))
            continue
        # 普通消息
        curr_dt = m.get('_dt')
        if show_time and _should_show_time_node(prev_dt, curr_dt):
            if curr_dt:
                time_text = _format_time_for_display(curr_dt)
            elif prev_dt is None:
                time_text = status_bar_time
            else:
                time_text = ''
            if time_text:
                render_items.append(('time', time_text, None))
        render_items.append(('msg', m, curr_dt))
        if curr_dt:
            prev_dt = curr_dt

    # 测量总高度
    status_h = base_theme['status_bar_height']
    header_h = base_theme['header_height']
    total_height = status_h + header_h + 12  # 顶部留白

    for kind, payload, _ in render_items:
        if kind == 'time':
            total_height += 28
        elif kind == 'system':
            total_height += 28
        else:
            total_height += _measure_message(payload, font, base_theme, canvas_width, padding)

    total_height += 24  # 底部留白

    # ===== 第二遍：绘制 =====
    img = Image.new('RGB', (canvas_width, total_height), _hex_to_rgb(base_theme['background_color']))
    draw = ImageDraw.Draw(img)

    # 顶部状态栏
    _draw_status_bar(draw, 0, 0, canvas_width, status_h, status_bar_time, base_theme)

    # 标题栏
    _draw_header(draw, 0, status_h, canvas_width, header_h, title, base_theme)

    # 消息区
    y = status_h + header_h + 12
    x_pad = 10
    avatar_size = avatar_size_px

    for kind, payload, _ in render_items:
        if kind == 'time':
            y = _draw_time_node(draw, payload, _load_font(font_path, font_size - 2), base_theme, canvas_width, y)
            y += 16
            continue
        if kind == 'system':
            y = _draw_system_message(draw, payload, _load_font(font_path, font_size - 1), base_theme, canvas_width, y)
            y += 16
            continue

        # 普通消息
        msg = payload
        sender = msg.get('sender', '')
        is_me = (sender == me_name or sender.lower() == 'me' or sender == '我')
        msg_type = msg.get('type', 'text')

        # 头像位置
        avatar_y = y
        if is_me:
            avatar_x = canvas_width - x_pad - avatar_size
            x_left = x_pad + avatar_size + 12     # 左气泡边界（其他用户）
            x_right = canvas_width - x_pad - avatar_size - 12  # 右气泡边界
        else:
            avatar_x = x_pad
            x_left = x_pad + avatar_size + 12
            x_right = canvas_width - x_pad - avatar_size - 12

        max_bubble_width = x_right - x_left - 4
        if max_bubble_width < 80:
            max_bubble_width = 80

        # 绘制头像
        if show_avatar:
            avatar_path = avatar_map.get(sender) or avatar_map.get('__default__')
            av_img = _load_avatar(avatar_path, avatar_dims)
            av_img = _apply_rounded_corners(av_img, base_theme['avatar_radius'])
            img.paste(av_img, (avatar_x, avatar_y), av_img)

        # 根据消息类型绘制气泡
        if msg_type == 'text':
            b_top, b_bottom, b_left, b_right = _draw_bubble_text(
                draw, msg, font, base_theme, is_me, x_left, x_right, avatar_y, padding, max_bubble_width
            )
        elif msg_type == 'image':
            b_top, b_bottom, b_left, b_right = _draw_bubble_image(
                img, draw, msg, base_theme, is_me, x_left, x_right, avatar_y, avatar_size
            )
        elif msg_type == 'redpacket':
            b_top, b_bottom, b_left, b_right = _draw_bubble_redpacket(
                draw, msg, font, base_theme, is_me, x_left, x_right, avatar_y, padding, max_bubble_width
            )
        elif msg_type == 'transfer':
            b_top, b_bottom, b_left, b_right = _draw_bubble_transfer(
                draw, msg, font, base_theme, is_me, x_left, x_right, avatar_y, padding, max_bubble_width
            )
        elif msg_type == 'voice':
            b_top, b_bottom, b_left, b_right = _draw_bubble_voice(
                draw, msg, font, base_theme, is_me, x_left, x_right, avatar_y, padding
            )
        else:
            # 未知类型回退到 text
            b_top, b_bottom, b_left, b_right = _draw_bubble_text(
                draw, msg, font, base_theme, is_me, x_left, x_right, avatar_y, padding, max_bubble_width
            )

        # 步进到下一条
        y = b_bottom + 14

    return img


def image_to_bytes(img, fmt='png'):
    buf = io.BytesIO()
    fmt_upper = fmt.upper() if fmt.lower() != 'jpeg' else 'JPEG'
    img.save(buf, format=fmt_upper)
    buf.seek(0)
    return buf


def parse_messages_from_json(json_str):
    """解析 JSON 字符串为消息列表"""
    if not json_str or not json_str.strip():
        raise ValueError('JSON 内容为空')
    data = json.loads(json_str)
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and 'messages' in data:
        return data['messages']
    raise ValueError('JSON 格式不正确，应为数组或包含 messages 字段的对象')


# ============================================================
# Markdown 文本导入解析
# ============================================================
_TIME_NODE_PATTERN = re.compile(r'^\*\*【(.+?)】\*\*\s*$')
_MSG_PATTERN = re.compile(r'^\*\*(.+?)\*\*[：:]\s*(.*)$')


def parse_markdown_to_messages(md_text):
    """
    解析 Markdown 文本为消息列表（兼容开源项目格式）。

    格式:
      **【3月1日 14:32】**          -> 时间节点
      **张三**：你好                -> 文字消息
      **张三**：[图片]              -> 图片消息
      **张三**：[图片]/path/img.jpg -> 图片消息（指定路径）
      **张三**：[红包]恭喜发财      -> 红包
      **张三**：[转账]200:饭钱      -> 转账
      **张三**：[语音]5             -> 语音
      其他行                       -> 忽略（空行等）

    返回: list[dict]
    """
    if not md_text:
        return []

    messages = []
    for line in md_text.split('\n'):
        line = line.rstrip()
        if not line.strip():
            continue

        # 时间节点
        m = _TIME_NODE_PATTERN.match(line)
        if m:
            messages.append({
                'sender': '',
                'text': m.group(1).strip(),
                'type': 'time',
            })
            continue

        # 消息
        m = _MSG_PATTERN.match(line)
        if m:
            sender = m.group(1).strip()
            content = m.group(2).strip()
            msg = {'sender': sender}

            # 检查特殊消息类型
            if content.startswith('[图片]'):
                msg['type'] = 'image'
                rest = content[4:].strip()
                if rest:
                    msg['image_path'] = rest
            elif content.startswith('[红包]'):
                msg['type'] = 'redpacket'
                msg['text'] = content[4:].strip() or '恭喜发财，大吉大利'
            elif content.startswith('[转账]'):
                msg['type'] = 'transfer'
                rest = content[4:].strip()
                if ':' in rest:
                    amount, _, note = rest.partition(':')
                    msg['amount'] = amount.strip()
                    msg['text'] = note.strip()
                else:
                    msg['amount'] = rest
                    msg['text'] = ''
            elif content.startswith('[语音]'):
                msg['type'] = 'voice'
                dur_str = content[4:].strip()
                try:
                    msg['duration'] = int(dur_str)
                except ValueError:
                    msg['duration'] = 1
            else:
                msg['type'] = 'text'
                msg['text'] = content

            messages.append(msg)
            continue

        # 无法识别的行忽略
    return messages


def messages_to_markdown(messages):
    """将消息列表反向序列化为 Markdown 文本（便于编辑）"""
    lines = []
    for m in messages:
        t = m.get('type', 'text')
        if t == 'time':
            lines.append(f'**【{m.get("text", "")}】**')
        elif t == 'system':
            lines.append(f'**【系统】{m.get("text", "")}**')
        else:
            sender = m.get('sender', '')
            if t == 'text':
                lines.append(f'**{sender}**：{m.get("text", "")}')
            elif t == 'image':
                path = m.get('image_path', '')
                lines.append(f'**{sender}**：[图片]{path}')
            elif t == 'redpacket':
                lines.append(f'**{sender}**：[红包]{m.get("text", "")}')
            elif t == 'transfer':
                amt = m.get('amount', '')
                note = m.get('text', '')
                if note:
                    lines.append(f'**{sender}**：[转账]{amt}:{note}')
                else:
                    lines.append(f'**{sender}**：[转账]{amt}')
            elif t == 'voice':
                lines.append(f'**{sender}**：[语音]{m.get("duration", 1)}')
    return '\n'.join(lines)


# ============================================================
# 默认示例（Markdown 格式）
# ============================================================
EXAMPLE_MARKDOWN = """**【3月1日 14:32】**
**张三**：你好，在忙不？
**李四**：不忙，怎么了？
**张三**：[图片]
**李四**：[红包]恭喜发财
**张三**：[转账]200:饭钱
**李四**：[语音]5
**张三**：收到，谢谢！
"""
