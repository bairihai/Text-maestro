# 文本分析工具箱 Text-maestro

111

## 综述

作者：chatgpt(poe)，cursor，我（白日海）

效果：**自动清洗必要的数据，文本分析可视化**

技术选型：py扩展+electron-vite+mysql数据库（后端） 丨 webpack构建+react+postcss引入tailwindcss（前端）丨基于**node22**
重启时间：2024年5月5日 15点58分【重启后的新版本采用electron进行了重新设计，并在之后对webpack和vite进行了整合迁移】


本工具的目标：做更适合 obsidian文档\微信留痕\discord聊天记录 等的，ai化的聊天记录分析工具。

# Text-maestro 本地部署概要：

以下部署方法（含环境配置方法）仅供参考：请务必按照这里的顺序依次完成。
如有错误请反馈，
需要更深入的指导应查看**README-project.md**。
这与本文档在同一目录下。

如若问题仍未解决，请向我求助，我的学习笔记能帮你解决问题。
这可能需要一定费用——我不会向您索要，但您应当多少给点。

## 1 启动进程：

clone仓库。使用其中的electron-app文件夹中的代码。

node切版本：建议node选用node22。

然后，启动进程。

使用electron-vite官方提供的复合script，快速启动：

```shell
npm run dev
```

启动后，您可以通过按 <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>I</kbd> 打开开发者工具（DevTools）进行调试。

# Text-maestro 立即启用：

### 2 开箱即用

到release中下载所需要的包体即可使用。

### 3 国内镜像/其他支持的使用方式

开源库地址：[gitee]()

开源库镜像：[github镜像]()

为obsidian装载：[obsidian市场中的&#34;Text Maestro&#34;]()

## 支持的功能


[![Version 1.0](https://img.shields.io/badge/version-1.0-brightgreen.svg)](https://github.com/iamscottxu/AcFun-Video-Download/releases/tag/v1.0)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/stars/khfheicddakgkjkocaokijccaaeebfko.svg)](https://chrome.google.com/webstore/detail/acfun-video-download/khfheicddakgkjkocaokijccaaeebfko)
[![Firefox Add-ons](https://img.shields.io/amo/stars/acfun-video-download.svg)](https://addons.mozilla.org/zh-CN/firefox/addon/acfun-video-download/)
[![MIT](https://img.shields.io/github/license/mashape/apistatus.svg)](https://github.com/iamscottxu/AcFun-Video-Download/blob/master/LICENSE)




功能1：文件分类

按照一定条件，以所选择的方式，列出符合条件的文件。

按照列表导入，批量新建多个文件夹；

设置对应规则后，对一定范围内，筛选目标文件，并进行移动。


功能2：词频统计

设置对应规则后，对一定范围内目标文件进行词云统计。

设置过滤词/词性需求。


按照一定规则遍历统计，生成词频动态图/视频。（可能会做）


功能3：树状图

输出文件目录结构。

监控空间占用情况，并进行导出。


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




赞助云都官能团，成为“云山原子”，并为我们的IP事业提供建议：[爱发电链接]()

在此，亦感谢那本高中的信息技术书。python做词云确实简单好用！