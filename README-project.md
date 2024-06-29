## 如何给node降级至14

要使用electron-app，需要把node降级至14.x。
【cursor推荐】使用nvm进行降级。降级成功的提示形如：`Now using node v14.17.0 (64-bit)`。
（nvm理应有自动将自己加入帐户环境变量的功能，原理类似gcc mingw64等东西。）

## 废案文件夹

electron-app是计划使用新版node+vite的一次测试，但是最后以失败告终了，并不能使用。（现已收入readme/废案）
之后推出的v2则是将之router升级的尝试。然而原代码实在是过于屎山，我的拔苗助长先干活再学习的计划也失败了。（现已收入readme/废案）

## 镜像

推荐使用ustclug镜像。没有为什么，我也不讨厌淘宝，我也不喜欢科大里面膜来膜去的风气，我也考不上，我就是单纯喜欢那个人而已。

以上。

## 内置了镜像的npm

使用pnpm/cnpm而非npm，无需配置镜像。

比如淘宝的cnpm内置了npm淘宝源。

## ~~为什么启动进程要打两个命令~~

~~main和render要输两个命令这事儿真不怪我，哪怕是electron官方教程也得输两个（无非是只用打一个进行复合了）~~

~~官方的做法就是如此。~~

~~任何服务都有前后端，很正常，electron也不能例外。前后端项目都要打两个script的。~~


更新：2024年6月28日 23点21分

via electron-vite tool,resolved the script problem.

Now,use `npm run dev` one scipt to start dev.

## 配置tailwindcss

我们通过postcss的方式引入tailwindcss，并通过引入maa-frontend首发的style控制系统避免了很多对原有内容的破坏性更新。

这项功能已经完全实装。

参见：

[maa](https://github.com/search?q=repo%3AMaaAssistantArknights%2Fmaa-copilot-frontend%20tailwind&type=code)

[tailwindcss](https://tailwindcss.com/docs/installation/using-postcss)

## 配置render在浏览器而非electron窗口显示

~~配置target设置，指定render的目标位置。~~

~~终止 Electron 应用的运行，然后进入 webpack.render.dev.js 文件中，将 target 属性设置为默认的 web，然后运行 npm run start:render~~


~~同理，改回去之后，就不能在web显示。~~

target是webpack专有的设置。参见[文档](https://webpack.js.org/configuration/target)。

这里用的vite+electron可以直接访问，形如http://localhost:5173/。

效果比webpack差。不过毕竟主要还是面向main process，能看就行了，别要求太多。

**不要自作聪明把localhost换成127.0.0.1 访问会失败**

另注：vite也有一个Build target功能，不过那个是为了配置兼容性目标。参见[vite文档](https://vitejs.dev/config/build-options)

> Browser compatibility target for the final bundle. The default value is a Vite special value, 'modules', which targets browsers with native ES Modules, native ESM dynamic import, and import.meta support. Vite will replace 'modules' to ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14']