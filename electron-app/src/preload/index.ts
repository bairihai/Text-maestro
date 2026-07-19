// electron开发的所有一切都可以在文档找到
// 地址：https://cn.electron-vite.org/guide/

// 这里是预加载脚本，通过构造器BrowserWindow附着于renderer，
// 通过contextBridge全局对象暴露main（IsolatedWorld）的api给renderer（MainWorld）

import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
// 这里使用的是移植来自vscode官方、用一个function包裹起来的参考api，精简了部分暂时用不到的内容
// 详见https://github.com/microsoft/vscode/blob/8c66a69a465e29af2e6dab9147ea051c2c2f4e41/src/vs/base/parts/sandbox/electron-sandbox/preload.js#L17

import log from 'electron-log'; // 暴露log脚本

const { webFrame, ipcRenderer } = require('electron');
function validateIPC(channel) {
  if (!channel || !channel.startsWith('vscode:')) {
    throw new Error(`Unsupported event IPC channel '${channel}'`);
  }

  return true;
}

const globals = {
  ipcRenderer: {
    send(channel, ...args) {
      if (validateIPC(channel)) {
        ipcRenderer.send(channel, ...args);
      }
    },
    invoke(channel, ...args) {
      validateIPC(channel);
      return ipcRenderer.invoke(channel, ...args);
    },
    on(channel, listener) {
      validateIPC(channel);
      ipcRenderer.on(channel, listener);
      return this;
    },
    once(channel, listener) {
      validateIPC(channel);
      ipcRenderer.once(channel, listener);
      return this;
    },
    removeListener(channel, listener) {
      validateIPC(channel);
      ipcRenderer.removeListener(channel, listener);
      return this;
    }
  },
  webFrame: {
    setZoomLevel(level) {
      if (typeof level === 'number') {
        webFrame.setZoomLevel(level);
      }
    }
  },
  log: log
};

// 自定义 API：封装 IPC 调用，供渲染层直接使用
const customAPI = {
  readFileByPath: (filePath: string) => ipcRenderer.invoke('read-file-by-path', filePath),
  readMultipleFiles: (filePaths: string[]) => ipcRenderer.invoke('read-multiple-files', filePaths),
  wordFrequency: (text: string, stopwords: string, customDict: string) => ipcRenderer.invoke('word-frequency', text, stopwords, customDict),
  generateWordcloud: (
    inputContent: string,
    fontPath: string,
    maxFont: number,
    minFont: number,
    margin: number,
    preferH: number,
    mode?: string,
    width?: number,
    height?: number,
    bgColor?: string,
    maskPath?: string,
    maskColorPath?: string,
    contourWidth?: number,
    contourColor?: string,
    stopwords?: string,
    userdict?: string,
    outputFormat?: string,
  ) => ipcRenderer.invoke('generate-wordcloud', inputContent, fontPath, maxFont, minFont, margin, preferH, mode, width, height, bgColor, maskPath, maskColorPath, contourWidth, contourColor, stopwords, userdict, outputFormat),
  generateQrcode: (
    data: string,
    boxSize?: number,
    border?: number,
    errorCorrect?: string,
    fillColor?: string,
    backColor?: string,
    logoPath?: string,
    logoRatio?: number,
    outputWidth?: number,
    outputHeight?: number,
    outputFormat?: string,
  ) => ipcRenderer.invoke('generate-qrcode', data, boxSize, border, errorCorrect, fillColor, backColor, logoPath, logoRatio, outputWidth, outputHeight, outputFormat),
  generateWechat: (
    messagesJson: string,
    theme?: string,
    canvasWidth?: number,
    fontSize?: number,
    fontPath?: string,
    overridesJson?: string,
    showAvatar?: boolean,
    showTime?: boolean,
    title?: string,
    statusBarTime?: string,
    batteryLevel?: number,
    avatarMapJson?: string,
    meName?: string,
    outputFormat?: string,
  ) => ipcRenderer.invoke('generate-wechat', messagesJson, theme, canvasWidth, fontSize, fontPath, overridesJson, showAvatar, showTime, title, statusBarTime, batteryLevel, avatarMapJson, meName, outputFormat),
  weeklyFolder: (fileList: string, timeFormat: string, targetFolder: string, year: number, autoCreate: boolean) => ipcRenderer.invoke('weekly-folder', fileList, timeFormat, targetFolder, year, autoCreate),
  discordTimeSlot: (text: string) => ipcRenderer.invoke('discord-time-slot', text),
  discordPreference: (userText: string, channelText: string) => ipcRenderer.invoke('discord-preference', userText, channelText),
  // 工作流相关 API
  selectFolder: () => ipcRenderer.invoke('dialog:select-folder'),
  saveFolder: () => ipcRenderer.invoke('dialog:save-folder'),
  listFilesByExt: (dir: string, exts: string[]) => ipcRenderer.invoke('list-files-by-ext', dir, exts),
  writeDirectory: (targetDir: string, files: { path: string; content: string }[]) =>
    ipcRenderer.invoke('write-directory', targetDir, files),
  openFolder: (targetDir: string) => ipcRenderer.invoke('open-folder', targetDir),
  // README 查看 / 打开
  readReadme: (which: 'main' | 'project' = 'main') => ipcRenderer.invoke('read-readme', which),
  openReadme: (which: 'main' | 'project' = 'main') => ipcRenderer.invoke('open-readme', which),
};

// 合并标准 electronAPI 和自定义 API
const api = Object.assign({}, electronAPI, customAPI);

// 使用 @electron-toolkit/preload 暴露的 window.electron.ipcRenderer.invoke()
// 具体 IPC 通道直接在渲染层组件中调用（如 check-server、generate-tree、check-everything-status）
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', api)
    contextBridge.exposeInMainWorld('globals', globals)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = api
  // @ts-ignore (define in dts)
  window.globals = globals
}
