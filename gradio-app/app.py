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
import utils_jieba

# 页面构建（gradio interface），功能引入
with gr.Blocks(title="Text-maestro") as demo:

    # 公告区域
    gr.HTML("""
    <div style="font-family: Arial, sans-serif; line-height: 1.5; background-color: #808080; border-radius: 10px; padding: 20px;">
        <h2>公告区</h2>
        <p>目前正在使用最基础的gradio版本，electron版本的制作请等待后续通知。</p>
        <p><strong>注意：</strong> 请确保运行本面板的机器（后端）和打开面板的机器（前端）相同。<strong>涉及到本地文件部分的功能并不能仅靠一个gradio面板在前端使用。</strong></p>
        <p><strong>注意：</strong> 部分被标注为<span style="background-color: #FF8000; border-radius: 5px; padding: 1px 3px; font-size: 0.85em;">everything</span>的功能需要你后台启用everything以加快搜索速度。<strong>如未启动everything，这些功能无法使用。</strong> 详见README.md以及README-project.md</p>
        <p>接下来的electron版本会启用api并进行整理。</p>
        <p>就不做清空按钮、自动填入测试样例之类的东西了，因为这里只是一个“api大全”，electron应用里面再做吧。</p>
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

    # 文件搜索功能（everything）
    gr.Markdown("""
    ## 文件搜索功能 <span style="background-color: #FF8000; border-radius: 5px; padding: 1px 3px; font-size: 0.7em;">everything</span>
    """)
    with gr.Group():
        search_path_input = gr.Textbox(label="输入文件夹路径", placeholder="例如： D:\\My Program\\novelai-webui-aki-v2")
        with gr.Row():
            search_subdirs_input = gr.Checkbox(label="搜索子目录", value=True)
            search_only_file_input = gr.Checkbox(label="仅搜索文件，排除文件夹", value=False)
        search_full_path_input = gr.Checkbox(label="输出完整的绝对路径，以便进一步操作", value=True)
        search_output = gr.Textbox(label="搜索结果")

    def search_files(path, search_subdirs, full_path, only_files):
        return "\n".join(utils_everything.search_files_in_directory(path, search_subdirs, full_path, only_files))

    gr.Button("搜索").click(search_files, inputs=[search_path_input, search_subdirs_input, search_full_path_input, search_only_file_input], outputs=search_output)

    # 搜索结果筛选功能
    gr.Markdown("## 搜索结果筛选功能")
    with gr.Group():
        file_list_input = gr.Textbox(label="输入文件列表", placeholder="每行一个绝对路径。可使用上面的文件搜索功能给文件夹生成，之后粘贴进来。")
        regex_input = gr.Textbox(label="正则表达式筛选", placeholder="对每一行进行遍历核验，不匹配的和匹配的会被区分开，顺序不会被打乱。", value=".*\\.(txt|md)$")
        filter_output = gr.Textbox(label="筛选结果")

    def filter_files(file_list, regex):
        return utils.filter_files(file_list, regex)

    gr.Button("筛选").click(filter_files, inputs=[file_list_input, regex_input], outputs=filter_output)

    # RGB 和 十六进制颜色码双向转换工具
    gr.Markdown("## RGB 和 十六进制颜色码双向转换工具")
    
    with gr.Tab("RGB 转 十六进制"):
        r_input = gr.Slider(label="R", minimum=0, maximum=255, step=1, value=255)
        g_input = gr.Slider(label="G", minimum=0, maximum=255, step=1, value=128)
        b_input = gr.Slider(label="B", minimum=0, maximum=255, step=1, value=0)
        hex_output = gr.Textbox(label="输出十六进制颜色码")
        gr.Button("转换").click(utils.rgb_to_hex, inputs=[r_input, g_input, b_input], outputs=hex_output)
    
    with gr.Tab("十六进制 转 RGB"):
        hex_input = gr.Textbox(label="输入十六进制颜色码", placeholder="例如：FF8000 （不需要带#，直接输入数值内容）")
        rgb_output = gr.Textbox(label="输出 RGB 颜色值")
        gr.Button("转换").click(utils.hex_to_rgb, inputs=hex_input, outputs=rgb_output)

    # 字数词数统计功能，三引号实现长文本分段
    gr.Markdown("## 字数词数统计功能")
    text_input = gr.Textbox(
        label="输入文本", 
        lines=5, 
        placeholder="在此输入文本进行字数词数统计", 
        value="""“早上起来，先来个五公里。吃饭。然后一整个上午就是打靶，摔沙人。练得汗流浃背，旁边教练拿着靶盯着你，你要是想偷懒就一靶抽你屁股上。
下午开始实战了，挑好对手，捉对厮杀。鼻子喷血了，被踢淤青了，手腕挫了，脚扭了，别喊疼，都是小伤。喷点药，接着干。晚上再来个五公里。然后你可以出去溜达一圈了。”"""
    )
    char_count_output = gr.Textbox(label="总字符数")
    word_count_output = gr.Textbox(label="总词数")

    gr.Button("统计").click(utils_jieba.count_chars_and_words, inputs=text_input, outputs=[char_count_output, word_count_output])


    # 词频统计功能
    gr.Markdown("## 词频统计功能")

    with gr.Group():
        text_input = gr.Textbox(
            label="输入文本", 
            lines=5, 
            placeholder="在此输入文本进行字数词数统计", 
            value="""17年的盛夏，她穿着贴身的跤衣，头发剪了军队标准的三毫米，但脸毫无瑕疵。身上没有一丝赘肉，矫健修长。她抓着我的把位，一个漂亮的过肩摔，我翻滚在地上受身。我抓住她的小臂，进步，却怎么也卡不准位置。
她像个男孩子一样大笑起来。事实上她说话也和男孩一模一样，粗里粗气，爽朗。当然，教练不许偷骂人。然而这么多年，我也没见过比她漂亮的姑娘了。
她说："你那鞭腿踢的挺像回事儿，但摔跤咋就那么笨呢?一个过肩摔两天还学不会。"
她的师父，一个国家队退役的女将，抱着胳膊在我后面耸耸肩："你好好练，我当年刚去省柔道队时候，不会柔道技术，就用这一招连摔了十二个人!"她那时候月薪三千块钱。
其他学员都嘻嘻哈哈的围过来，几个比我小几岁的小男孩叽叽喳喳给我说动作要领，抓着我的肩膀往他们胳膊下放，教我怎么顶。""")
        
        with gr.Row():
            input_ban_word = gr.Textbox(label="停用词", placeholder="被停用的词将被忽略，不会被统计", value="我,的,和,有,不,是")
            input_text_dict = gr.Textbox(label="自定义分词词典", placeholder="自定义分词词典，中文里的人名或者自造词需要被手动录入", value="峻影,柔道,云都,自臣,终末之神,死渊,天元的猎犬")
        options = gr.CheckboxGroup(label="按照词性排除", choices=["连词conj.，如“和”“也”", "介词prep.，如“从”“用”"])

    with gr.Tab("生成频率表"):
        path_input = gr.Textbox(label="输入路径", placeholder="例如： D:\\My Program\\novelai-webui-aki-v2")
        output_text = gr.Textbox(label="输出文本")
        gr.Button("读取").click(utils.read_file_from_path, inputs=path_input, outputs=output_text)
    
    with gr.Tab("生成词云图"):
        input_file = gr.File(label="待读取的文件")
        output_text = gr.Textbox(label="输出文本")
        gr.Button("读取").click(utils.read_file, inputs=input_file, outputs=output_text)


    # 文本读取功能
    gr.Markdown("## 文本读取功能")

    with gr.Tab("通过路径读取"):
        path_input = gr.Textbox(label="输入路径", placeholder="例如： D:\\My Program\\novelai-webui-aki-v2")
        output_text = gr.Textbox(label="输出文本")
        gr.Button("读取").click(utils.read_file_from_path, inputs=path_input, outputs=output_text)
    
    with gr.Tab("通过文件读取"):
        input_file = gr.File(label="待读取的文件")
        output_text = gr.Textbox(label="输出文本")
        gr.Button("读取").click(utils.read_file, inputs=input_file, outputs=output_text)

    # 多篇文档拼接功能
    gr.Markdown("## 多篇文档拼接功能")


demo.launch()