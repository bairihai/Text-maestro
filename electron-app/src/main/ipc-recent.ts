/**
 * 最近使用文件 / 目录追踪
 *
 * 独立模块，避免继续膨胀 main/index.ts。
 *
 * 持久化：app.getPath('userData')/recent-files.json
 *
 * 暴露：
 *   - recordRecent(path, type, source?)    供其他 main 进程 handler 调用
 *   - registerRecentIpc(app)               注册 4 个 IPC handler
 *
 * IPC:
 *   - recent:list      → RecentEntry[]
 *   - recent:add       (entry)             → RecentEntry[]
 *   - recent:remove    (path)              → RecentEntry[]
 *   - recent:clear                          → RecentEntry[]
 *
 * 数据结构：同路径多次使用只更新 timestamp / useCount 并置顶，列表上限 50 条。
 */
import { app, ipcMain } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import log from 'electron-log';

export type RecentType = 'file' | 'directory';

export interface RecentEntry {
  path: string;
  type: RecentType;
  source?: string;   // 来源页面/功能标识，如 'folder-tree' / 'workflow'
  timestamp: number; // 最后使用时间（ms）
  useCount: number;  // 累计使用次数
}

const MAX_ENTRIES = 50;

let storagePath = '';

function resolveStoragePath(): string {
  if (!storagePath) {
    storagePath = path.join(app.getPath('userData'), 'recent-files.json');
  }
  return storagePath;
}

function readList(): RecentEntry[] {
  try {
    const p = resolveStoragePath();
    if (!fs.existsSync(p)) return [];
    const txt = fs.readFileSync(p, 'utf-8');
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    log.warn('[Recent] 读取列表失败，按空列表处理:', (err as Error).message);
    return [];
  }
}

function writeList(list: RecentEntry[]): void {
  try {
    fs.writeFileSync(resolveStoragePath(), JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    log.error('[Recent] 写入列表失败:', err);
  }
}

/**
 * 记录一条最近使用项。
 * 同路径重复使用时只更新 timestamp / useCount / source，并置顶。
 * 失败仅日志，不抛错（最近使用是辅助功能，不应影响主流程）。
 */
export function recordRecent(
  rawPath: string,
  type: RecentType,
  source?: string,
): void {
  if (!rawPath || typeof rawPath !== 'string') return;
  const trimmed = rawPath.trim();
  if (!trimmed) return;

  const list = readList();
  const idx = list.findIndex((e) => e.path === trimmed);
  const now = Date.now();

  if (idx >= 0) {
    const existing = list[idx];
    list.splice(idx, 1);
    list.unshift({
      path: trimmed,
      type: existing.type === type ? existing.type : type, // 已有类型优先保留（避免误覆盖）
      source: source ?? existing.source,
      timestamp: now,
      useCount: (existing.useCount || 0) + 1,
    });
  } else {
    list.unshift({ path: trimmed, type, source, timestamp: now, useCount: 1 });
  }

  if (list.length > MAX_ENTRIES) list.length = MAX_ENTRIES;
  writeList(list);
}

/** 注册最近使用相关 IPC handler */
export function registerRecentIpc(): void {
  ipcMain.handle('recent:list', async () => readList());

  ipcMain.handle('recent:add', async (_event, entry: { path: string; type: RecentType; source?: string }) => {
    if (!entry || !entry.path) return readList();
    recordRecent(entry.path, entry.type, entry.source);
    return readList();
  });

  ipcMain.handle('recent:remove', async (_event, targetPath: string) => {
    if (!targetPath) return readList();
    const list = readList().filter((e) => e.path !== targetPath);
    writeList(list);
    return list;
  });

  ipcMain.handle('recent:clear', async () => {
    writeList([]);
    return [];
  });
}
