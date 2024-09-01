import os
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
def generate_tree(path, prefix=""):
    tree = ""
    for root, dirs, files in os.walk(path):
        level = root.replace(path, '').count(os.sep)
        indent = ' ' * 4 * (level)
        tree += f"{prefix}{indent}{os.path.basename(root)}/\n"
        sub_indent = ' ' * 4 * (level + 1)
        for f in files:
            tree += f"{prefix}{sub_indent}{f}\n"
    return tree

# 页面构建，功能引入
with gr.Blocks(title="Text-maestro") as demo:
    gr.Markdown("## Unicode 和中文转换工具")
    
    with gr.Tab("Unicode 转中文"):
        unicode_input = gr.Textbox(label="输入 Unicode 字符串", placeholder="例如： \\u4f60\\u597d\\u4e16\\u754c")
        chinese_output = gr.Textbox(label="输出中文")
        gr.Button("转换").click(unicode_to_chinese, inputs=unicode_input, outputs=chinese_output)
    
    with gr.Tab("中文转 Unicode"):
        chinese_input = gr.Textbox(label="输入中文", placeholder="例如： 你好世界")
        unicode_output = gr.Textbox(label="输出 Unicode 字符串")
        gr.Button("转换").click(chinese_to_unicode, inputs=chinese_input, outputs=unicode_output)
    
    gr.Markdown("## 问候功能")
    name_input = gr.Textbox(label="输入名字")
    greet_output = gr.Textbox(label="输出问候语")
    gr.Button("问候").click(greet, inputs=name_input, outputs=greet_output)

    gr.Markdown("## 目录树生成工具")
    path_input = gr.Textbox(label="输入目录路径", placeholder="例如： /home/user")
    tree_output = gr.Textbox(label="输出目录树")
    gr.Button("生成目录树").click(generate_tree, inputs=path_input, outputs=tree_output)

demo.launch()