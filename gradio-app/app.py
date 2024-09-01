import os
import shutil
import gradio as gr

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

# 页面构建，功能引入
with gr.Blocks(title="Text-maestro") as demo:

    # 公告区域
    gr.Code("## 公告区域\n欢迎使用 Text-maestro 工具！")

    # Unicode 和中文双向转换工具
    gr.Markdown("## Unicode 和中文双向转换工具")
    
    with gr.Tab("Unicode 转中文"):
        unicode_input = gr.Textbox(label="输入 Unicode 字符串", placeholder="例如： \\u4f60\\u597d\\u4e16\\u754c")
        chinese_output = gr.Textbox(label="输出中文")
        gr.Button("转换").click(unicode_to_chinese, inputs=unicode_input, outputs=chinese_output)
    
    with gr.Tab("中文转 Unicode"):
        chinese_input = gr.Textbox(label="输入中文", placeholder="例如： 你好世界")
        unicode_output = gr.Textbox(label="输出 Unicode 字符串")
        gr.Button("转换").click(chinese_to_unicode, inputs=chinese_input, outputs=unicode_output)
    
    # 问候功能
    gr.Markdown("## 问候功能")
    name_input = gr.Textbox(label="输入名字")
    greet_output = gr.Textbox(label="输出问候语")
    gr.Button("问候").click(greet, inputs=name_input, outputs=greet_output)

    # 目录统计与树状图
    gr.Markdown("## 目录统计与树状图")
    with gr.Group():
        path_input = gr.Textbox(label="输入目录路径", placeholder="例如： /home/user")
        options = gr.CheckboxGroup(label="选择功能", choices=["生成目录树", "统计目录信息"], value=["生成目录树", "统计目录信息"])
        with gr.Row():
            style_input = gr.Dropdown(label="【输出目录树时】输出样式", choices=["tree", "ls"], value="tree")
            depth_input = gr.Slider(label="【输出目录树时】最大深度", minimum=1, maximum=10, step=1, value=3)
        output = gr.Textbox(label="输出结果")

    def handle_options(path, style, depth, options):
        result = ""
        if "生成目录树" in options:
            result += generate_tree(path, style, depth)
        if "统计目录信息" in options:
            size = get_directory_size(path)
            total, used, free = get_disk_usage(path)
            percent_used = (size / total) * 100
            stats = (f"目录总大小: {size / (1024 * 1024):.2f} MB (字节： {size} Bytes) \n "
                     f"硬盘总大小: {total / (1024 * 1024 * 1024):.2f} GB, "
                     f"已用空间: {used / (1024 * 1024 * 1024):.2f} GB, "
                     f"剩余空间: {free / (1024 * 1024 * 1024):.2f} GB \n"
                     f"目录占用硬盘百分比: {percent_used:.2f}%")
            result += stats
        return result

    def update_visibility(options):
        if "生成目录树" in options:
            return gr.update(visible=True), gr.update(visible=True)
        else:
            return gr.update(visible=False), gr.update(visible=False)

    options.change(update_visibility, inputs=options, outputs=[style_input, depth_input])
    gr.Button("生成结果").click(handle_options, inputs=[path_input, style_input, depth_input, options], outputs=output)

demo.launch()