import type {
  PowerAction,
  RecurringRule,
  ScheduleMode,
  TimerSettings,
  TimerSnapshot,
  TimerStatus
} from './scheduler'
import type { AppInfo } from './app-runtime'

export type TimerStartRequest =
  | {
      mode: 'delay'
      delayMinutes: number
      action: PowerAction
      warningMinutes: number
      soundEnabled: boolean
      label: string
    }
  | {
      mode: 'clock'
      clockTime: string
      action: PowerAction
      warningMinutes: number
      soundEnabled: boolean
      label: string
    }
  | {
      mode: 'recurring'
      targetAt: string
      scheduleId: string
      action: PowerAction
      warningMinutes: number
      soundEnabled: boolean
      label: string
    }

export interface ActiveTimer {
  id: string
  mode: ScheduleMode
  action: PowerAction
  label: string
  targetAt: string
  warningAt: string | null
  warningMinutes: number
  soundEnabled: boolean
  status: TimerStatus
  scheduleId: string | null
  createdAt: string
}

export interface TimerHistoryEntry {
  id: string
  action: PowerAction
  label: string
  targetAt: string
  completedAt: string
  status: 'completed' | 'cancelled' | 'missed'
}

export interface RecurringSchedule {
  id: string
  name: string
  action: PowerAction
  rule: RecurringRule
  warningMinutes: number
  soundEnabled: boolean
  enabled: boolean
}

export type SmartConditionType =
  | 'idle'
  | 'battery-below'
  | 'cpu-below'
  | 'gpu-below'
  | 'network-below'
  | 'download-complete'

export interface SmartRule {
  id: string
  name: string
  condition: SmartConditionType
  action: PowerAction
  durationMinutes: number
  threshold: number
  warningMinutes: number
  soundEnabled: boolean
  enabled: boolean
}

export interface QuickProfile {
  id: string
  name: string
  description: string
  action: PowerAction
  mode: 'delay' | 'clock'
  delayMinutes?: number
  clockTime?: string
  warningMinutes: number
  soundEnabled: boolean
}

export interface AppState {
  timer: TimerSnapshot
  settings: TimerSettings
  schedules: RecurringSchedule[]
  smartRules: SmartRule[]
  profiles: QuickProfile[]
  history: TimerHistoryEntry[]
}

export interface StoreShape {
  settings: TimerSettings
  schedules: RecurringSchedule[]
  smartRules: SmartRule[]
  history: TimerHistoryEntry[]
  activeTimer: ActiveTimer | null
}

export interface TimerApi {
  getState: () => Promise<AppState>
  getAppInfo: () => Promise<AppInfo>
  start: (request: TimerStartRequest) => Promise<AppState>
  cancel: () => Promise<AppState>
  postpone: (minutes: number) => Promise<AppState>
  updateSettings: (settings: Partial<TimerSettings>) => Promise<AppState>
  saveSchedule: (schedule: RecurringSchedule) => Promise<AppState>
  deleteSchedule: (id: string) => Promise<AppState>
  toggleSchedule: (id: string, enabled: boolean) => Promise<AppState>
  saveSmartRule: (rule: SmartRule) => Promise<AppState>
  deleteSmartRule: (id: string) => Promise<AppState>
  toggleSmartRule: (id: string, enabled: boolean) => Promise<AppState>
  clearHistory: () => Promise<AppState>
  onStateChanged: (callback: (state: AppState) => void) => () => void
  onAppInfoChanged: (callback: (info: AppInfo) => void) => () => void
  checkForUpdates: () => Promise<AppInfo>
  installUpdate: () => Promise<void>
  openFullWindow: () => Promise<void>
  openExternal: (url: string) => Promise<void>
  quitApp: () => Promise<void>
}
