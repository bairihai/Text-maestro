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
    calculator = WeekCalculator(year, week_start_type)
    bat_commands = ["@echo off", "chcp 65001", ""]
    
    current_date = calculator.first_monday if week_start_type == "skip_partial" else calculator.start_date
    end_date = datetime(year + 1, 1, 1)
    
    while current_date < end_date:
        folder_name = calculator.get_folder_name(current_date)
        bat_commands.append(f'md "{base_path}\\{folder_name}"')
        current_date += timedelta(days=7)
    
    bat_commands.append("pause")
    return "\n".join(bat_commands)

def organize_files_by_week(file_paths, time_format, target_folder, year, auto_create_folders):
    calculator = WeekCalculator(year)
    bat_commands = ['@echo off']
    
    for path in file_paths.splitlines():
        path = path.strip()
        if not path:
            continue
        filename = os.path.basename(path)
        try:
            date_part = filename[:13]  # 通过切片提取前13个字符 "MM.DD-HHMM" 【feature】:也许这里不该写死？唉。真难啊！
            date_str = date_part.replace('上午', 'AM').replace('下午', 'PM').replace('晚上', 'PM')
            # 解析日期时添加年份
            file_datetime = datetime.strptime(f"{date_str} {year}", '%m.%d-%H%M %p %Y')
            
            target_folder = target_folder.strip().strip('"').strip("'")
            
            dest_folder = os.path.join(target_folder, calculator.get_folder_name(file_datetime))
            
            if auto_create_folders:
                bat_commands.append(f'if not exist "{dest_folder}" mkdir "{dest_folder}"')
            bat_commands.append(f'move "{path}" "{dest_folder}"')
        except Exception as e:
            bat_commands.append(f'echo 错误处理 {filename}: {str(e)}')
    
    return "\n".join(bat_commands)

class WeekCalculator:
    def __init__(self, year, week_start_type="skip_partial", split_year=True):
        self.year = year
        self.start_date = datetime(year, 1, 1)
        self.first_monday = self._get_first_monday()
        self.week_start_type = week_start_type
        self.split_year = split_year  # 是否在跨年时拆分周
        
    def _get_first_monday(self):
        first_monday = self.start_date
        while first_monday.weekday() != 0:
            first_monday += timedelta(days=1)
        return first_monday
        
    def get_week_info(self, date):
        """返回给定日期的周信息"""
        week_start = date - timedelta(days=date.weekday())
        week_end = week_start + timedelta(days=6)
        
        # 跨年处理
        if self.split_year:
            if week_end.year > self.year:
                week_end = datetime(self.year, 12, 31)
            if week_start.year < self.year:
                week_start = datetime(self.year, 1, 1)
        
        if self.week_start_type == "first_week":
            week_number = date.isocalendar()[1]
        elif self.week_start_type == "zero_week":
            week_number = date.isocalendar()[1] - 1
        else:  # skip_partial
            if date < self.first_monday:
                week_number = 0
            else:
                week_number = (date - self.first_monday).days // 7 + 1
                
        return week_start, week_end, week_number

    def get_folder_name(self, date):
        week_start, week_end, week_number = self.get_week_info(date)
        return f"{week_start.strftime('%m.%d')}-{week_end.strftime('%m.%d')} {self.year},第{week_number}周"
