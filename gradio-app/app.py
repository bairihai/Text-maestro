import gradio as gr

def greet(name):
    return "Hello " + name + "!"

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

with gr.Blocks() as demo:
    gr.Markdown("## Unicode 和中文转换工具")
    
    with gr.Tab("Unicode 转中文"):
        unicode_input = gr.Textbox(label="输入 Unicode 字符串")
        chinese_output = gr.Textbox(label="输出中文")
        gr.Button("转换").click(unicode_to_chinese, inputs=unicode_input, outputs=chinese_output)
    
    with gr.Tab("中文转 Unicode"):
        chinese_input = gr.Textbox(label="输入中文")
        unicode_output = gr.Textbox(label="输出 Unicode 字符串")
        gr.Button("转换").click(chinese_to_unicode, inputs=chinese_input, outputs=unicode_output)
    
    gr.Markdown("## 问候功能")
    name_input = gr.Textbox(label="输入名字")
    greet_output = gr.Textbox(label="输出问候语")
    gr.Button("问候").click(greet, inputs=name_input, outputs=greet_output)

demo.launch()