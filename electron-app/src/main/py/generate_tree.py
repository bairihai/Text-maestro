#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
目录树生成脚本 (Python) —— Electron 调用时使用
用法: python generate_tree.py <dirPath> <maxDepth> <includeStats:0|1>
输出: JSON { tree, accelerated, stats? }
"""

import os
import sys
import json
import shutil


def generate_tree_dict(dir_path, max_depth):
    """用 os.walk 构建树形结构，和 Gradio 版一致但返回结构化 JSON。"""
    root_name = os.path.basename(dir_path.rstrip(os.sep)) or dir_path
    root = {"name": root_name, "type": "directory", "children": []}

    # path -> TreeNode 映射，便于快速挂载
    path_to_node = {dir_path: root}

    for root_dir, dirs, files in os.walk(dir_path):
        # 计算当前相对深度
        rel = os.path.relpath(root_dir, dir_path)
        if rel == ".":
            level = 0
        else:
            level = rel.count(os.sep) + 1
        if level >= max_depth:
            # 达到最大深度时不递归 deeper 子目录
            dirs[:] = []
            continue

        # 处理目录
        dirs_sorted = sorted(dirs)
        for d in dirs_sorted:
            full = os.path.join(root_dir, d)
            parent_node = path_to_node.get(root_dir, root)
            child = {"name": d, "type": "directory", "children": []}
            parent_node.setdefault("children", []).append(child)
            path_to_node[full] = child

        # 处理文件
        for f in sorted(files):
            parent_node = path_to_node.get(root_dir, root)
            parent_node.setdefault("children", []).append({"name": f, "type": "file"})

    # 对每个目录的 children 排序：目录在前、文件在后，按名称字母序
    def sort_children(node):
        if node.get("children"):
            node["children"].sort(key=lambda n: (0 if n["type"] == "directory" else 1, n["name"]))
            for c in node["children"]:
                sort_children(c)

    sort_children(root)
    return root


def get_size(start_path):
    """递归计算目录大小（仅用于统计）。"""
    total = 0
    for dirpath, _, filenames in os.walk(start_path):
        for f in filenames:
            fp = os.path.join(dirpath, f)
            try:
                total += os.path.getsize(fp)
            except OSError:
                pass
    return total


def main():
    if len(sys.argv) < 4:
        print(json.dumps({"error": "缺少参数: python generate_tree.py <dirPath> <maxDepth> <includeStats:0|1>"}),
              file=sys.stderr)
        sys.exit(1)

    dir_path = sys.argv[1]
    try:
        max_depth = int(sys.argv[2])
    except ValueError:
        max_depth = 3

    include_stats = sys.argv[3] == "1"

    if not os.path.isdir(dir_path):
        print(json.dumps({"error": "指定路径不是目录"}), file=sys.stderr)
        sys.exit(1)

    try:
        tree = generate_tree_dict(dir_path, max_depth)
        result = {"tree": tree, "accelerated": True}

        if include_stats:
            # 统计目录大小 + 磁盘信息
            total_size = get_size(dir_path)
            try:
                usage = shutil.disk_usage(dir_path)
                result["stats"] = {
                    "totalSize": total_size,
                    "diskTotal": usage.total,
                    "diskUsed": usage.used,
                    "diskFree": usage.free,
                    "percentUsed": (total_size / usage.total * 100) if usage.total > 0 else 0,
                }
            except Exception as e:
                result["stats"] = {
                    "totalSize": total_size,
                    "error": str(e),
                }

        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
