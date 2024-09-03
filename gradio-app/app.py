import os
import shutil
import gradio as gr
from difflib import Differ

# from tools import utils

# 部分功能实现函数被拆分到了不同的模块（.py文件），这里进行引入。
# 下文中，需要用 utils.xxx 的方式调用这些函数。
import utils
import utils_folder
import utils_everything

# 页面构建，功能引入
with gr.Blocks(title="Text-maestro") as demo:

    # 公告区域
    gr.HTML("""
    <div style="font-family: Arial, sans-serif; line-height: 1.5; background-color: #f9f9f9; border-radius: 10px; padding: 20px;">
        <h2>公告区</h2>
        <p>目前正在使用最基础的gradio版本，electron版本的制作请等待后续通知。</p>
        <p><strong>注意：</strong> 请确保运行本面板的机器（后端）和打开面板的机器（前端）相同。<strong>涉及到本地文件部分的功能并不能仅靠一个gradio面板在前端使用。</strong></p>
        <p><strong>注意：</strong> 部分被标注为<span style="background-color: #FAFAD2; border-radius: 5px; padding: 1px 3px; font-size: 0.85em;">everything</span>的功能需要你后台启用everything以加快搜索速度。<strong>如未启动everything，这些功能无法使用。</strong> 详见README.md以及README-project.md</p>
        <p>接下来的electron版本会启用api并进行整理。</p>
        <p>就不做清空按钮之类的东西了，因为这里只是一个“api大全”，electron应用里面再做吧。</p>
    </div>
    """)

    # Unicode 和中文双向转换工具
    gr.Markdown("## Unicode 和中文双向转换工具")
    
    with gr.Tab("Unicode 转中文"):
        unicode_input = gr.Textbox(label="输入 Unicode 字符串", placeholder="例如： \\u4f60\\u597d\\u4e16\\u754c")
        chinese_output = gr.Textbox(label="输出中文")
        gr.Button("转换").click(utils.unicode_to_chinese, inputs=unicode_input, outputs=chinese_output)
    
    with gr.Tab("中文转 Unicode"):
        chinese_input = gr.Textbox(label="输入中文", placeholder="例如： 你好世界")
        unicode_output = gr.Textbox(label="输出 Unicode 字符串")
        gr.Button("转换").click(utils.chinese_to_unicode, inputs=chinese_input, outputs=unicode_output)
    
    # 问候功能
    gr.Markdown("## 问候功能")
    name_input = gr.Textbox(label="输入名字")
    greet_output = gr.Textbox(label="输出问候语")
    gr.Button("问候").click(utils.greet, inputs=name_input, outputs=greet_output)

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
            result += utils_folder.generate_tree(path, style, depth)
        if "统计目录信息" in options:
            size = utils_folder.get_directory_size(path)
            total, used, free = utils_folder.get_disk_usage(path)
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

    # 文本比较功能
    gr.Markdown("## 文本比较")
    with gr.Group():
        text1_input = gr.Textbox(label="文本 1", lines=3, value="The quick brown fox jumped over the lazy dogs.")
        text2_input = gr.Textbox(label="文本 2", lines=3, value="The fast brown fox jumps over lazy dogs.")
        diff_output = gr.HighlightedText(label="差异", combine_adjacent=True, show_legend=True, color_map={"+": "red", "-": "green"})
        gr.Button("比较").click(utils.diff_texts, inputs=[text1_input, text2_input], outputs=diff_output)

    # 自检功能
    gr.Markdown("## 自检功能")
    current_dir_output = gr.Textbox(label="gradio-app 当前工作目录")
    gr.Button("显示当前工作目录").click(utils_folder.get_current_directory, outputs=current_dir_output)

    # 文件搜索功能
    gr.Markdown("""
    ## 文件搜索功能 <span style="background-color: #FAFAD2; border-radius: 5px; padding: 1px 3px; font-size: 0.7em;">everything</span>
    """)
    with gr.Group():
        search_path_input = gr.Textbox(label="输入文件夹路径", placeholder="例如： D:\\My Program\\novelai-webui-aki-v2")
        search_subdirs_input = gr.Checkbox(label="搜索子目录", value=True)
        search_output = gr.Textbox(label="搜索结果")

    def search_files(path, search_subdirs):
        return "\n".join(utils_everything.search_files_in_directory(path, search_subdirs))

    gr.Button("搜索").click(search_files, inputs=[search_path_input, search_subdirs_input], outputs=search_output)

demo.launch()