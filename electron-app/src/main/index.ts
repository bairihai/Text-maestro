import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const fs = require('fs').promises;
const path = require('path');

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

  function readPreferences() {
    try {
      return JSON.parse(fs.readFileSync(preferencesPath, 'utf-8'));
    } catch (error) {
      return {};
    }
  }

  function writePreferences(preferences) {
    fs.writeFileSync(preferencesPath, JSON.stringify(preferences, null, 2));
  }

  ipcMain.handle('get-preferences', (_, key) => {
    const preferences = readPreferences();
    return preferences[key];
  });

  ipcMain.handle('set-preferences', (_, newPreferences) => {
    const preferences = readPreferences();
    Object.assign(preferences, newPreferences);
    writePreferences(preferences);
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
