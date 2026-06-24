import { BrowserWindow, ipcMain } from 'electron'

import type { RecurringSchedule, SmartRule, TimerStartRequest } from '../shared/app-types'
import type { TimerSettings } from '../shared/scheduler'
import { AppUpdaterService } from './app-updater'
import { TimerService } from './timer-service'

export function registerTimerIpc(timerService: TimerService): void {
  ipcMain.handle('timer:get-state', () => timerService.getAppState())
  ipcMain.handle('timer:start', (_, request: TimerStartRequest) => timerService.start(request))
  ipcMain.handle('timer:cancel', () => timerService.cancel())
  ipcMain.handle('timer:postpone', (_, minutes: number) => timerService.postpone(minutes))
  ipcMain.handle('settings:update', (_, settings: Partial<TimerSettings>) =>
    timerService.updateSettings(settings)
  )
  ipcMain.handle('schedules:save', (_, schedule: RecurringSchedule) =>
    timerService.saveSchedule(schedule)
  )
  ipcMain.handle('schedules:delete', (_, id: string) => timerService.deleteSchedule(id))
  ipcMain.handle('schedules:toggle', (_, id: string, enabled: boolean) =>
    timerService.toggleSchedule(id, enabled)
  )
  ipcMain.handle('smart-rules:save', (_, rule: SmartRule) => timerService.saveSmartRule(rule))
  ipcMain.handle('smart-rules:delete', (_, id: string) => timerService.deleteSmartRule(id))
  ipcMain.handle('smart-rules:toggle', (_, id: string, enabled: boolean) =>
    timerService.toggleSmartRule(id, enabled)
  )
  ipcMain.handle('history:clear', () => timerService.clearHistory())
}

export function registerAppIpc(appUpdaterService: AppUpdaterService): void {
  ipcMain.handle('app:get-info', () => appUpdaterService.getAppInfo())
  ipcMain.handle('app:check-for-updates', () => appUpdaterService.checkForUpdates())
  ipcMain.handle('app:install-update', () => {
    appUpdaterService.installUpdate()
  })
}

export function broadcastState(window: BrowserWindow, timerService: TimerService): void {
  window.webContents.send('timer:state-changed', timerService.getAppState())
}

export function broadcastAppInfo(window: BrowserWindow, appUpdaterService: AppUpdaterService): void {
  window.webContents.send('app:info-changed', appUpdaterService.getAppInfo())
}
