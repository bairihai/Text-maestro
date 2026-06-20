import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronLog } from 'electron-log';

// 目录树功能返回的数据结构
interface TreeNode {
  name: string;
  type: 'directory' | 'file';
  size?: number;
  children?: TreeNode[];
}

interface TreeStats {
  totalSize: number;
  diskTotal: number;
  diskUsed: number;
  diskFree: number;
  percentUsed: number;
}

interface GenerateTreeResult {
  tree?: TreeNode;
  stats?: TreeStats;
  error?: string;
}

// Everything 状态检测的返回类型
interface EverythingStatus {
  installed: boolean;
  running: boolean;
  indexed: boolean;
  indexCount: number;
  indexDate: string;
  httpApi: boolean;
  error?: string;
}

interface OpenEverythingResult {
  success: boolean;
  error?: string;
}

declare global {
  interface Window {
    electron: ElectronAPI
    globals: {
      ipcRenderer: {
        send: (channel: string, ...args: unknown[]) => void;
        invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
        on: (channel: string, listener: (...args: unknown[]) => void) => void;
        once: (channel: string, listener: (...args: unknown[]) => void) => void;
        removeListener: (channel: string, listener: (...args: unknown[]) => void) => void;
      };
      webFrame: {
        setZoomLevel: (level: number) => void;
      };
      log: ElectronLog;
    }
    log: ElectronLog;
  }
}
