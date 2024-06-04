# 文本分析工具箱 Text-maestro

## 综述

作者：chatgpt(poe)，cursor，我（白日海）

效果：**自动清洗必要的数据，文本分析可视化**

技术选型：py扩展+webpack构建+react（electron4）+**node14**


重启时间：2024年5月5日 15点58分【重启后的新版本采用electron进行了重新设计】


本工具的目标：做更适合 obsidian文档\微信留痕\discord聊天记录 等的，ai化的聊天记录分析工具。


## 如何使用

### 1 自己部署/编译：

clone仓库。请使用其中的electron-app文件夹中的代码。
electron-app是计划使用新版node+vite的一次测试，但是最后以失败告终了，并不能使用。（现已收入readme/废案）
之后推出的v2则是将之router升级的尝试。然而原代码实在是过于屎山，我的拔苗助长先干活再学习的计划也失败了。（现已收入readme/废案）

要使用electron-app-v2，需要把node降级至14.x。
（cursor推荐使用nvm进行降级。降级成功的提示形如：`Now using node v14.17.0 (64-bit)`。nvm理应有自动将自己加入帐户环境变量的功能，原理类似gcc mingw64等东西。）


启动服务端（electron应用）：参见package.json中给出的指令

启动前端：参见package.json中给出的指令


推荐使用ustclug镜像。没有为什么，我也不讨厌淘宝，我也不喜欢科大里面膜来膜去的风气，我也考不上，我就是单纯喜欢那个人而已。

以上。

### 2 开箱即用

到release中下载所需要的包体即可使用。

### 3 国内镜像/其他支持的使用方式

开源库地址：[gitee]()

开源库镜像：[github镜像]()

为obsidian装载：[obsidian市场中的&#34;Text Maestro&#34;]()

### 4 通过源代码使用

内容和上面的1部分一致，不过注意建议使用pnpm而非npm

main和render要输两个命令这事儿真不怪我，哪怕是electron官方教程也得输两个（无非是只用打一个进行复合了）

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