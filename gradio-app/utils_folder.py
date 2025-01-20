import os
import shutil
from datetime import datetime, timedelta
import re

# utils_folder.py 目录和文件夹相关的操作功能

# 功能：生成目录树
def generate_tree(path, style="tree", max_depth=None, prefix=""):
    tree = ""
    for root, dirs, files in os.walk(path):
        level = root.replace(path, '').count(os.sep)
        if max_depth is not None and level >= max_depth:
            continue
        indent = ' ' * 4 * (level) if style == "tree" else ''
        tree += f"{prefix}{indent}{os.path.basename(root)}/\n"
        sub_indent = ' ' * 4 * (level + 1) if style == "tree" else ''
        for f in files:
            tree += f"{prefix}{sub_indent}{f}\n"
    return tree

# 功能：计算目录大小
def get_directory_size(path):
    total_size = 0
    for dirpath, dirnames, filenames in os.walk(path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            total_size += os.path.getsize(fp)
    return total_size

# 功能：获取硬盘信息
def get_disk_usage(path):
    total, used, free = shutil.disk_usage(path)
    return total, used, free

# 功能：生成目录树并统计空间
def generate_tree_and_stats(path, style="tree", max_depth=None):
    tree = generate_tree(path, style, max_depth)
    size = get_directory_size(path)
    total, used, free = get_disk_usage(path)
    percent_used = (size / total) * 100
    stats = f"\n目录总大小: {size / (1024 * 1024):.2f} MB\n硬盘总大小: {total / (1024 * 1024 * 1024):.2f} GB\n已用空间: {used / (1024 * 1024 * 1024):.2f} GB\n剩余空间: {free / (1024 * 1024 * 1024):.2f} GB\n目录占用硬盘百分比: {percent_used:.2f}%"
    return tree + stats

# 功能：获取当前工作目录
def get_current_directory():
    return os.getcwd()

# # 功能：按周创建文件夹
# def create_weekly_folders(year, base_path="."):
#     """
#     在指定路径下创建按周划分的文件夹
#     :param year: 年份(int)
#     :param base_path: 基础路径，默认为当前目录
#     :return: 创建的文件夹列表
#     """
#     # 设置起始日期和结束日期
#     start_date = datetime(year, 1, 1)
#     end_date = datetime(year, 12, 31)
    
#     # 计算总周数
#     total_weeks = ((end_date - start_date).days + 7) // 7
    
#     # 存储创建的文件夹列表
#     created_folders = []
    
#     # 创建文件夹
#     for week in range(1, total_weeks + 1):
#         week_start = start_date + timedelta(days=(week-1)*7)
#         week_end = week_start + timedelta(days=6)
        
#         # 格式化文件夹名称
#         folder_name = f"{week_start.strftime('%-m.%-d')}-{week_end.strftime('%-m.%-d')} {year},第{week}周"
#         folder_path = os.path.join(base_path, folder_name)
        
#         # 创建文件夹
#         os.makedirs(folder_path, exist_ok=True)
#         created_folders.append(folder_name)
    
#     return created_folders

def create_weekly_folders_bat(year, base_path=".", week_start_type="skip_partial"):
    """
    生成按周创建文件夹的bat命令
    :param year: 年份(int)
    :param base_path: 基础路径，默认为当前目录
    :param week_start_type: 周数计算方式
        - "first_week": 将本年1月1日至当周周天视为第1周
        - "zero_week": 将本年1月1日至当周周天视为第0周
        - "skip_partial": 跳过第一个不完整的周，从第一个周一算起
    :return: bat命令字符串
    """
    from datetime import datetime, timedelta
    
    # 设置起始日期为该年第一天
    start_date = datetime(year, 1, 1)
    first_monday = start_date
    while first_monday.weekday() != 0:  # 找到第一个周一
        first_monday += timedelta(days=1)
    
    # 根据不同的周数计算方式设置起始日期和周数
    if week_start_type == "first_week":
        current_date = start_date
        week = 1
    elif week_start_type == "zero_week":
        current_date = start_date
        week = 0
    else:  # skip_partial
        current_date = first_monday
        week = 1
    
    # 设置结束日期为下一年第一个周一之前
    end_date = datetime(year + 1, 1, 1)
    while end_date.weekday() != 0:
        end_date += timedelta(days=1)
    
    # 生成bat命令
    bat_commands = ["@echo off", "chcp 65001", ""]
    
    while current_date < end_date:
        # 计算本周结束日期
        days_to_sunday = 6 - current_date.weekday() if current_date.weekday() <= 6 else 0
        week_end = current_date + timedelta(days=days_to_sunday)
        
        folder_name = f"{current_date.strftime('%m.%d')}-{week_end.strftime('%m.%d')} {year},第{week}周"
        folder_path = f'"{base_path}\\{folder_name}"'
        bat_commands.append(f"md {folder_path}")
        
        # 移动到下一周的开始
        current_date = week_end + timedelta(days=1)
        week += 1
    
    bat_commands.append("pause")
    return "\n".join(bat_commands)

def organize_files_by_week(file_paths, time_format, target_folder):
    bat_commands = ['@echo off']
    for path in file_paths.splitlines():
        path = path.strip()
        if not path:
            continue
        filename = os.path.basename(path)
        try:
            date_str = os.path.splitext(filename)[0]
            date_str = date_str.replace('上午', 'AM').replace('下午', 'PM').replace('晚上', 'PM')
            file_datetime = datetime.strptime(date_str, '%m.%d-%H%M %p')
            
            target_folder = target_folder.strip().strip('"').strip("'")
            
            week_number = file_datetime.isocalendar()[1]
            year = file_datetime.year
            week_start = file_datetime - timedelta(days=file_datetime.weekday())
            week_end = week_start + timedelta(days=6)
            week_folder = f"{week_start.strftime('%m.%d')}-{week_end.strftime('%m.%d')} {year},第{week_number}周"
            dest_folder = os.path.join(target_folder, week_folder)
            
            # 生成 bat 命令而不是直接移动文件
            bat_commands.extend([
                f'if not exist "{dest_folder}" mkdir "{dest_folder}"',
                f'move "{path}" "{dest_folder}"'
            ])
        except Exception as e:
            bat_commands.append(f'echo 错误处理 {filename}: {str(e)}')
    
    return "\n".join(bat_commands)
