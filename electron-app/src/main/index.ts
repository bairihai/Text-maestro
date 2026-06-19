import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const fs = require('fs').promises;
const path = require('path');

import log from 'electron-log';
import net from 'net';

// 目录树节点类型
type TreeNode = {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  children?: TreeNode[];
};

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
  // 优先用环境变量；否则直接尝试 dev server URL，失败再 loadFile
  const devUrl = process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5180/';
  mainWindow.loadURL(devUrl).catch(() => {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  });
}

// 目录树生成：用 Node fs 递归读取目录结构
async function buildTree(dirPath: string, maxDepth: number, currentDepth: number, includeStats: boolean): Promise<TreeNode> {
  const name = path.basename(dirPath);
  const stat = await fs.stat(dirPath);
  const node: TreeNode = {
    name,
    type: 'directory',
  };
  if (includeStats) {
    node.size = stat.size;
  }
  if (currentDepth >= maxDepth) {
    return node;
  }
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const children: TreeNode[] = [];
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    try {
      if (entry.isDirectory()) {
        children.push(await buildTree(entryPath, maxDepth, currentDepth + 1, includeStats));
      } else if (entry.isFile()) {
        const childNode: TreeNode = { name: entry.name, type: 'file' };
        if (includeStats) {
          const fileStat = await fs.stat(entryPath);
          childNode.size = fileStat.size;
        }
        children.push(childNode);
      }
    } catch (err) {
      // 跳过无权限访问的条目
      log.warn(`Main: 跳过无权限条目: ${entryPath}`, err);
    }
  }
  node.children = children;
  return node;
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

  ipcMain.handle('set-preferences', async (_, newPreferences) => {
    try {
      const preferences = await readPreferences();
      Object.assign(preferences, newPreferences);
      writePreferences(preferences);
    } catch (error) {
      log.error('Main: Error writing preferences:', error);
    }
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
  // 2024年9月24日 10点20分 取消nc命令改用net模块。原因：nc命令需要另行安装以及添加到环境变量，难以跨平台兼容。
  function checkPort(host: string, port: number): Promise<boolean> {
    log.info(`Main: 开始检查 ${host}:${port}`);
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(1000);  // 1秒超时
      
      socket.connect(port, host, () => {
        socket.destroy();
        log.info(`Main: ${host}:${port} 可达`);
        resolve(true);
      });

      socket.on('error', () => {
        log.info(`Main: ${host}:${port} 不可达`);
        resolve(false);
      });

      socket.on('timeout', () => {
        socket.destroy();
        log.info(`Main: ${host}:${port} 连接超时`);
        resolve(false);
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

  ipcMain.handle('generate-tree', async (_, dirPath: string, maxDepth: number = 3, includeStats: boolean = false) => {
    try {
      const fullPath = path.resolve(dirPath);
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        return { error: '指定路径不是目录' };
      }
      const tree = await buildTree(fullPath, maxDepth, 0, includeStats);
      const result: any = { tree };
      if (includeStats) {
        // 计算目录总大小（递归）
        const calcSize = async (node: TreeNode): Promise<number> => {
          if (node.type === 'file') return node.size || 0;
          if (!node.children) return 0;
          let total = 0;
          for (const child of node.children) {
            total += await calcSize(child);
          }
          return total;
        };
        const totalSize = await calcSize(tree);
        // 硬盘信息：Node 用 fs.statfs（Node 18+，Electron 31 自带 Node 20+）
        const statfs: any = await fs.statfs(fullPath);
        const diskTotal = statfs.blocks * statfs.bsize;
        const diskFree = statfs.bfree * statfs.bsize;
        const diskUsed = diskTotal - diskFree;
        result.stats = {
          totalSize,
          diskTotal,
          diskUsed,
          diskFree,
          percentUsed: (totalSize / diskTotal) * 100
        };
      }
      return result;
    } catch (error) {
      const msg = (error as Error).message;
      log.error(`Main: generate-tree 失败: ${msg}`);
      return { error: msg };
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
