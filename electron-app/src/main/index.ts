import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process'); // exec可以在一个shell中运行命令，并在完成后通过回调函数传递stdout和stderr

import log from 'electron-log';

// 配置日志
log.transports.file.level = 'info';
log.transports.console.level = 'debug';

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong!hello world!'))
  ipcMain.on('ping-playground', () => console.log('pong!hello playground!'))

  // IPC 读取文件
  ipcMain.on('read-file', async (event, filePath) => {
    try {
      // 确保路径正确
      const fullPath = path.resolve(filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      event.reply('file-content', data);
    } catch (err) {
      const errorMessage = (err as Error).message;
      event.reply('file-content', `Error: ${errorMessage}`);
    }
  });

  const userDataPath = app.getPath('userData');
  const preferencesPath = path.join(userDataPath, 'preferences.json');

  // 读取preferences偏好设置。注意，我们顶部导入的是fs.promises异步方法，不能sync
  // main进程没有热重载，有问题的话重启试试
  async function readPreferences() {
    try {
      const data = await fs.readFile(preferencesPath, 'utf-8');
      log.info('Main: Read preferences data:', data);
      return JSON.parse(data);
    } catch (error) {
      console.error('Main: Error reading preferences:', error);
      return {};
    }
  }

  // 写入preferences偏好设置。确保是写入其中的preferences.json文件而不是没有后缀名的preferences文件
  function writePreferences(preferences) {
    fs.writeFile(preferencesPath, JSON.stringify(preferences, null, 2));
  }

  ipcMain.handle('get-preferences', async (_, key) => {
    const preferences = await readPreferences();
    log.info('Main: Get preferences for key:', key, 'Value:', preferences[key]);
    return preferences[key];
  });

  ipcMain.handle('set-preferences', (_, newPreferences) => {
    const preferences = readPreferences();
    Object.assign(preferences, newPreferences);
    writePreferences(preferences);
  });

  // // 添加ping方法
  // function pingServer(host: string): Promise<string> {
  //   console.log(`Main: 开始 ping ${host}`);
  //   return new Promise((resolve, reject) => {
  //     exec(`ping -c 4 ${host}`, (error, stdout, stderr) => {
  //       if (error) {
  //         console.error(`Main: Ping 执行出错: ${error.message}`);
  //         reject(`执行出错: ${error.message}`);
  //         return;
  //       }
  //       if (stderr) {
  //         console.error(`Main: Ping stderr: ${stderr}`);
  //         reject(`stderr: ${stderr}`);
  //         return;
  //       }
  //       console.log(`Main: Ping 成功, 结果: ${stdout.substring(0, 100)}...`);
  //       resolve(stdout);
  //     });
  //   });
  // }

  // // 在app.whenReady()中添加IPC处理器
  // ipcMain.handle('ping-server', async (_, host) => {
  //   try {
  //     const result = await pingServer(host);
  //     return result;
  //   } catch (error) {
  //     return `Ping失败: ${error}`;
  //   }
  // });

  // 用nc命令检查连通性，带端口号，并对函数挂载。
  function checkPort(host: string, port: number): Promise<boolean> {
    log.info(`Main: 开始检查 ${host}:${port}`);
    return new Promise((resolve) => {
      exec(`nc -z -w1 ${host} ${port}`, (error) => {
        if (error) {
          log.info(`Main: ${host}:${port} 不可达`);
          resolve(false);
        } else {
          log.info(`Main: ${host}:${port} 可达`);
          resolve(true);
        }
      });
    });
  }

  ipcMain.handle('check-server', async (_, host, port) => {
    log.info(`Main: 收到检查请求，目标: ${host}:${port}`);
    try {
      const isRunning = await checkPort(host, port);
      return isRunning ? '服务器运行中' : '服务器未运行';
    } catch (error) {
      console.error(`Main: 检查失败: ${error}`);
      return `检查失败: ${error}`;
    }
  });

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.
