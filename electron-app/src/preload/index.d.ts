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
  httpPort: number;
  error?: string;
}

interface OpenEverythingResult {
  success: boolean;
  error?: string;
}

// 自定义 API 的返回类型
interface ReadFileResult {
  success: boolean;
  data?: string;
  error?: string;
}

interface ReadMultipleFilesResult {
  path: string;
  success: boolean;
  data?: string;
  error?: string;
}

interface WordFrequencyResult {
  success: boolean;
  data?: Record<string, number>;
  error?: string;
}

interface WordcloudResult {
  success: boolean;
  data?: string;
  error?: string;
}

// 周回文件夹整理 BAT 脚本生成的返回类型
interface WeeklyFolderResult {
  success: boolean;
  data?: string;
  error?: string;
}

// Discord 分析的返回类型（频道时频统计 / 用户偏好度分析）
interface DiscordAnalysisResult {
  success: boolean;
  data?: string;
  error?: string;
}

// 扩展 ElectronAPI，添加自定义方法
interface CustomElectronAPI extends ElectronAPI {
  readFileByPath: (filePath: string) => Promise<ReadFileResult>;
  readMultipleFiles: (filePaths: string[]) => Promise<ReadMultipleFilesResult[]>;
  wordFrequency: (text: string, stopwords: string, customDict: string) => Promise<WordFrequencyResult>;
  generateWordcloud: (
    inputContent: string,
    fontPath: string,
    maxFont: number,
    minFont: number,
    margin: number,
    preferH: number,
    mode?: string,
    width?: number,
    height?: number,
    bgColor?: string,
    maskPath?: string,
    maskColorPath?: string,
    contourWidth?: number,
    contourColor?: string,
    stopwords?: string,
    userdict?: string,
    outputFormat?: string,
  ) => Promise<WordcloudResult>;
  weeklyFolder: (fileList: string, timeFormat: string, targetFolder: string, year: number, autoCreate: boolean) => Promise<WeeklyFolderResult>;
  discordTimeSlot: (text: string) => Promise<DiscordAnalysisResult>;
  discordPreference: (userText: string, channelText: string) => Promise<DiscordAnalysisResult>;
}

declare global {
  interface Window {
    electron: CustomElectronAPI
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
