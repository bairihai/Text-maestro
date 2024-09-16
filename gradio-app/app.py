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
import utils_wordcloud

# 页面构建（gradio interface），功能引入
with gr.Blocks(title="Text-maestro api大全") as demo:

    # 公告区域
    gr.HTML("""
    <div style="font-family: Arial, sans-serif; line-height: 1.5; background-color: #808080; border-radius: 10px; padding: 20px;">
        <h2>公告区</h2>
        <p>目前正在使用最基础的gradio版本，electron版本的制作请等待后续通知。</p>
        <p><strong>注意：</strong> 请确保运行本面板的机器（后端）和打开面板的机器（前端）相同。<strong>涉及到本地文件部分的功能并不能仅靠一个gradio面板在前端使用。</strong></p>
        <p><strong>注意：</strong> 部分被标注为 <span style="background-color: #FF8000; border-radius: 5px; padding: 1px 3px; font-size: 0.85em;">everything</span> 的功能需要你后台启用everything以加快搜索速度。<strong>如未启动everything，这些功能无法使用。</strong> 详见README.md以及README-project.md</p>
        <p><strong>注意：</strong> 部分被标注为 <span style="background-color: #81D8D0; border-radius: 5px; padding: 1px 3px; font-size: 0.85em;">AI</span> 的功能需要你自备一个语言大模型。我们会把prompt给你整理好，你只要让你的大模型把结果给你，然后输入到这里。<strong>没有AI，这些功能无法使用。</strong> 具体模型不做要求</p>
        <p>接下来的electron版本会启用api并进行整理。</p>
        <p>就不做清空按钮、自动填入测试样例之类的东西了，因为这里只是一个“api大全”，electron应用里面再做吧。</p>
    </div>
    """)

    # <p><strong>注意：</strong> 计划接入的<span style="background-color: #A2DEC8; border-radius: 5px; padding: 1px 3px; font-size: 0.85em;">GPT-4o</span>功能需要API Key才能使用。</p>

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
    with gr.Group():
        text_input = gr.Textbox(
            label="输入文本", 
            lines=5, 
            placeholder="在此输入文本进行字数词数统计", 
            value="""“早上起来，先来个五公里。吃饭。然后一整个上午就是打靶，摔沙人。练得汗流浃背，旁边教练拿着靶盯着你，你要是想偷懒就一靶抽你屁股上。
下午开始实战了，挑好对手，捉对厮杀。鼻子喷血了，被踢淤青了，手腕挫了，脚扭了，别喊疼，都是小伤。喷点药，接着干。晚上再来个五公里。然后你可以出去溜达一圈了。”"""
        )
        with gr.Row():
            char_count_output = gr.Number(label="总字符数")
            word_count_output = gr.Number(label="总词数")

    gr.Button("统计").click(utils_jieba.count_chars_and_words, inputs=text_input, outputs=[char_count_output, word_count_output])


    # 词频统计功能
    gr.Markdown("## 词频统计功能")
    gr.Markdown("目前还不太能自定义，还是按照预设的名词、两个字以上、停用词、自定义词典进行统计。暂不支持自定义")


    with gr.Tab("生成频率表"):
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
            input_ban_word = gr.Textbox(label="停用词", placeholder="被停用的词将被忽略，不会被统计", value="我,的,和,有,不,是", interactive=True)
            input_text_dict = gr.Textbox(label="自定义分词词典", placeholder="自定义分词词典，中文里的人名或者自造词需要被手动录入", value="峻影,柔道,云都,自臣,终末之神,死渊,天元的猎犬", interactive=True)
        options = gr.CheckboxGroup(label="按照词性排除", choices=["连词conj.，如“和”“也”", "介词prep.，如“从”“用”"])


        input_sheet_style = gr.Textbox(label="频率表形式（施工中，暂未开放）", placeholder="csv/xls/md/txt，目前只有txt")
        output_text = gr.Textbox(label="输出频率表")
        gr.Button("生成").click(utils_jieba.word_frequency, inputs=[text_input, input_ban_word, input_text_dict], outputs=output_text)
    
    with gr.Tab("生成词云图"):
        input_word_frequency = gr.Textbox(label="频率表", lines=3 , placeholder="生成的txt格式频率表", value="{'盛夏': 1, '头发': 1, '军队': 1, '标准': 1, '瑕疵': 1, '赘肉': 1, '矫健': 1, '把位': 1, '过肩': 1, '小臂': 1, '男孩子': 1, '男孩': 1, '骂人': 1, '姑娘': 1, '回事儿': 1, '师父': 1, '国家队': 1, '女将': 1, '胳膊': 2, '柔道队': 1, '时候': 2, '柔道': 1, '技术': 1, '月薪': 1, '学员': 1, '小男孩': 1, '动作': 1, '肩膀': 1}")
        input_font_path = gr.Textbox(label="字体文件路径", placeholder="输入字体文件的完整路径 必填！！！")
        with gr.Row():
            input_max_font_size = gr.Slider(label="最大字号", minimum=10, maximum=200, value=100)
            input_min_font_size = gr.Slider(label="最小字号", minimum=10, maximum=200, value=20)
        with gr.Row():
            input_margin = gr.Slider(label="词间距", minimum=0, maximum=10, value=2)
            input_prefer_horizontal = gr.Slider(label="横向排列概率", minimum=0, maximum=1, value=0.9)
        output_image = gr.Image(label="词云图", format="png")
        
        def parse_word_freq(freq_str):
            import ast
            return ast.literal_eval(freq_str)
        
        def generate_wordcloud_from_freq(freq_str, font_path, max_font_size=100, min_font_size=20, margin=2, prefer_horizontal=0.9):
            word_freq = parse_word_freq(freq_str)
            img = utils_wordcloud.generate_wordcloud(word_freq, font_path, max_font_size, min_font_size, margin, prefer_horizontal)
            return img
        
        gr.Button("生成").click(generate_wordcloud_from_freq, inputs=[input_word_frequency, input_font_path, input_max_font_size, input_min_font_size, input_margin, input_prefer_horizontal], outputs=output_image)

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

    with gr.Tab("字符串有序拼接"):
        with gr.Group():
            file_list_input = gr.Textbox(label="输入文件列表", lines=3, placeholder="每行一个绝对路径。可使用上面的文件搜索功能给文件夹生成，之后粘贴进来。可以在筛选功能处筛选好了再粘贴过来。")
            output_text = gr.Textbox(label="拼接结果")
        gr.Button("拼接").click(utils.concatenate_text_files, inputs=file_list_input, outputs=output_text)
    
    with gr.Tab("csv有序拼接"):
        with gr.Group():
            csv_file_list_input = gr.Textbox(label="输入CSV文件列表", lines=3, placeholder="每行一个绝对路径。可使用上面的文件搜索功能给文件夹生成，之后粘贴进来。可以在筛选功能处筛选好了再粘贴过来。")
            output_csv = gr.Textbox(label="拼接结果")
        gr.Button("拼接").click(utils.concatenate_csv_files, inputs=csv_file_list_input, outputs=output_csv)

    # 以UTF-8编码打开csv数据
    gr.Markdown("## 以UTF-8编码打开csv数据")
    gr.Markdown("discord mate等插件会保存UTF8的csv，但在wps中会以默认的GBK编码打开，导致乱码。如果你也是当年有一个免费的联想office忘了激活，不得不用wps，来这里重写吧。不确定请查看 [编码恢复](https://wrtools.top/coderepair.php) 纯文本形式打开请使用文本读取功能")
    with gr.Group():
        file_path_input = gr.Textbox(label="输入CSV文件路径", placeholder="例如： D:\\My Program\\data.csv")

    gr.Button("预览CSV").click(utils.preview_csv, inputs=file_path_input, outputs=gr.Dataframe())

    # discordmate聊天记录分析
    gr.Markdown("## discordmate聊天记录数据分析")
    gr.Markdown("独立性检验工具：wps等。所谓偏好度是指比例乘以总量系数，就是说一个人发言特别多大家发言前后都不得不挨着他，他相邻比例会很高偏好度不高。")
    with gr.Tab("个人发言提取"):
        with gr.Group():
            chat_record_input = gr.Textbox(label="输入待提取的discordmate聊天记录", lines=3, placeholder="输入csv格式的文本，输出csv格式的文本，请使用文本读取功能打开csv文件。保留指定用户名的发言。暂不支持一组用户。")
            username_input = gr.Textbox(label="输入用户名", placeholder="例如： surtr01234")
            output_text = gr.Textbox(label="输出文本", value="csv可以直接丢到词频统计功能里分析，会自动把英文什么的忽略掉")
        
        gr.Button("提取").click(utils.filter_by_username, inputs=[chat_record_input, username_input], outputs=output_text)

    with gr.Tab("发言时间段（频率）"):
        with gr.Group():
            chat_record_input = gr.Textbox(label="输入待分析的聊天记录", lines=3, placeholder="只看指定用户：用discordmate分离功能 拼接多个记录：用csv拼接功能")
            time_granularity_input = gr.Number(label="时间颗粒度（分钟）", value=360)
            frequency_output = gr.Textbox(label="发言频率统计结果", lines=3)
        gr.Button("统计").click(utils.count_message_frequency, inputs=[chat_record_input, time_granularity_input], outputs=frequency_output)

    with gr.Tab("发言相邻的用户（频率）"):
        with gr.Group():
            chat_record_input = gr.Textbox(label="输入待分析的聊天记录", lines=3, placeholder="不要给出只有一两个用户的聊天记录，那样估计啥也分析不出来。")
        gr.Button("分析").click(filter_files, inputs=[chat_record_input, regex_input], outputs=filter_output)

    gr.Markdown("## discordmate聊天记录画像分析")
    with gr.Tab("发言时间段（频率）"):
        with gr.Group():
            channel_time_freq_input = gr.Textbox(label="整个待分析的发言时频", lines=10, placeholder="输入整个频道的发言时频数据")
            frequency_output = gr.Textbox(label="发言频率统计结果", lines=10)
        gr.Button("统计").click(utils.calculate_time_slot_frequency, inputs=[channel_time_freq_input], outputs=frequency_output)

    with gr.Tab("发言时间段（偏好度）"):
        with gr.Row():
            user_time_freq_input = gr.Textbox(label="待分析用户的发言时频", lines=10, placeholder="被停用的词将被忽略，不会被统计", value="""Time
2024-09-02 11:00:00     3
2024-09-02 12:00:00     1
2024-09-02 13:00:00    14
2024-09-02 15:00:00     3
2024-09-02 18:00:00     2""", interactive=True)
            channel_time_freq_input = gr.Textbox(label="整个频道的发言时频", lines=10, placeholder="自定义分词词典，中文里的人名或者自造词需要被手动录入", value="""Time
2024-09-01 22:00:00     1
2024-09-02 11:00:00    22
2024-09-02 12:00:00    12
2024-09-02 13:00:00    66
2024-09-02 14:00:00     8
2024-09-02 15:00:00    16
2024-09-02 18:00:00     8
2024-09-04 00:00:00     3
2024-09-04 04:00:00     1""", interactive=True)
        preference_output = gr.Textbox(label="发言偏好度统计结果", lines=10)
        gr.Button("统计").click(utils.calculate_user_preference, inputs=[user_time_freq_input, channel_time_freq_input], outputs=preference_output)

    # 全文查找并替换（人名地名优化版），注意往gradio里面写html元素需要双引号改为单引号。gr.tab里面没法写元素，算了吧。
    gr.Markdown("## 人名/地名替换 <span style='background-color: #81D8D0; border-radius: 5px; padding: 1px 3px; font-size: 0.7em;'>AI</span>")
    with gr.Tab("待替换内容识别"):
        simplify_input = gr.Textbox(label="输入待洗稿的文章，ai识别其中需要替换的内容", lines=3, placeholder="文章正文", value="赤心巡天是很值得被洗稿之后搬运到番茄小说的")
        traditional_output = gr.Textbox(label="prompt", lines=3)
        gr.Button("转换").click(utils.simplify_to_traditional, inputs=simplify_input, outputs=traditional_output)     

    # 简繁互转
    gr.Markdown("## 简繁互转")
    with gr.Tab("简体转繁体"):
        simplify_input = gr.Textbox(label="输入简体中文", lines=3, placeholder="请输入要转换的简体中文文本", value="赤心巡天是很值得被洗稿之后搬运到番茄小说的。推荐的流程是1.人名地名词典替换 2.简繁转换 3.ai原意提取 4.ai关键词近义化 5.ai重写")
        traditional_output = gr.Textbox(label="繁体中文输出", lines=3)
        gr.Button("转换").click(utils.simplify_to_traditional, inputs=simplify_input, outputs=traditional_output)
        
    with gr.Tab("繁体转简体"):
        traditional_input = gr.Textbox(label="输入繁体中文", lines=3, placeholder="請輸入要轉換的繁體中文文本")
        simplify_output = gr.Textbox(label="简体中文输出", lines=3)
        gr.Button("转换").click(utils.traditional_to_simplify, inputs=traditional_input, outputs=simplify_output)

    # 文章大纲（TOC）统一
    gr.Markdown("## 文章大纲（TOC）统一及相关功能")
    gr.Markdown("就好像练一下背负投就要拆开练抢把、打入、转身、摔法，实现一个大功能也要拆解目标先做好一堆小功能。现在你就明白我为什么总是把功能拆很碎，看起来急着做electron版了。就不说什么习得性无助之类的话了。 ——2024年9月17日 01点16分 白日海")
    
    with gr.Tab("提取md文章大纲"):
        md_input = gr.Textbox(label="输入Markdown文章", lines=4, placeholder="请输入Markdown格式的文章内容")
        outline_output = gr.Textbox(label="提取的大纲", lines=4)
        gr.Button("提取大纲").click(utils.extract_markdown_outline, inputs=md_input, outputs=outline_output)

    with gr.Tab("两大纲合并"):
        with gr.Row():
            doc1_input = gr.Textbox(label="大纲1内容", lines=5, placeholder="请输入第一个大纲的内容。md语言。", value="""## 大章节1 
### 小章节2
## 大章节3
""")
            doc2_input = gr.Textbox(label="大纲2内容", lines=5, placeholder="请输入第二个大纲的内容。md语言。", value="""## 大章节3 
### 小章节a
## 大章节1
### 小章节b                                    
""")
        merged_output = gr.Textbox(label="合并后的大纲", lines=5)
        # gr.Button("合并").click(utils.merge_two_docs, inputs=[doc1_input, doc2_input], outputs=merged_output)

    with gr.Tab("对一篇文章使用新大纲"):
        merged_output = gr.Textbox(label="使用后的大纲", lines=5)
        # gr.Button("合并").click(utils.merge_two_docs, inputs=[doc1_input, doc2_input], outputs=merged_output)

    with gr.Tab("多文档合并"):
        articles_input = gr.Textbox(label="待统一大纲的文章（md/txt）", lines=5, placeholder="文章的绝对路径，每行一个，默认file协议")
        processed_articles_output = gr.Textbox(label="处理后的文章", lines=5)
        unified_outline_output = gr.Textbox(label="统一后的大纲", lines=3)
  

    # 小说洗稿
    gr.Markdown("## 番茄/起点小说搬运洗稿")
    gr.Markdown("影视解说洗稿、视频拆解等功能之后制作。部分功能需要使用ai，鉴于目前ai市场比较混乱，就不内置ai功能了，模型选用费用控制都是大问题。  \n 所以，最后采用的方案是把prompt格式化拼接好，你自己找个合适的模型让他处理，想用哪个模型（gpt4o 01 或是claude之类）都可以，只要给我输出就行了。")

demo.launch()