import { ElectronAPI } from '@electron-toolkit/preload'
import type { TimerApi } from '../shared/app-types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: TimerApi
  }
}
