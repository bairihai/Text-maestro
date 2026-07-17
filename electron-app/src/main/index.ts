import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { registerWorkflowIpc } from './ipc-workflow'

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
    icon,
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
  // 使用应用专属 ID，避免 Windows 任务栏回退到 electron.exe 默认图标
  electronApp.setAppUserModelId('com.textmaestro.app')

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

  // 读取指定路径文件（utf-8）
  ipcMain.handle('read-file-by-path', async (_, filePath: string) => {
    try {
      const fullPath = path.resolve(filePath);
      const data = await fs.readFile(fullPath, 'utf8');
      return { success: true, data };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // 批量读取文件
  ipcMain.handle('read-multiple-files', async (_, filePaths: string[]) => {
    const results: Array<{ path: string; success: boolean; data?: string; error?: string }> = [];
    for (const fp of filePaths) {
      try {
        const fullPath = path.resolve(fp);
        const data = await fs.readFile(fullPath, 'utf8');
        results.push({ path: fp, success: true, data });
      } catch (err) {
        results.push({ path: fp, success: false, error: (err as Error).message });
      }
    }
    return results;
  });

  // 词频统计（Python jieba 加速）
  ipcMain.handle('word-frequency', async (_, text: string, stopwords: string, customDict: string) => {
    try {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.join(__dirname, 'py', 'word_frequency.py');
      log.info(`[WordFreq] 调用 Python 脚本: ${scriptPath}`);

      // 用 stdin 传递文本参数（避免命令行长度限制）
      const output = await new Promise<string>((resolve, reject) => {
        const child = exec(
          `${pyCmd} "${scriptPath}" "${text.replace(/"/g, '\\"')}" "${stopwords.replace(/"/g, '\\"')}" "${customDict.replace(/"/g, '\\"')}"`,
          { timeout: 60000, maxBuffer: 20 * 1024 * 1024 },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) {
              log.error('[WordFreq] Python 执行错误:', err.message, stderr);
              reject(err);
            } else {
              resolve(stdout.trim());
            }
          }
        );
        setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, 60000);
      });

      return JSON.parse(output);
    } catch (err) {
      log.error('[WordFreq] 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // 计算 gradio-app 目录路径（供 Python 脚本通过 sys.path.insert 引入）
  const gradioAppPath = path.resolve(__dirname, '..', '..', '..', 'gradio-app');

  // 词云图生成（Python wordcloud 加速，增强版集成自 AlionSSS/wordcloud-webui Apache-2.0）
  // 支持三种模式: freq（频率表）/ text（文本直输）/ mask（Mask 蒙版）
  ipcMain.handle('generate-wordcloud', async (
    _,
    inputContent: string,
    fontPath: string,
    maxFont: number,
    minFont: number,
    margin: number,
    preferH: number,
    mode: string = 'freq',
    width: number = 400,
    height: number = 200,
    bgColor: string = 'white',
    maskPath: string = '',
    maskColorPath: string = '',
    contourWidth: number = 3,
    contourColor: string = 'steelblue',
    stopwords: string = '',
    userdict: string = '',
    outputFormat: string = 'png',
  ) => {
    try {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.join(__dirname, 'py', 'generate_wordcloud.py');
      log.info(`[WordCloud] 调用 Python 脚本: ${scriptPath} (mode=${mode})`);

      // 将输入内容（频率表 JSON 或原始文本）写入临时文件
      const tempFile = path.join(app.getPath('temp'), `wordcloud_input_${Date.now()}.txt`);
      await fs.writeFile(tempFile, inputContent, 'utf-8');

      // 构建命令行参数（顺序与 generate_wordcloud.py 的 sys.argv 对应）
      const args = [
        `"${tempFile}"`,
        `"${fontPath}"`,
        `${maxFont}`,
        `${minFont}`,
        `${margin}`,
        `${preferH}`,
        `${mode}`,
        `${width}`,
        `${height}`,
        `${bgColor}`,
        maskPath ? `"${maskPath}"` : '""',
        maskColorPath ? `"${maskColorPath}"` : '""',
        `${contourWidth}`,
        `${contourColor}`,
        stopwords ? `"${stopwords}"` : '""',
        userdict ? `"${userdict}"` : '""',
        `${outputFormat}`,
      ].join(' ');

      const output = await new Promise<string>((resolve, reject) => {
        const child = exec(
          `${pyCmd} "${scriptPath}" ${args}`,
          { timeout: 60000, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, GRADIO_APP_PATH: gradioAppPath } },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) {
              log.error('[WordCloud] Python 执行错误:', err.message, stderr);
              reject(err);
            } else {
              resolve(stdout.trim());
            }
          }
        );
        setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, 60000);
      });

      // 清理临时文件
      await fs.unlink(tempFile).catch(() => {});

      return JSON.parse(output);
    } catch (err) {
      log.error('[WordCloud] 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // 周回文件夹整理 BAT 脚本生成（Python 加速）
  ipcMain.handle('weekly-folder', async (_, fileList: string, timeFormat: string, targetFolder: string, year: number, autoCreate: boolean) => {
    try {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.join(__dirname, 'py', 'weekly_folder.py');
      log.info(`[WeeklyFolder] 调用 Python 脚本: ${scriptPath}`);

      // 将文件列表写入临时文件（避免命令行长度限制）
      const tempFile = path.join(app.getPath('temp'), `weekly_folder_list_${Date.now()}.txt`);
      await fs.writeFile(tempFile, fileList, 'utf-8');

      const output = await new Promise<string>((resolve, reject) => {
        const child = exec(
          `${pyCmd} "${scriptPath}" "${tempFile}" "${timeFormat}" "${targetFolder}" "${year}" "${autoCreate ? 1 : 0}"`,
          { timeout: 60000, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, GRADIO_APP_PATH: gradioAppPath } },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) {
              log.error('[WeeklyFolder] Python 执行错误:', err.message, stderr);
              reject(err);
            } else {
              resolve(stdout.trim());
            }
          }
        );
        setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, 60000);
      });

      // 清理临时文件
      await fs.unlink(tempFile).catch(() => {});

      return JSON.parse(output);
    } catch (err) {
      log.error('[WeeklyFolder] 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // Discord 频道时频统计（Python pandas 加速）
  ipcMain.handle('discord-time-slot', async (_, text: string) => {
    try {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.join(__dirname, 'py', 'discord_analysis.py');
      log.info(`[DiscordTimeSlot] 调用 Python 脚本: ${scriptPath}`);

      // 将文本写入临时文件（避免命令行长度限制）
      const tempFile = path.join(app.getPath('temp'), `discord_timeslot_${Date.now()}.txt`);
      await fs.writeFile(tempFile, text, 'utf-8');

      const output = await new Promise<string>((resolve, reject) => {
        const child = exec(
          `${pyCmd} "${scriptPath}" "time_slot" "${tempFile}"`,
          { timeout: 60000, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, GRADIO_APP_PATH: gradioAppPath } },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) {
              log.error('[DiscordTimeSlot] Python 执行错误:', err.message, stderr);
              reject(err);
            } else {
              resolve(stdout.trim());
            }
          }
        );
        setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, 60000);
      });

      // 清理临时文件
      await fs.unlink(tempFile).catch(() => {});

      return JSON.parse(output);
    } catch (err) {
      log.error('[DiscordTimeSlot] 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // Discord 用户偏好度分析（Python pandas 加速）
  ipcMain.handle('discord-preference', async (_, userText: string, channelText: string) => {
    try {
      const pyCmd = process.platform === 'win32' ? 'python' : 'python3';
      const scriptPath = path.join(__dirname, 'py', 'discord_analysis.py');
      log.info(`[DiscordPreference] 调用 Python 脚本: ${scriptPath}`);

      // 将两段文本分别写入临时文件（避免命令行长度限制）
      const tempUserFile = path.join(app.getPath('temp'), `discord_pref_user_${Date.now()}.txt`);
      const tempChannelFile = path.join(app.getPath('temp'), `discord_pref_channel_${Date.now()}.txt`);
      await fs.writeFile(tempUserFile, userText, 'utf-8');
      await fs.writeFile(tempChannelFile, channelText, 'utf-8');

      const output = await new Promise<string>((resolve, reject) => {
        const child = exec(
          `${pyCmd} "${scriptPath}" "preference" "${tempUserFile}" "${tempChannelFile}"`,
          { timeout: 60000, maxBuffer: 20 * 1024 * 1024, env: { ...process.env, GRADIO_APP_PATH: gradioAppPath } },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) {
              log.error('[DiscordPreference] Python 执行错误:', err.message, stderr);
              reject(err);
            } else {
              resolve(stdout.trim());
            }
          }
        );
        setTimeout(() => { try { child.kill(); } catch { /* ignore */ } }, 60000);
      });

      // 清理临时文件
      await fs.unlink(tempUserFile).catch(() => {});
      await fs.unlink(tempChannelFile).catch(() => {});

      return JSON.parse(output);
    } catch (err) {
      log.error('[DiscordPreference] 失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // 注册工作流相关 IPC handler（dialog / list-files / write-directory）
  registerWorkflowIpc()

  // === README 查看 / 打开 ===
  // 候选路径：
  //   1) 打包后 extraResources 中的 README.md（process.resourcesPath）
  //   2) 开发态项目根目录的 README.md（electron-app/out/main → 上溯 3 级）
  //   3) Electron 自带 README.md（electron-app/README.md，开发态可用）
  function resolveReadmePath(which: 'main' | 'project' = 'main'): string | null {
    const filename = which === 'project' ? 'README-project.md' : 'README.md';
    const candidates: string[] = [
      path.join(process.resourcesPath, filename),                  // 打包后
      path.resolve(__dirname, '..', '..', '..', filename),         // dev: out/main → ../../../
      path.resolve(__dirname, '..', '..', '..', 'electron-app', filename), // electron-app 子 README
    ];
    for (const p of candidates) {
      try {
        if (fs.existsSync(p) && fs.statSync(p).isFile()) {
          return p;
        }
      } catch {
        // 忽略：路径不可访问
      }
    }
    return null;
  }

  // 读取 README 内容（默认主 README，可通过参数指定 README-project）
  ipcMain.handle('read-readme', async (_event, which: 'main' | 'project' = 'main') => {
    try {
      const readmePath = resolveReadmePath(which);
      if (!readmePath) {
        return { success: false, error: `未找到 README 文件（已查找 resourcesPath 与项目根目录）` };
      }
      const data = await fs.readFile(readmePath, 'utf8');
      log.info(`[Readme] 读取 ${readmePath}（${data.length} 字符）`);
      return { success: true, data, path: readmePath };
    } catch (err) {
      log.error('[Readme] 读取失败:', err);
      return { success: false, error: (err as Error).message };
    }
  });

  // 用系统默认应用打开 README 文件
  ipcMain.handle('open-readme', async (_event, which: 'main' | 'project' = 'main') => {
    try {
      const readmePath = resolveReadmePath(which);
      if (!readmePath) {
        return { success: false, error: `未找到 README 文件` };
      }
      const errMsg = await shell.openPath(readmePath);
      if (errMsg) {
        log.error(`[Readme] openPath 失败: ${errMsg}`);
        return { success: false, error: errMsg };
      }
      log.info(`[Readme] 已用系统默认应用打开: ${readmePath}`);
      return { success: true, path: readmePath };
    } catch (err) {
      log.error('[Readme] 打开失败:', err);
      return { success: false, error: (err as Error).message };
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
