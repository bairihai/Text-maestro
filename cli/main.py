#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Text-maestro CLI - 文本分析工具箱命令行版本
直接复用 gradio-app/ 下的功能模块，零逻辑重写
"""

import sys
import os
import argparse
import json
import platform
import threading
import time

# 将 gradio-app 加入 sys.path，以便 import 已有模块
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'gradio-app'))

import utils
import utils_folder
import utils_jieba
import utils_wordcloud
import utils_social_media


# ==================== 输出工具函数 ====================

# 检测终端是否支持颜色
def _supports_color():
    if platform.system() == 'Windows':
        return sys.stdout.isatty()
    return hasattr(sys.stdout, 'isatty') and sys.stdout.isatty()

_COLOR = _supports_color()

GREEN = '\033[92m' if _COLOR else ''
RED = '\033[91m' if _COLOR else ''
YELLOW = '\033[93m' if _COLOR else ''
BLUE = '\033[94m' if _COLOR else ''
BOLD = '\033[1m' if _COLOR else ''
RESET = '\033[0m' if _COLOR else ''


def print_success(msg):
    """绿色输出"""
    print(f'{GREEN}{msg}{RESET}')


def print_error(msg):
    """红色输出到 stderr"""
    print(f'{RED}错误：{msg}{RESET}', file=sys.stderr)


def print_warning(msg):
    """黄色输出"""
    print(f'{YELLOW}警告：{msg}{RESET}')


def print_info(msg):
    """蓝色输出"""
    print(f'{BLUE}{msg}{RESET}')


def print_title(msg):
    """加粗标题"""
    print(f'{BOLD}{msg}{RESET}')


def print_table(headers, rows):
    """对齐表格输出"""
    # 计算每列最大宽度
    col_widths = []
    for i, h in enumerate(headers):
        max_w = len(str(h))
        for row in rows:
            if i < len(row):
                max_w = max(max_w, len(str(row[i])))
        col_widths.append(max_w)
    # 打印表头
    header_line = ' | '.join(str(h).ljust(col_widths[i]) for i, h in enumerate(headers))
    print(f'{BOLD}{header_line}{RESET}')
    print('-+-'.join('-' * w for w in col_widths))
    # 打印行
    for row in rows:
        line = ' | '.join(str(row[i]).ljust(col_widths[i]) if i < len(row) else ''.ljust(col_widths[i]) for i in range(len(headers)))
        print(line)


class Spinner:
    """旋转动画"""
    def __init__(self, msg=''):
        self.msg = msg
        self._running = False
        self._thread = None
        self._chars = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'

    def start(self):
        self._running = True
        self._thread = threading.Thread(target=self._spin, daemon=True)
        self._thread.start()

    def _spin(self):
        i = 0
        while self._running:
            sys.stdout.write(f'\r{BLUE}{self._chars[i % len(self._chars)]}{RESET} {self.msg}')
            sys.stdout.flush()
            time.sleep(0.1)
            i += 1

    def stop(self, success_msg=None):
        self._running = False
        if self._thread:
            self._thread.join()
        sys.stdout.write('\r' + ' ' * (len(self.msg) + 10) + '\r')
        sys.stdout.flush()
        if success_msg:
            print_success(success_msg)


def read_input(arg_value, file_arg=None):
    """优先从参数读取，无参数时从 stdin 读取"""
    if arg_value:
        return arg_value
    if file_arg:
        return read_text_file(file_arg)
    if not sys.stdin.isatty():
        return sys.stdin.read().strip()
    return ''


# ==================== 辅助函数 ====================

def read_text_file(path):
    """读取文件内容，返回字符串"""
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()


def print_result(result):
    """打印结果到 stdout"""
    if isinstance(result, list):
        for item in result:
            print(item)
    elif isinstance(result, tuple):
        for item in result:
            print(item)
    elif isinstance(result, dict):
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(result)


# ==================== text 子命令 ====================

def setup_text_parser(subparsers):
    parser = subparsers.add_parser('text', help='文本工具（Unicode/比较/统计/简繁/筛选）',
        epilog='''
示例:
  python cli/main.py text unicode --to unicode "你好"
  python cli/main.py text count "你好世界"
  python cli/main.py text s2t "简体中文"
  echo "文本" | python cli/main.py text count
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    text_sub = parser.add_subparsers(dest='text_command', help='文本子命令')

    # text unicode
    p_unicode = text_sub.add_parser('unicode', help='Unicode 与中文双向转换',
        epilog='示例: python cli/main.py text unicode --to unicode "你好"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_unicode.add_argument('input', nargs='?', help='输入文本')
    p_unicode.add_argument('--to', choices=['chinese', 'unicode'], default='chinese', help='转换方向（默认：chinese）')
    p_unicode.set_defaults(func=cmd_text_unicode)

    # text diff
    p_diff = text_sub.add_parser('diff', help='文本比较',
        epilog='示例: python cli/main.py text diff "文本一" "文本二"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_diff.add_argument('text1', nargs='?', help='第一段文本（如不提供则用 --file1）')
    p_diff.add_argument('text2', nargs='?', help='第二段文本（如不提供则用 --file2）')
    p_diff.add_argument('--file1', help='从文件读取第一段文本')
    p_diff.add_argument('--file2', help='从文件读取第二段文本')
    p_diff.set_defaults(func=cmd_text_diff)

    # text count
    p_count = text_sub.add_parser('count', help='字数词数统计',
        epilog='示例: python cli/main.py text count "你好世界 Hello"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_count.add_argument('input', nargs='?', help='输入文本')
    p_count.add_argument('--file', help='从文件读取文本')
    p_count.set_defaults(func=cmd_text_count)

    # text s2t
    p_s2t = text_sub.add_parser('s2t', help='简体转繁体',
        epilog='示例: python cli/main.py text s2t "简体中文"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_s2t.add_argument('input', nargs='?', help='输入简体中文')
    p_s2t.add_argument('--file', help='从文件读取')
    p_s2t.set_defaults(func=cmd_text_s2t)

    # text t2s
    p_t2s = text_sub.add_parser('t2s', help='繁体转简体',
        epilog='示例: python cli/main.py text t2s "繁體中文"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_t2s.add_argument('input', nargs='?', help='输入繁体中文')
    p_t2s.add_argument('--file', help='从文件读取')
    p_t2s.set_defaults(func=cmd_text_t2s)

    # text filter
    p_filter = text_sub.add_parser('filter', help='正则筛选文件列表',
        epilog='示例: python cli/main.py text filter --pattern "\\.txt$" --file-list files.txt',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_filter.add_argument('--pattern', required=True, help='正则表达式')
    p_filter.add_argument('--file-list', help='文件列表（每行一个路径）')
    p_filter.add_argument('--input', help='直接输入文件列表文本')
    p_filter.set_defaults(func=cmd_text_filter)


def cmd_text_unicode(args):
    text = read_input(args.input)
    if not text:
        print_error('请提供输入文本')
        sys.exit(1)
    if args.to == 'chinese':
        result = utils.unicode_to_chinese(text)
    else:
        result = utils.chinese_to_unicode(text)
    print(result)


def cmd_text_diff(args):
    text1 = args.text1 or (read_text_file(args.file1) if args.file1 else '')
    text2 = args.text2 or (read_text_file(args.file2) if args.file2 else '')
    if not text1 or not text2:
        print_error('请提供两段文本或两个文件')
        sys.exit(1)
    print_title('文本比较结果')
    result = utils.diff_texts(text1, text2)
    for token, tag in result:
        if tag == '-':
            print(f'{RED}{token}{RESET}', end='')
        elif tag == '+':
            print(f'{GREEN}{token}{RESET}', end='')
        else:
            print(token, end='')
    print()


def cmd_text_count(args):
    text = read_input(args.input, args.file)
    if not text:
        print_error('请提供文本或文件')
        sys.exit(1)
    chars, words = utils_jieba.count_chars_and_words(text)
    print_title('字数统计')
    print_info(f'总字符数: {chars}')
    print_info(f'总词数: {words}')


def cmd_text_s2t(args):
    text = read_input(args.input, args.file)
    if not text:
        print_error('请提供文本或文件')
        sys.exit(1)
    print(utils.simplify_to_traditional(text))


def cmd_text_t2s(args):
    text = read_input(args.input, args.file)
    if not text:
        print_error('请提供文本或文件')
        sys.exit(1)
    print(utils.traditional_to_simplify(text))


def cmd_text_filter(args):
    file_list = read_input(args.input, args.file_list)
    if not file_list:
        print_error('请提供文件列表（--file-list 或 --input）')
        sys.exit(1)
    result = utils.filter_files(file_list, args.pattern)
    print(result)


# ==================== color 子命令 ====================

def setup_color_parser(subparsers):
    parser = subparsers.add_parser('color', help='颜色码转换工具',
        epilog='''
示例:
  python cli/main.py color rgb2hex 255 128 0
  python cli/main.py color hex2rgb FF8000
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    color_sub = parser.add_subparsers(dest='color_command', help='颜色子命令')

    p_rgb2hex = color_sub.add_parser('rgb2hex', help='RGB 转 Hex',
        epilog='示例: python cli/main.py color rgb2hex 255 128 0',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_rgb2hex.add_argument('r', type=int, help='R (0-255)')
    p_rgb2hex.add_argument('g', type=int, help='G (0-255)')
    p_rgb2hex.add_argument('b', type=int, help='B (0-255)')
    p_rgb2hex.set_defaults(func=cmd_color_rgb2hex)

    p_hex2rgb = color_sub.add_parser('hex2rgb', help='Hex 转 RGB',
        epilog='示例: python cli/main.py color hex2rgb FF8000',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_hex2rgb.add_argument('hex', help='十六进制颜色码（如 FF8000 或 #FF8000）')
    p_hex2rgb.set_defaults(func=cmd_color_hex2rgb)


def cmd_color_rgb2hex(args):
    result = utils.rgb_to_hex(args.r, args.g, args.b)
    print_success(f'#{result}')


def cmd_color_hex2rgb(args):
    result = utils.hex_to_rgb(args.hex)
    print_success(f'R: {result[0]}, G: {result[1]}, B: {result[2]}')


# ==================== timestamp 子命令 ====================

def setup_timestamp_parser(subparsers):
    parser = subparsers.add_parser('timestamp', help='时间戳转换工具',
        epilog='''
示例:
  python cli/main.py timestamp now
  python cli/main.py timestamp now --ms
  python cli/main.py timestamp to-date 1700000000
  python cli/main.py timestamp to-ts "2023-11-15 12:00:00"
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    ts_sub = parser.add_subparsers(dest='ts_command', help='时间戳子命令')

    p_now = ts_sub.add_parser('now', help='获取当前时间戳',
        epilog='示例: python cli/main.py timestamp now --ms',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_now.add_argument('--ms', action='store_true', help='毫秒（13位）')
    p_now.set_defaults(func=cmd_timestamp_now)

    p_to_date = ts_sub.add_parser('to-date', help='时间戳 → 日期',
        epilog='示例: python cli/main.py timestamp to-date 1700000000',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_to_date.add_argument('timestamp', help='时间戳')
    p_to_date.add_argument('--unit', choices=['auto', 'seconds', 'milliseconds'], default='auto', help='单位（默认 auto）')
    p_to_date.add_argument('--tz', choices=['local', 'utc'], default='local', help='时区（默认 local）')
    p_to_date.add_argument('--fmt', default='%Y-%m-%d %H:%M:%S', help='输出格式（strftime 风格）')
    p_to_date.set_defaults(func=cmd_timestamp_to_date)

    p_to_ts = ts_sub.add_parser('to-ts', help='日期 → 时间戳',
        epilog='示例: python cli/main.py timestamp to-ts "2023-11-15 12:00:00"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_to_ts.add_argument('date', help='日期字符串')
    p_to_ts.add_argument('--unit', choices=['seconds', 'milliseconds'], default='seconds', help='输出单位（默认 seconds）')
    p_to_ts.add_argument('--tz', choices=['local', 'utc'], default='local', help='时区（默认 local）')
    p_to_ts.add_argument('--fmt', default='%Y-%m-%d %H:%M:%S', help='输入格式（strftime 风格）')
    p_to_ts.set_defaults(func=cmd_timestamp_to_ts)


def cmd_timestamp_now(args):
    unit = 'milliseconds' if args.ms else 'seconds'
    print_success(utils.get_current_timestamp(unit))


def cmd_timestamp_to_date(args):
    result = utils.timestamp_to_date(args.timestamp, args.unit, args.tz, args.fmt)
    print_success(result)


def cmd_timestamp_to_ts(args):
    result = utils.date_to_timestamp(args.date, args.unit, args.tz, args.fmt)
    print_success(result)


# ==================== markdown 子命令 ====================

def setup_markdown_parser(subparsers):
    parser = subparsers.add_parser('markdown', help='Markdown 大纲工具',
        epilog='''
示例:
  python cli/main.py markdown outline --file article.md
  python cli/main.py markdown merge outline1.md outline2.md
  python cli/main.py markdown reorganize --file article.md --outline new_outline.md
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    md_sub = parser.add_subparsers(dest='md_command', help='Markdown 子命令')

    p_outline = md_sub.add_parser('outline', help='提取 Markdown 大纲',
        epilog='示例: python cli/main.py markdown outline --file article.md',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_outline.add_argument('--file', help='Markdown 文件路径')
    p_outline.add_argument('--input', help='直接输入 Markdown 文本')
    p_outline.set_defaults(func=cmd_markdown_outline)

    p_merge = md_sub.add_parser('merge', help='合并两个大纲',
        epilog='示例: python cli/main.py markdown merge outline1.md outline2.md',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_merge.add_argument('outline1', help='大纲1文件路径')
    p_merge.add_argument('outline2', help='大纲2文件路径')
    p_merge.set_defaults(func=cmd_markdown_merge)

    p_reorganize = md_sub.add_parser('reorganize', help='按新大纲重组文章',
        epilog='示例: python cli/main.py markdown reorganize --file article.md --outline new_outline.md',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_reorganize.add_argument('--file', required=True, help='原文 Markdown 文件路径')
    p_reorganize.add_argument('--outline', required=True, help='新大纲文件路径')
    p_reorganize.set_defaults(func=cmd_markdown_reorganize)


def cmd_markdown_outline(args):
    text = args.input or (read_text_file(args.file) if args.file else '')
    if not text:
        print_error('请提供 --file 或 --input')
        sys.exit(1)
    print(utils.extract_markdown_outline(text))


def cmd_markdown_merge(args):
    doc1 = read_text_file(args.outline1)
    doc2 = read_text_file(args.outline2)
    print(utils.merge_two_docs(doc1, doc2))


def cmd_markdown_reorganize(args):
    original = read_text_file(args.file)
    outline = read_text_file(args.outline)
    print(utils.reorganize_article(original, outline))


# ==================== file 子命令 ====================

def setup_file_parser(subparsers):
    parser = subparsers.add_parser('file', help='文件操作工具',
        epilog='''
示例:
  python cli/main.py file read D:\\projects\\README.md
  python cli/main.py file tree D:\\projects --depth 3 --stats
  python cli/main.py file merge-txt a.txt b.txt -o merged.txt
  python cli/main.py file csv-preview data.csv
  python cli/main.py file weekly --file-list files.txt --target D:\\sorted --year 2025
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    file_sub = parser.add_subparsers(dest='file_command', help='文件子命令')

    p_read = file_sub.add_parser('read', help='读取文件内容',
        epilog='示例: python cli/main.py file read README.md',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_read.add_argument('path', help='文件路径')
    p_read.set_defaults(func=cmd_file_read)

    p_tree = file_sub.add_parser('tree', help='生成目录树',
        epilog='示例: python cli/main.py file tree D:\\projects --depth 3 --stats',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_tree.add_argument('path', help='目录路径')
    p_tree.add_argument('--depth', type=int, default=3, help='最大深度（默认 3）')
    p_tree.add_argument('--style', choices=['tree', 'ls'], default='tree', help='输出样式（默认 tree）')
    p_tree.add_argument('--stats', action='store_true', help='附加目录大小和磁盘统计')
    p_tree.set_defaults(func=cmd_file_tree)

    p_merge_txt = file_sub.add_parser('merge-txt', help='拼接多个文本文件',
        epilog='示例: python cli/main.py file merge-txt a.txt b.txt -o merged.txt',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_merge_txt.add_argument('files', nargs='+', help='文件路径列表')
    p_merge_txt.add_argument('-o', '--output', help='输出到文件（不指定则输出到 stdout）')
    p_merge_txt.set_defaults(func=cmd_file_merge_txt)

    p_merge_csv = file_sub.add_parser('merge-csv', help='拼接多个 CSV 文件',
        epilog='示例: python cli/main.py file merge-csv a.csv b.csv -o merged.csv',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_merge_csv.add_argument('files', nargs='+', help='CSV 文件路径列表')
    p_merge_csv.add_argument('-o', '--output', help='输出到文件')
    p_merge_csv.set_defaults(func=cmd_file_merge_csv)

    p_csv_preview = file_sub.add_parser('csv-preview', help='预览 CSV 文件',
        epilog='示例: python cli/main.py file csv-preview data.csv',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_csv_preview.add_argument('path', help='CSV 文件路径')
    p_csv_preview.set_defaults(func=cmd_file_csv_preview)

    # file weekly 子命令：周回文件夹管理
    p_weekly = file_sub.add_parser('weekly', help='周回文件夹管理（生成整理 BAT）',
        epilog='''
示例:
  python cli/main.py file weekly --file-list files.txt --target D:\\sorted --year 2025
  python cli/main.py file weekly --file-list files.txt --target D:\\sorted --auto-create -o organize.bat
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    p_weekly.add_argument('--file-list', help='待整理文件列表（每行一个路径）')
    p_weekly.add_argument('--input', help='直接输入文件列表文本')
    p_weekly.add_argument('--target', required=True, help='目标文件夹路径')
    p_weekly.add_argument('--year', type=int, default=None, help='年份（默认当前年）')
    p_weekly.add_argument('--time-format', default='MM.DD-HHmm a', help='文件名时间格式（默认 MM.DD-HHmm a）')
    p_weekly.add_argument('--auto-create', action='store_true', help='自动创建不存在的周回文件夹')
    p_weekly.add_argument('-o', '--output', help='输出到文件')
    p_weekly.set_defaults(func=cmd_file_weekly)


def cmd_file_read(args):
    # 直接用 read_text_file 读取，让异常传播到 main() 的 try/except
    result = read_text_file(args.path)
    print(result)


def cmd_file_tree(args):
    spinner = Spinner('生成目录树中...')
    spinner.start()
    try:
        if args.stats:
            result = utils_folder.generate_tree_and_stats(args.path, style=args.style, max_depth=args.depth)
        else:
            result = utils_folder.generate_tree(args.path, style=args.style, max_depth=args.depth)
    finally:
        spinner.stop()
    print(result)


def cmd_file_merge_txt(args):
    file_list = '\n'.join(args.files)
    result = utils.concatenate_text_files(file_list)
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print_success(f'已保存到 {args.output}')
    else:
        print(result)


def cmd_file_merge_csv(args):
    file_list = '\n'.join(args.files)
    result = utils.concatenate_csv_files(file_list)
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print_success(f'已保存到 {args.output}')
    else:
        print(result)


def cmd_file_csv_preview(args):
    result = utils.preview_csv(args.path)
    if isinstance(result, str):
        print(result)
    else:
        # 用表格形式输出 CSV 预览
        if not result:
            print_warning('CSV 文件为空')
            return
        headers = result[0]
        rows = result[1:]
        print_table(headers, rows)


def cmd_file_weekly(args):
    import datetime
    file_list = read_input(args.input, args.file_list)
    if not file_list:
        print_error('请提供文件列表（--file-list 或 --input）')
        sys.exit(1)
    year = args.year or datetime.datetime.now().year
    result = utils_folder.organize_files_by_week(file_list, args.time_format, args.target, year, args.auto_create)
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print_success(f'已保存到 {args.output}')
    else:
        print(result)


# ==================== words 子命令 ====================

def setup_words_parser(subparsers):
    parser = subparsers.add_parser('words', help='词频统计与词云生成',
        epilog='''
示例:
  python cli/main.py words freq --file input.txt --stopwords "我,的,是"
  python cli/main.py words freq --file input.txt -o freq.json
  python cli/main.py words cloud --freq freq.json --font simhei.ttf -o cloud.png
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    words_sub = parser.add_subparsers(dest='words_command', help='词频子命令')

    p_freq = words_sub.add_parser('freq', help='词频统计（需要 jieba）',
        epilog='示例: python cli/main.py words freq --file input.txt --stopwords "我,的,是"',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_freq.add_argument('--file', help='输入文本文件')
    p_freq.add_argument('--input', help='直接输入文本')
    p_freq.add_argument('--stopwords', default='我,的,和,有,不,是', help='停用词（逗号分隔）')
    p_freq.add_argument('--dict', default='', help='自定义分词词典（逗号分隔）')
    p_freq.add_argument('-o', '--output', help='输出到 JSON 文件')
    p_freq.set_defaults(func=cmd_words_freq)

    p_cloud = words_sub.add_parser('cloud', help='词云图生成（需要 wordcloud）',
        epilog='示例: python cli/main.py words cloud --freq freq.json --font simhei.ttf -o cloud.png',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_cloud.add_argument('--freq', required=True, help='频率表 JSON 文件路径')
    p_cloud.add_argument('--font', required=True, help='字体文件路径')
    p_cloud.add_argument('--max-font', type=int, default=100, help='最大字号（默认 100）')
    p_cloud.add_argument('--min-font', type=int, default=20, help='最小字号（默认 20）')
    p_cloud.add_argument('--margin', type=int, default=2, help='词间距（默认 2）')
    p_cloud.add_argument('--prefer-horizontal', type=float, default=0.9, help='横向排列概率（默认 0.9）')
    p_cloud.add_argument('-o', '--output', default='wordcloud.png', help='输出图片路径（默认 wordcloud.png）')
    p_cloud.set_defaults(func=cmd_words_cloud)


def cmd_words_freq(args):
    text = read_input(args.input, args.file)
    if not text:
        print_error('请提供 --file 或 --input')
        sys.exit(1)
    result = utils_jieba.word_frequency(text, args.stopwords, args.dict)
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print_success(f'已保存到 {args.output}')
    else:
        # 用表格输出词频
        print_title('词频统计')
        rows = [[word, count] for word, count in sorted(result.items(), key=lambda x: x[1], reverse=True)]
        print_table(['词语', '次数'], rows)


def cmd_words_cloud(args):
    spinner = Spinner('生成词云图中...')
    spinner.start()
    try:
        # 读取频率表 JSON
        with open(args.freq, 'r', encoding='utf-8') as f:
            word_freq = json.load(f)
        # 生成词云
        img = utils_wordcloud.generate_wordcloud(
            word_freq, args.font,
            args.max_font, args.min_font, args.margin, args.prefer_horizontal
        )
        img.save(args.output)
    finally:
        spinner.stop()
    print_success(f'词云图已保存到 {args.output}')


# ==================== social 子命令 ====================

def setup_social_parser(subparsers):
    parser = subparsers.add_parser('social', help='社交媒体分析工具',
        epilog='''
示例:
  python cli/main.py social twitch --file chat.json
  python cli/main.py social discord extract --file chat.csv --user alice
  python cli/main.py social discord frequency --file chat.csv --granularity 360
  python cli/main.py social discord time-slot --file channel_freq.txt
  python cli/main.py social discord preference --user-file user.txt --channel-file channel.txt
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    social_sub = parser.add_subparsers(dest='social_command', help='社交媒体子命令')

    p_twitch = social_sub.add_parser('twitch', help='Twitch 弹幕分析',
        epilog='示例: python cli/main.py social twitch --file chat.json',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_twitch.add_argument('--file', help='JSON 文件路径')
    p_twitch.add_argument('--text', help='直接输入 JSON 文本')
    p_twitch.set_defaults(func=cmd_social_twitch)

    p_discord = social_sub.add_parser('discord', help='Discord 聊天记录分析',
        epilog='''
示例:
  python cli/main.py social discord extract --file chat.csv --user alice
  python cli/main.py social discord frequency --file chat.csv
  python cli/main.py social discord time-slot --file channel_freq.txt
  python cli/main.py social discord preference --user-file user.txt --channel-file channel.txt
''', formatter_class=argparse.RawDescriptionHelpFormatter)
    discord_sub = p_discord.add_subparsers(dest='discord_command', help='Discord 子命令')

    p_extract = discord_sub.add_parser('extract', help='按用户名提取发言',
        epilog='示例: python cli/main.py social discord extract --file chat.csv --user alice',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_extract.add_argument('--file', required=True, help='CSV 文件路径')
    p_extract.add_argument('--user', required=True, help='用户名')
    p_extract.add_argument('-o', '--output', help='输出到文件')
    p_extract.set_defaults(func=cmd_social_discord_extract)

    p_frequency = discord_sub.add_parser('frequency', help='发言频率统计',
        epilog='示例: python cli/main.py social discord frequency --file chat.csv --granularity 360',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_frequency.add_argument('--file', required=True, help='CSV 文件路径')
    p_frequency.add_argument('--granularity', type=int, default=360, help='时间颗粒度（分钟，默认 360）')
    p_frequency.set_defaults(func=cmd_social_discord_frequency)

    # discord time-slot 子命令：频道时段频率统计
    p_time_slot = discord_sub.add_parser('time-slot', help='频道时段频率统计',
        epilog='示例: python cli/main.py social discord time-slot --file channel_freq.txt',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_time_slot.add_argument('--file', help='频道时频数据文件')
    p_time_slot.add_argument('--input', help='直接输入文本')
    p_time_slot.set_defaults(func=cmd_social_discord_time_slot)

    # discord preference 子命令：用户偏好度分析
    p_preference = discord_sub.add_parser('preference', help='用户偏好度分析',
        epilog='示例: python cli/main.py social discord preference --user-file user.txt --channel-file channel.txt',
        formatter_class=argparse.RawDescriptionHelpFormatter)
    p_preference.add_argument('--user-file', required=True, help='用户发言时频数据文件')
    p_preference.add_argument('--channel-file', required=True, help='整个频道的发言时频数据文件')
    p_preference.set_defaults(func=cmd_social_discord_preference)


def cmd_social_twitch(args):
    if args.file:
        result = utils_social_media.analyze_twitch_chat(args.file)
    elif args.text:
        result = utils_social_media.analyze_twitch_chat_from_text(args.text)
    else:
        print_error('请提供 --file 或 --text')
        sys.exit(1)
    print(result)


def cmd_social_discord_extract(args):
    csv_text = read_text_file(args.file)
    result = utils.filter_by_username(csv_text, args.user)
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(result)
        print_success(f'已保存到 {args.output}')
    else:
        print(result)


def cmd_social_discord_frequency(args):
    csv_text = read_text_file(args.file)
    result = utils.count_message_frequency(csv_text, args.granularity)
    print(result)


def cmd_social_discord_time_slot(args):
    text = read_input(args.input, args.file)
    if not text:
        print_error('请提供数据（--file 或 --input）')
        sys.exit(1)
    result = utils.calculate_time_slot_frequency(text)
    print(result)


def cmd_social_discord_preference(args):
    user_text = read_text_file(args.user_file)
    channel_text = read_text_file(args.channel_file)
    result = utils.calculate_user_preference(user_text, channel_text)
    print(result)


# ==================== 主入口 ====================

def main():
    parser = argparse.ArgumentParser(
        prog='text-maestro',
        description=f'''
{BOLD}╔══════════════════════════════════════╗
║     Text-maestro 文本分析工具箱 CLI    ║
║     v1.0.0  by 云都官能团@白日海       ║
╚══════════════════════════════════════╝{RESET}
''',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  python cli/main.py text unicode --to unicode "你好"
  python cli/main.py timestamp now
  python cli/main.py color rgb2hex 255 128 0
  python cli/main.py text count "你好世界 Hello"
  python cli/main.py file tree D:\\projects --depth 3 --stats
  python cli/main.py words freq --file input.txt --stopwords "我,的,是"
  python cli/main.py social twitch --file chat.json
"""
    )
    parser.add_argument('-v', '--version', action='version', version=f'{BOLD}Text-maestro CLI{RESET} v1.0.0')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')

    setup_text_parser(subparsers)
    setup_color_parser(subparsers)
    setup_timestamp_parser(subparsers)
    setup_markdown_parser(subparsers)
    setup_file_parser(subparsers)
    setup_words_parser(subparsers)
    setup_social_parser(subparsers)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if hasattr(args, 'func'):
        try:
            args.func(args)
        except FileNotFoundError as e:
            print_error(f'文件不存在: {e.filename}')
            sys.exit(1)
        except Exception as e:
            print_error(str(e))
            sys.exit(1)
    else:
        # 只输入了主命令但没输入子命令
        parser.print_help()


if __name__ == '__main__':
    main()
