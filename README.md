# 文本分析工具箱 Text-maestro

## 综述

作者：chatgpt(poe)，cursor，我（白日海）

效果：**自动清洗必要的数据，文本分析可视化**

技术选型：py扩展+electron-vite+mysql数据库（后端） 丨 webpack构建+react+postcss引入tailwindcss（前端）丨基于**node22**
重启时间：2024年5月5日 15点58分【重启后的新版本采用electron进行了重新设计，并在之后对webpack和vite进行了整合迁移】

本工具的目标：做更适合 obsidian文档\微信留痕\discord聊天记录 等的，ai化的聊天记录分析工具。



开源库地址：[gitee]() 开源库镜像：[github镜像]()

## 目录结构与版本

原计划：制作两个版本，一个electron一个qt，优先制作electron。

24.8.31改动：太慢了，花了一大堆时间在基础的操作界面上却半天没做好实际逻辑。
最终决定启用Gradio，全力投入gradio，做完之后再再electron-app中引入。

| 特性       | Electron-app版本               | Gradio-app版本                       | QT-app版本                 |
| ---------- | ------------------------------ | ------------------------------------ | -------------------------- |
| 开发速度   | 慢，需大量时间构建基础操作界面 | ==快，专注于核心功能==               | 慢，需要大量SDK            |
| 界面复杂度 | 高，需要处理复杂的前端框架     | ==低，Gradio提供简单的界面构建工具== | 高，很臃肿                 |
| 适用场景   | 适合需要复杂交互的桌面应用     | ==适合快速开发和原型验证==           | 适合需要精细操作的桌面应用 |
| 依赖       | Node.js, Electron, Webpack等   | Python, Gradio                       | C++,Qt maker            |
| 更新状况   | **完成gradio之后引入**         | ==**优先更新**==                     | **停更**                   |


# Text-maestro 使用指南：

以下部署方法（含环境配置方法）仅供参考：请务必按照这里的顺序依次完成。
如有错误请反馈，
需要更深入的指导应查看**README-project.md**。
这与本文档在同一目录下。

如若问题仍未解决，请向我求助，我的学习笔记能帮你解决问题。
这可能需要一定费用——我不会向您索要，但您应当多少给点。

## Gradio-app

由于在使用Electron进行基础操作界面开发时耗费了大量时间，导致核心功能进展缓慢，因此，2024年8月31日 18点10分（dev-0.5）决定启用Gradio进行快速开发。Gradio提供了简单易用的界面构建工具，可以大大加快开发进度。

> Q：为什么放弃electron，选择Gradio？
>
> A：**事实上，我不可能花三个月做基础操作界面，却在核心功能上一笔未动。那样这辈子也做不完。**
> 最优先保证原型验证，先跑起来再迭代，不然没结果。

进入gradio-app文件夹，先安装，再启动。

```shell
pip install requirements.txt

gradio app.py
```

启动后，按照输出提示，在webUI进行操作。

使用gradio启动是为了支持部分热重载（面对简单的改动可以热重载）等特性。

在gradio-app文件夹下还一并硬编码了everything的sdk（dll），所谓sdk就类似你用python修改系统音量那种，也是用了一个软件调用其api，sdk就类似于给封装起来了。

具体到everything这里的sdk只是一个ipc的实现~~，没甚鸟谓~~，详见readme-project.md。

## Electron-app【停用】

**注意：由于开发进度调整，Electron版本的开发已暂停（冻结），待Gradio版本完成后再继续。** 冻结期间，electron-app的更新仅以最低限度保留。

进入electron-app文件夹，先安装，再启动。

```shell
npm install

npm run dev
```

启动后，您可以通过按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> 打开开发者工具（DevTools）进行调试。



未来计划

在完成Gradio版本的核心功能后，将其集成到Electron应用中，以便在桌面环境中提供更好的用户体验。

届时可能会存在“需要先启动gradio再用api引入到electron-app”的繁琐情况，但这是目前的最优解。

> 本身来说，gradio提供ui直接转api。
> electron方面，js可以直接重放录好的api，相比单独用electron频繁的进程间通信（IPC），这样更强大也更方便，同时对js和py去其糟粕取其精华。

我们会尽力优化，但能力有限，希望您理解。

## obsidian插件

（暂未开发）

为obsidian装载：[obsidian市场中的&#34;Text Maestro&#34;]()

# 附录

## 测试用例

随本仓库附带测试用例文件夹，位于example文件夹中。这里面有一些简单的实例，可以用于测试本工具的运行情况。

## 支持的功能

[![Version 1.0](https://img.shields.io/badge/version-1.0-brightgreen.svg)](https://github.com/iamscottxu/AcFun-Video-Download/releases/tag/v1.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/stars/khfheicddakgkjkocaokijccaaeebfko.svg)](https://chrome.google.com/webstore/detail/acfun-video-download/khfheicddakgkjkocaokijccaaeebfko)
[![Firefox Add-ons](https://img.shields.io/amo/stars/acfun-video-download.svg)](https://addons.mozilla.org/zh-CN/firefox/addon/acfun-video-download/)
[![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/iamscottxu/AcFun-Video-Download/blob/master/LICENSE)

**【dev-0.6.1已实装】功能1：文件分类**

按照一定条件，以所选择的方式，列出符合条件的文件。

按照列表导入，批量新建多个文件夹；

设置对应规则后，对一定范围内，筛选目标文件，并进行移动。

【dev-0.7即将实装】功能2：词频统计

设置对应规则后，对一定范围内目标文件进行词云统计。

设置过滤词/词性需求。

按照一定规则遍历统计，生成词频动态图/视频。（可能会做）

**【dev-0.5.1已实装】功能3：树状图**

输出文件目录结构。

监控空间占用情况，并进行导出。

最终实现方式是用md做一个类似linux中ls的效果

功能4：插件推荐

浏览我们推荐的插件与配置，改善使用体验。

功能5：特征分析

选中一定范围内的文件，进行特征分析。（可能会做）

统计记日记的时间段频率，生成统计图，拟合曲线等。

大概就是先做这几个功能吧。

后期功能例：文件搬迁

选中指定文件，从仓库中搬出，保留一个单向/双向链接。

（2024年5月10日 08点27分 以下功能更新时间不定，可能需要收费）

功能1：历史记录

打开app后回到上次打开的文件夹。

## 参考清单 & sponsor

2024年5月5日 16点16分：

作为云都官能团早就想做，但时至今日才得以正式开始施工的最新桌面应用，请允许我在这里为2022-2024年所有云都官能团的支持者，表示衷心的感谢！

以下，是部分本产品的参考清单：
（参考：指资源、产品、教程等）

1. [DiVoMiner 及其推荐的UCINET](https://zhuanlan.zhihu.com/p/359610083)
2. [Chrome拓展程序，Discordmate - Discord Chat Exporter导出聊天记录](https://chromewebstore.google.com/detail/discordmate-discord-chat/ofjlibelpafmdhigfgggickpejfomamk)
3. [vite+electron教程](https://blog.csdn.net/qq_42365534/article/details/129887911) 注意：csdn近期在推自己的码仓，不要被那什么~~老流氓~~加速计划误导了。
4. [彭道宽-electron掘金教程&github仓库](https://github.com/PDKSophia/visResumeMook) 几乎很难说一个教程是种祝福还是诅咒
5. [gradio词云项目示例](https://github.com/AlionSSS/wordcloud-webui)

赞助云都官能团，成为“云山原子”，并为我们的IP事业提供建议：[爱发电链接]()

在此，亦感谢那本高中的信息技术书。python做词云确实简单好用！