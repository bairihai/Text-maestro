// electron开发的所有一切都可以在文档找到
// 地址：https://cn.electron-vite.org/guide/

// 这里是预加载脚本，通过构造器BrowserWindow附着于renderer，
// 通过contextBridge全局对象暴露main（IsolatedWorld）的api给renderer（MainWorld）

import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
