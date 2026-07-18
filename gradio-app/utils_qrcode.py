# 二维码生成工具模块
# 依赖: qrcode, Pillow
# 功能: 文本/URL -> 二维码图片（PIL.Image），支持尺寸、颜色、容错级别、Logo 嵌入

import io
import os
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
from PIL import Image

# 容错级别映射
_ERROR_CORRECT_MAP = {
    'L': ERROR_CORRECT_L,   # ~7%
    'M': ERROR_CORRECT_M,   # ~15%
    'Q': ERROR_CORRECT_Q,   # ~25%
    'H': ERROR_CORRECT_H,   # ~30%
}


def _parse_color(color):
    """
    解析颜色，支持:
      - 颜色名: 'black', 'white'
      - hex 字符串: '#000000', '#FFFFFF'
      - RGB 元组/列表: (0, 0, 0) / [255, 255, 255]
    返回 PIL 可接受的格式（hex 字符串或 RGB 元组）。
    """
    if color is None:
        return 'black'
    if isinstance(color, (tuple, list)):
        return tuple(color)
    if isinstance(color, str):
        s = color.strip()
        if s == '':
            return 'black'
        # hex
        if s.startswith('#'):
            return s
        return s
    return 'black'


def generate_qrcode(
    data,
    box_size=10,
    border=4,
    error_correct='M',
    fill_color='black',
    back_color='white',
    logo_path=None,
    logo_size_ratio=0.2,
    output_size=None,
):
    """
    生成二维码图片。

    参数:
        data: str, 要编码的文本/URL
        box_size: int, 每个方块像素大小（默认 10）
        border: int, 边框宽度（默认 4，最小 4 是规范要求）
        error_correct: str, 容错级别 L/M/Q/H（默认 M）
        fill_color: 颜色名/hex/RGB，前景色（默认 black）
        back_color: 颜色名/hex/RGB，背景色（默认 white）
        logo_path: str|None, Logo 图片路径，嵌入到二维码中心
        logo_size_ratio: float, Logo 占二维码整体尺寸的比例（默认 0.2）
        output_size: tuple(int,int)|None, 输出图片的目标尺寸（宽,高），None 则按 box_size 自然输出

    返回:
        PIL.Image 对象（RGB 模式）
    """
    if not data:
        raise ValueError('二维码内容不能为空')

    ec = _ERROR_CORRECT_MAP.get(str(error_correct).upper(), ERROR_CORRECT_M)

    qr = qrcode.QRCode(
        version=None,                # 自动版本
        error_correction=ec,
        box_size=int(box_size),
        border=int(border),
    )
    qr.add_data(data)
    qr.make(fit=True)

    img = qr.make_image(fill_color=_parse_color(fill_color), back_color=_parse_color(back_color))
    img = img.convert('RGB')

    # 嵌入 Logo
    if logo_path and os.path.exists(logo_path):
        try:
            logo = Image.open(logo_path).convert('RGBA')
        except Exception:
            logo = None

        if logo is not None:
            qr_w, qr_h = img.size
            logo_w = max(1, int(qr_w * float(logo_size_ratio)))
            logo_h = max(1, int(qr_h * float(logo_size_ratio)))
            logo = logo.resize((logo_w, logo_h), Image.LANCZOS)

            # 在 Logo 周围加白色边距（提升识别率）
            padding = max(4, int(min(logo_w, logo_h) * 0.1))
            canvas = Image.new('RGB', (logo_w + padding * 2, logo_h + padding * 2), 'white')
            # 用 alpha 合成
            canvas_rgba = canvas.convert('RGBA')
            canvas_rgba.alpha_composite(logo, (padding, padding))
            canvas = canvas_rgba.convert('RGB')

            pos = ((qr_w - canvas.size[0]) // 2, (qr_h - canvas.size[1]) // 2)
            img.paste(canvas, pos)

    # 缩放到目标尺寸
    if output_size and isinstance(output_size, (tuple, list)) and len(output_size) == 2:
        target_w, target_h = int(output_size[0]), int(output_size[1])
        if target_w > 0 and target_h > 0:
            img = img.resize((target_w, target_h), Image.NEAREST)  # 二维码用最近邻避免模糊

    return img


def image_to_bytes(img, fmt='png'):
    """PIL.Image -> BytesIO"""
    buf = io.BytesIO()
    fmt_upper = fmt.upper() if fmt.lower() != 'jpeg' else 'JPEG'
    img.save(buf, format=fmt_upper)
    buf.seek(0)
    return buf
