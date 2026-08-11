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

// 图片生成通用返回类型（二维码、微信聊天记录等文生图功能复用）
interface ImageGenerationResult {
  success: boolean;
  data?: string;       // base64 编码的图片字符串
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

// 工作流：扫描目录下文件的返回类型
interface ListFilesByExtResult {
  success: boolean;
  files: string[];
  error?: string;
}

// 工作流：批量写文件的返回类型
interface WriteDirectoryResult {
  success: boolean;
  count?: number;
  error?: string;
}

// README 读取 / 打开 的返回类型
interface ReadmeResult {
  success: boolean;
  data?: string;
  path?: string;
  error?: string;
}

// 最近使用文件 / 目录追踪
type RecentType = 'file' | 'directory';

interface RecentEntry {
  path: string;
  type: RecentType;
  source?: string;
  timestamp: number;
  useCount: number;
}

interface RecentAddInput {
  path: string;
  type: RecentType;
  source?: string;
}

// 扩展 ElectronAPI，添加自定义方法
interface CustomElectronAPI extends ElectronAPI {
  readFileByPath: (filePath: string) => Promise<ReadFileResult>;
  readFileBinary: (filePath: string) => Promise<{ success: boolean; data?: string; size?: number; error?: string }>;
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
  generateQrcode: (
    data: string,
    boxSize?: number,
    border?: number,
    errorCorrect?: string,    // L / M / Q / H
    fillColor?: string,
    backColor?: string,
    logoPath?: string,
    logoRatio?: number,       // 0.0 - 1.0
    outputWidth?: number,     // 0 表示按 box_size 自然输出
    outputHeight?: number,
    outputFormat?: string,    // png / jpeg / webp
  ) => Promise<ImageGenerationResult>;
  generateWechat: (
    messagesJson: string,     // JSON 字符串，格式见 utils_wechat.py
    theme?: string,           // ios_classic / ios_dark / android
    canvasWidth?: number,
    fontSize?: number,
    fontPath?: string,
    overridesJson?: string,   // 主题颜色覆盖 JSON
    showAvatar?: boolean,
    showTime?: boolean,       // 自动插入时间节点（间隔 >5min）
    title?: string,           // 标题栏文字（联系人名称）
    statusBarTime?: string,   // 顶部状态栏时间，如 "14:32"
    batteryLevel?: number,    // 电量百分比 0-100
    avatarMapJson?: string,   // {sender: avatar_path} 字典 JSON
    meName?: string,          // "我"的发送者名称（默认 '我'）
    outputFormat?: string,    // png / jpeg / webp
  ) => Promise<ImageGenerationResult>;
  weeklyFolder: (fileList: string, timeFormat: string, targetFolder: string, year: number, autoCreate: boolean) => Promise<WeeklyFolderResult>;
  discordTimeSlot: (text: string) => Promise<DiscordAnalysisResult>;
  discordPreference: (userText: string, channelText: string) => Promise<DiscordAnalysisResult>;
  // 工作流相关 API
  selectFolder: () => Promise<string | null>;
  saveFolder: () => Promise<string | null>;
  listFilesByExt: (dir: string, exts: string[]) => Promise<ListFilesByExtResult>;
  writeDirectory: (
    targetDir: string,
    files: { path: string; content: string }[],
  ) => Promise<WriteDirectoryResult>;
  openFolder: (targetDir: string) => Promise<{ success: boolean; error?: string }>;
  // README 查看 / 打开
  readReadme: (which?: 'main' | 'project') => Promise<ReadmeResult>;
  openReadme: (which?: 'main' | 'project') => Promise<ReadmeResult>;
  // 微信聊天记录：文件持久化
  wechatChatLoad: () => Promise<{ success: boolean; data?: unknown; error?: string }>;
  wechatChatSave: (data: unknown) => Promise<{ success: boolean; error?: string }>;
  wechatChatSaveImage: (
    dataUrl: string,
    filename: string,
  ) => Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  // 最近使用文件 / 目录追踪
  recentList: () => Promise<RecentEntry[]>;
  recentAdd: (entry: RecentAddInput) => Promise<RecentEntry[]>;
  recentRemove: (path: string) => Promise<RecentEntry[]>;
  recentClear: () => Promise<RecentEntry[]>;
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
