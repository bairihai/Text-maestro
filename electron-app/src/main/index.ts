import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');

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

// 目录树生成：用 fs.readdir withFileTypes 单层遍历，零额外 stat 调用
// 与 Python os.walk 风格一致，但按深度限制，性能与 Gradio 版本持平
async function buildTree(dirPath: string, maxDepth: number): Promise<TreeNode> {
  const rootName = path.basename(dirPath) || dirPath;
  const root: TreeNode = { name: rootName, type: 'directory', children: [] };

  // 栈：[节点, 绝对路径, 当前深度]
  const stack: Array<{ node: TreeNode; absPath: string; depth: number }> = [
    { node: root, absPath: dirPath, depth: 0 }
  ];

  while (stack.length > 0) {
    const { node, absPath, depth } = stack.pop()!;
    if (depth >= maxDepth) continue;

    try {
      const entries = await fs.readdir(absPath, { withFileTypes: true });
      const childNodes: TreeNode[] = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const child: TreeNode = { name: entry.name, type: 'directory', children: [] };
          childNodes.push(child);
          // 子目录入栈，继续展开
          stack.push({
            node: child,
            absPath: path.join(absPath, entry.name),
            depth: depth + 1
          });
        } else if (entry.isFile()) {
          childNodes.push({ name: entry.name, type: 'file' });
        }
      }

      // 排序：目录在前，文件在后，按名称字母序
      childNodes.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children = childNodes;
    } catch (err) {
      log.warn(`Main: 跳过无权限目录: ${absPath}`);
    }
  }

  return root;
}

// 目录大小统计：单层遍历 + 仅文件调用 stat
async function calcDirectorySize(dirPath: string): Promise<number> {
  let total = 0;
  const stack: string[] = [dirPath];

  while (stack.length > 0) {
    const current = stack.pop()!;
    try {
      const entries = await fs.readdir(current, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          stack.push(path.join(current, entry.name));
        } else if (entry.isFile()) {
          try {
            const stat = await fs.stat(path.join(current, entry.name));
            total += stat.size;
          } catch {
            // 单个文件 stat 失败忽略
          }
        }
      }
    } catch (err) {
      log.warn(`Main: 跳过无权限目录(统计): ${current}`);
    }
  }

  return total;
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

  ipcMain.handle('generate-tree', async (_, dirPath: string, maxDepth: number = 3, includeStats: boolean = false, useGradio: boolean = false) => {
    const startTotal = Date.now();
    try {
      const fullPath = path.resolve(dirPath);
      const stat = await fs.stat(fullPath);
      if (!stat.isDirectory()) {
        return { error: '指定路径不是目录' };
      }

      // ============== Gradio/Python 加速模式 ==============
      if (useGradio) {
        const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
        const pyResult = await new Promise<string>((resolve) => {
          exec(`${pyCmd} --version`, (_err: Error | null, stdout: string, stderr: string) => {
            resolve((stdout || stderr || '').trim());
          });
        });
        const pyAvailable = /^Python\s+\d/i.test(pyResult) || pyResult.includes('Python');

        if (pyAvailable) {
          // 脚本位置：和 index.js 同目录的 py/generate_tree.py
          const scriptPath = path.join(__dirname, 'py', 'generate_tree.py');
          log.info(`[GradioTree] 调用 Python 脚本: ${scriptPath}, 参数=${fullPath} depth=${maxDepth} stats=${includeStats}`);

          try {
            const output = await new Promise<string>((resolve, reject) => {
              const childProc = exec(
                `${pyCmd} "${scriptPath}" "${fullPath}" "${maxDepth}" "${includeStats ? 1 : 0}"`,
                { timeout: 30000, maxBuffer: 20 * 1024 * 1024 },
                (_err: Error | null, stdout: string, stderr: string) => {
                  if (_err) {
                    log.error('[GradioTree] Python 执行错误:', _err.message, stderr);
                    reject(_err);
                  } else {
                    resolve(stdout.trim());
                  }
                }
              );
              setTimeout(() => {
                try { childProc.kill(); } catch { /* ignore */ }
              }, 30000);
            });

            const parsed = JSON.parse(output);
            log.info(`[GradioTree] Python 脚本返回成功 (总耗时 ${Date.now() - startTotal}ms)`);
            return parsed;
          } catch (err) {
            log.warn('[GradioTree] Python 脚本失败，降级到 Node.js fs 方式:', err);
          }
        } else {
          log.info(`[GradioTree] Python 不可用 (${pyResult})，降级到 Node.js fs 方式`);
        }
      }

      // ============== 优化后的 fs 模式：tree/stats 并发 ==============
      const treePromise = buildTree(fullPath, maxDepth);
      const statsTask = includeStats
        ? Promise.all([calcDirectorySize(fullPath), fs.statfs(fullPath).catch(() => null)])
        : null;

      const tree = await treePromise;
      const result: any = { tree, accelerated: false };
      if (statsTask) {
        const [totalSize, statfs] = await statsTask;
        if (statfs) {
          const diskTotal = statfs.blocks * statfs.bsize;
          const diskFree = statfs.bfree * statfs.bsize;
          const diskUsed = diskTotal - diskFree;
          result.stats = {
            totalSize,
            diskTotal,
            diskUsed,
            diskFree,
            percentUsed: diskTotal > 0 ? (totalSize / diskTotal) * 100 : 0,
          };
        }
      }

      log.info(`[FSTree] 总耗时: ${Date.now() - startTotal}ms`);
      return result;
    } catch (error) {
      const msg = (error as Error).message;
      log.error(`Main: generate-tree 失败: ${msg}`);
      return { error: msg };
    }
  });

  // 检查 Python 环境（用于 Gradio 加速/脚本调用）
  ipcMain.handle('check-gradio-status', async () => {
    log.info('[Main] check-gradio-status 被调用');
    const cmd = process.platform === 'win32' ? 'python --version' : 'python3 --version';
    try {
      const { stdout, stderr }: any = await new Promise((resolve) => {
        exec(cmd, (_err: Error | null, stdout: string, stderr: string) => {
          resolve({ stdout, stderr });
        });
      });
      const versionOut = (stdout || stderr || '').trim();
      const available = versionOut.includes('Python') || /^Python\s+\d/i.test(versionOut);
      log.info(`[Main] Python 版本 = ${versionOut}, 可用 = ${available}`);
      return {
        available,
        version: versionOut.replace('Python ', '').trim() || '',
        error: available ? '' : `未检测到 Python: ${versionOut || '无输出'}`,
      };
    } catch (e) {
      log.info('[Main] Python 环境检测失败', e);
      return {
        available: false,
        version: '',
        error: String(e),
      };
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
