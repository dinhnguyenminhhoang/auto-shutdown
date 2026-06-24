import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { RecurringSchedule, SmartRule, TimerApi, TimerStartRequest } from '../shared/app-types'
import type { TimerSettings } from '../shared/scheduler'

// Custom APIs for renderer
const api: TimerApi = {
  getState: () => ipcRenderer.invoke('timer:get-state'),
  getAppInfo: () => ipcRenderer.invoke('app:get-info'),
  start: (request: TimerStartRequest) => ipcRenderer.invoke('timer:start', request),
  cancel: () => ipcRenderer.invoke('timer:cancel'),
  postpone: (minutes: number) => ipcRenderer.invoke('timer:postpone', minutes),
  updateSettings: (settings: Partial<TimerSettings>) =>
    ipcRenderer.invoke('settings:update', settings),
  saveSchedule: (schedule: RecurringSchedule) => ipcRenderer.invoke('schedules:save', schedule),
  deleteSchedule: (id: string) => ipcRenderer.invoke('schedules:delete', id),
  toggleSchedule: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('schedules:toggle', id, enabled),
  saveSmartRule: (rule: SmartRule) => ipcRenderer.invoke('smart-rules:save', rule),
  deleteSmartRule: (id: string) => ipcRenderer.invoke('smart-rules:delete', id),
  toggleSmartRule: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('smart-rules:toggle', id, enabled),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  onStateChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, state: Parameters<typeof callback>[0]): void => {
      callback(state)
    }

    ipcRenderer.on('timer:state-changed', listener)

    return () => ipcRenderer.removeListener('timer:state-changed', listener)
  },
  onAppInfoChanged: (callback) => {
    const listener = (_event: IpcRendererEvent, info: Parameters<typeof callback>[0]): void => {
      callback(info)
    }

    ipcRenderer.on('app:info-changed', listener)

    return () => ipcRenderer.removeListener('app:info-changed', listener)
  },
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('app:install-update'),
  openFullWindow: () => ipcRenderer.invoke('app:open-full-window'),
  openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
  quitApp: () => ipcRenderer.invoke('app:quit')
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
