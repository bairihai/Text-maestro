# CLI 版本制作计划

## 概述
为 Text-maestro 制作 Python CLI 版本，直接复用 gradio-app/ 下已有的功能函数，用 argparse 构建命令行界面。用户取消选择，按最优方案执行：Python CLI + 全部功能。

## 当前状态
- gradio-app/ 下已有完整的 Python 功能模块：utils.py、utils_folder.py、utils_jieba.py、utils_wordcloud.py、utils_social_media.py
- 依赖：jieba、wordcloud、pandas、opencc（见 requirements.txt）
- 项目无任何 CLI 代码，需从零搭建
- 根目录非 Python 包，gradio-app/ 是独立 Python 项目

## 方案决策
- **技术栈**：Python + argparse（标准库，无需额外依赖）
- **目录**：在项目根目录新建 `cli/` 目录
- **复用策略**：直接 import gradio-app 下的模块（通过 sys.path 或相对导入）
- **功能范围**：全部功能，按子命令组织

## 目录结构
```
Text-maestro（文本分析工具箱）/
├── cli/
│   ├── __init__.py
│   ├── main.py              # CLI 入口，argparse 子命令注册
│   └── README.md            # 不创建，用户未要求
├── gradio-app/              # 已有模块，被 import 复用
│   ├── utils.py
│   ├── utils_folder.py
│   ├── utils_jieba.py
│   ├── utils_wordcloud.py
│   └── utils_social_media.py
```

## 子命令设计

### 1. 文本工具 `text`
```bash
# Unicode 转换
python cli/main.py text unicode --to chinese "\u4f60\u597d"
python cli/main.py text unicode --to unicode "你好"

# 文本比较
python cli/main.py text diff "文本1" "文本2"
python cli/main.py text diff --file1 a.txt --file2 b.txt

# 字数统计
python cli/main.py text count "待统计的文本"
python cli/main.py text count --file input.txt

# 简繁转换
python cli/main.py text s2t "简体中文"
python cli/main.py text t2s "繁體中文"

# 正则筛选
python cli/main.py text filter --pattern ".*\.txt$" --file-list files.txt
```

### 2. 颜色工具 `color`
```bash
python cli/main.py color rgb2hex 255 128 0
python cli/main.py color hex2rgb FF8000
```

### 3. 时间戳 `timestamp`
```bash
python cli/main.py timestamp now                    # 当前时间戳（秒）
python cli/main.py timestamp now --ms               # 当前时间戳（毫秒）
python cli/main.py timestamp to-date 1700000000     # 时间戳→日期
python cli/main.py timestamp to-date 1700000000000 --unit auto --fmt "%Y-%m-%d %H:%M:%S"
python cli/main.py timestamp to-ts "2023-11-15 06:13:20" --unit seconds
```

### 4. Markdown 大纲 `markdown`
```bash
python cli/main.py markdown outline --file article.md
python cli/main.py markdown merge outline1.txt outline2.txt
python cli/main.py markdown reorganize --file article.md --outline new_outline.txt
```

### 5. 文件操作 `file`
```bash
python cli/main.py file read D:\path\to\file.txt
python cli/main.py file tree D:\projects --depth 3 --style tree
python cli/main.py file tree D:\projects --depth 3 --style tree --stats
python cli/main.py file merge-txt file1.txt file2.txt file3.txt -o merged.txt
python cli/main.py file merge-csv file1.csv file2.csv -o merged.csv
python cli/main.py file csv-preview data.csv
```

### 6. 词频与词云 `words`
```bash
# 词频统计（需要 jieba）
python cli/main.py words freq --file input.txt --stopwords "我,的,是" --dict "峻影,柔道"
# 词云生成（需要 wordcloud）
python cli/main.py words cloud --freq freq.json --font "C:\Windows\Fonts\simhei.ttf" -o cloud.png
python cli/main.py words cloud --freq freq.json --font simhei.ttf --max-font 100 --min-font 20
```

### 7. 社交媒体分析 `social`
```bash
# Twitch 弹幕分析
python cli/main.py social twitch --file chat.json
python cli/main.py social twitch --text '{"comments":[...]}'

# Discord 聊天记录分析
python cli/main.py social discord extract --file chat.csv --user "surtr01234"
python cli/main.py social discord frequency --file chat.csv --granularity 360
```

## 实现细节

### main.py 结构
```python
#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Text-maestro CLI - 文本分析工具箱命令行版本"""

import sys
import os
import argparse

# 将 gradio-app 加入 sys.path，以便 import 已有模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'gradio-app'))

import utils
import utils_folder
import utils_jieba
import utils_wordcloud
import utils_social_media

def main():
    parser = argparse.ArgumentParser(prog='text-maestro', description='文本分析工具箱 CLI')
    subparsers = parser.add_subparsers(dest='command', help='可用命令')
    
    # 注册各子命令...
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
    
    # 分发到对应处理函数
    args.func(args)

if __name__ == '__main__':
    main()
```

### 复用映射
| CLI 子命令 | 复用的 Gradio 函数 | 文件 |
|-----------|------------------|------|
| text unicode | utils.unicode_to_chinese / chinese_to_unicode | utils.py |
| text diff | utils.diff_texts | utils.py |
| text count | utils_jieba.count_chars_and_words | utils_jieba.py |
| text s2t | utils.simplify_to_traditional | utils.py |
| text t2s | utils.traditional_to_simplify | utils.py |
| text filter | utils.filter_files | utils.py |
| color rgb2hex | utils.rgb_to_hex | utils.py |
| color hex2rgb | utils.hex_to_rgb | utils.py |
| timestamp now | utils.get_current_timestamp | utils.py |
| timestamp to-date | utils.timestamp_to_date | utils.py |
| timestamp to-ts | utils.date_to_timestamp | utils.py |
| markdown outline | utils.extract_markdown_outline | utils.py |
| markdown merge | utils.merge_two_docs | utils.py |
| markdown reorganize | utils.reorganize_article | utils.py |
| file read | utils.read_file_from_path | utils.py |
| file tree | utils_folder.generate_tree / generate_tree_and_stats | utils_folder.py |
| file merge-txt | utils.concatenate_text_files | utils.py |
| file merge-csv | utils.concatenate_csv_files | utils.py |
| file csv-preview | utils.preview_csv | utils.py |
| words freq | utils_jieba.word_frequency | utils_jieba.py |
| words cloud | utils_wordcloud.generate_wordcloud | utils_wordcloud.py |
| social twitch | utils_social_media.analyze_twitch_chat / _from_text | utils_social_media.py |
| social discord extract | utils.filter_by_username | utils.py |
| social discord frequency | utils.count_message_frequency | utils.py |

## 假设与决策
1. Python CLI 直接复用 gradio-app 模块，零逻辑重写
2. 通过 sys.path.insert 将 gradio-app 加入搜索路径
3. 用 argparse 标准库，不引入额外 CLI 框架依赖
4. 所有输出直接 print 到 stdout，错误输出到 stderr
5. 文件类操作支持 --file 从文件读取参数（避免命令行长度限制）
6. 词云输出为 PNG 文件（-o 参数指定路径），而非 base64
7. 不创建 README.md（用户未要求）

## 验证步骤
1. `python cli/main.py --help` 显示所有子命令
2. `python cli/main.py text unicode --to unicode "你好"` 输出 `\u4F60\u597D`
3. `python cli/main.py timestamp now` 输出当前时间戳
4. `python cli/main.py color rgb2hex 255 128 0` 输出 `FF8000`
5. `python cli/main.py text count "你好世界 Hello"` 输出字符数和词数
6. 测试需要 jieba 的词频统计功能
