from difflib import Differ
import re

import csv
import pandas as pd
from io import StringIO

# utils.py 基础功能

# 功能：打招呼
def greet(name):
    return "Hello " + name + "!"

# 功能：unicode双向转换
def unicode_to_chinese(text):
    try:
        return text.encode('utf-8').decode('unicode-escape')
    except Exception as e:
        return str(e)

def chinese_to_unicode(text):
    try:
        return text.encode('unicode-escape').decode('utf-8')
    except Exception as e:
        return str(e)

# 功能：文本比较
def diff_texts(text1, text2):
    d = Differ()
    return [
        (token[2:], token[0] if token[0] != " " else None)
        for token in d.compare(text1, text2)
    ]

# 功能：RGB 转 十六进制
def rgb_to_hex(r, g, b):
    return '{:02X}{:02X}{:02X}'.format(r, g, b)

# 功能：十六进制 转 RGB
def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

# 功能：搜索结果文件筛选
def filter_files(file_list, regex):
    pattern = re.compile(regex)
    matched_files = []
    unmatched_files = []
    for file in file_list.splitlines():
        if pattern.match(file):
            matched_files.append(file)
        else:
            unmatched_files.append(file)
    return "匹配的文件:\n" + "\n".join(matched_files) + "\n\n不匹配的文件:\n" + "\n".join(unmatched_files)

# 功能：读取文件内容
def read_file(file):
    try:
        with open(file.name, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return str(e)

# 功能：通过路径读取文件内容
def read_file_from_path(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        return str(e)        

# 功能：读取并预览CSV文件内容
def preview_csv(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            return [row for row in reader]
    except Exception as e:
        return str(e)

# 功能：根据用户名筛选CSV数据
def filter_by_username(csv_text, username):
    from io import StringIO
    df = pd.read_csv(StringIO(csv_text))
    filtered_df = df[df['Username'] == username]
    return filtered_df.to_csv(index=False)

# 功能：discordmate发言时段频率统计
def count_message_frequency(csv_text, time_granularity):
    from io import StringIO
    df = pd.read_csv(StringIO(csv_text), parse_dates=['Date'], date_parser=lambda x: pd.to_datetime(x, format='%Y-%m-%d,%H:%M:%S'))
    df['Time'] = df['Date'].dt.floor(f'{time_granularity}min')
    frequency = df.groupby('Time').size()
    return frequency.to_string()

# 功能：discordmate统计每天各个时段的发言频率（百分数）
def calculate_time_slot_frequency(channel_time_freq):
    channel_df = pd.read_csv(StringIO(channel_time_freq), sep='\s+', header=None, names=['Time', 'Count'])
    total_count = channel_df['Count'].sum()
    channel_df['Percentage'] = (channel_df['Count'] / total_count) * 100
    return channel_df.to_string(index=False)

# 功能：discordmate分析单个用户在各个时段的发言偏好度（百分数）
def calculate_user_preference(user_time_freq, channel_time_freq):
    user_df = pd.read_csv(StringIO(user_time_freq), sep='\s+', header=None, names=['Time', 'UserCount'])
    channel_df = pd.read_csv(StringIO(channel_time_freq), sep='\s+', header=None, names=['Time', 'ChannelCount'])
    
    user_df['UserPercentage'] = (user_df['UserCount'] / user_df['UserCount'].sum()) * 100
    channel_df['ChannelPercentage'] = (channel_df['ChannelCount'] / channel_df['ChannelCount'].sum()) * 100
    
    merged_df = pd.merge(user_df, channel_df, on='Time', how='outer').fillna(0)
    merged_df['Preference'] = merged_df['UserPercentage'] - merged_df['ChannelPercentage']
    
    return merged_df.to_string(index=False)