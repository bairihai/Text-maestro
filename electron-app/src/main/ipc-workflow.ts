/**
 * 工作流相关 IPC handlers
 *
 * 从 main/index.ts 拆分独立模块，避免主进程文件继续膨胀。
 * 包含 4 个 handler：
 *   - dialog:select-folder  原生文件夹选择对话框
 *   - dialog:save-folder    原生文件夹保存对话框
 *   - list-files-by-ext     递归扫描目录下指定扩展名的文件
 *   - write-directory       批量写文件到目标目录
 */
import { ipcMain, dialog, BrowserWindow, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';
import { recordRecent } from './ipc-recent';

/** 注册所有工作流相关 IPC handler */
export function registerWorkflowIpc(): void {
  // === 1. 选择文件夹（打开对话框） ===
  ipcMain.handle('dialog:select-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory'],
      title: '选择文件夹',
    });
    if (result.canceled) return null;
    const selected = result.filePaths[0];
    recordRecent(selected, 'directory', 'workflow-select-folder');
    return selected;
  });

  // === 2. 选择保存文件夹（可创建新目录） ===
  ipcMain.handle('dialog:save-folder', async () => {
    const win = BrowserWindow.getFocusedWindow();
    const result = await dialog.showOpenDialog(win!, {
      properties: ['openDirectory', 'createDirectory'],
      title: '选择输出目录',
    });
    if (result.canceled) return null;
    const selected = result.filePaths[0];
    recordRecent(selected, 'directory', 'workflow-save-folder');
    return selected;
  });

  // === 3. 递归扫描目录下指定扩展名的文件 ===
  // 返回完整路径数组，按路径排序
  ipcMain.handle('list-files-by-ext', async (_event, dir: string, exts: string[]) => {
    try {
      const out: string[] = [];
      const walk = (p: string): void => {
        const entries = fs.readdirSync(p, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(p, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (exts.some((ext) => entry.name.toLowerCase().endsWith(ext.toLowerCase()))) {
            out.push(full);
          }
        }
      };
      walk(dir);
      out.sort();
      log.info(`[Workflow] 扫描目录 ${dir}，找到 ${out.length} 个文件（扩展名: ${exts.join(', ')}）`);
      if (dir) recordRecent(dir, 'directory', 'workflow-list-files');
      return { success: true, files: out };
    } catch (err) {
      log.error('[Workflow] list-files-by-ext 失败:', err);
      return { success: false, files: [], error: (err as Error).message };
    }
  });

  // === 4. 批量写文件到目标目录 ===
  // files: { path: string; content: string }[] — path 为相对路径，支持子目录
  ipcMain.handle(
    'write-directory',
    async (_event, targetDir: string, files: { path: string; content: string }[]) => {
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        let written = 0;
        for (const f of files) {
          const fullPath = path.join(targetDir, f.path);
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(fullPath, f.content, 'utf-8');
          written++;
        }
        log.info(`[Workflow] 写入 ${written} 个文件到 ${targetDir}`);
        if (targetDir) recordRecent(targetDir, 'directory', 'workflow-write-directory');
        return { success: true, count: written };
      } catch (err) {
        log.error('[Workflow] write-directory 失败:', err);
        return { success: false, error: (err as Error).message };
      }
    },
  );

  // === 5. 在系统文件管理器中打开目录 ===
  ipcMain.handle('open-folder', async (_event, targetDir: string) => {
    try {
      if (!targetDir || !fs.existsSync(targetDir)) {
        return { success: false, error: '目录不存在' };
      }
      const errMsg = await shell.openPath(targetDir);
      if (errMsg) {
        log.error(`[Workflow] open-folder 失败: ${errMsg}`);
        return { success: false, error: errMsg };
      }
      log.info(`[Workflow] 已打开目录: ${targetDir}`);
      return { success: true };
    } catch (err) {
      log.error('[Workflow] open-folder 异常:', err);
      return { success: false, error: (err as Error).message };
    }
  });
}
