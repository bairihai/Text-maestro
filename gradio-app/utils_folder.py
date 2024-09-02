import os
import shutil

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