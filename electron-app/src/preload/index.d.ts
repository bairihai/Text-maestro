import { ElectronAPI } from '@electron-toolkit/preload'
import { ElectronLog } from 'electron-log';

declare global {
  interface Window {
    electron: ElectronAPI
    api: unknown
    log: ElectronLog
  }
}
