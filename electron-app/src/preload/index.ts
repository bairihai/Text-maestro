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
  generateWordcloud: (freqJson: string, fontPath: string, maxFont: number, minFont: number, margin: number, preferH: number) => ipcRenderer.invoke('generate-wordcloud', freqJson, fontPath, maxFont, minFont, margin, preferH),
  weeklyFolder: (fileList: string, timeFormat: string, targetFolder: string, year: number, autoCreate: boolean) => ipcRenderer.invoke('weekly-folder', fileList, timeFormat, targetFolder, year, autoCreate),
  discordTimeSlot: (text: string) => ipcRenderer.invoke('discord-time-slot', text),
  discordPreference: (userText: string, channelText: string) => ipcRenderer.invoke('discord-preference', userText, channelText),
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
