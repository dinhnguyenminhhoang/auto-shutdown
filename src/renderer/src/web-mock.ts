import type {
  ActiveTimer,
  AppState,
  RecurringSchedule,
  SmartRule,
  TimerApi,
  TimerStartRequest
} from '../../shared/app-types'
import { createDefaultAppInfo, type AppInfo } from '../../shared/app-runtime'
import { DEFAULT_PROFILES, DEFAULT_SETTINGS, DEFAULT_TIMER_SNAPSHOT } from '../../shared/defaults'

// Load from localStorage or defaults
const getLocalStorageJSON = (key: string, defaultValue: unknown): any => {
  try {
    const val = localStorage.getItem(key)
    return val ? JSON.parse(val) : defaultValue
  } catch {
    return defaultValue
  }
}

const saveLocalStorageJSON = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error(e)
  }
}

const listeners = new Set<(state: AppState) => void>()
const appInfoListeners = new Set<(info: AppInfo) => void>()

let settings = getLocalStorageJSON('settings', DEFAULT_SETTINGS)
let schedules = getLocalStorageJSON('schedules', [])
let smartRules = getLocalStorageJSON('smartRules', [])
let history = getLocalStorageJSON('history', [])
let activeTimer: ActiveTimer | null = getLocalStorageJSON('activeTimer', null)
let appInfo: AppInfo = {
  ...createDefaultAppInfo('dev'),
  update: {
    ...createDefaultAppInfo('dev').update,
    status: 'disabled',
    message: 'Tự động cập nhật không hoạt động trong bản xem trước'
  }
}

let timerInterval: NodeJS.Timeout | null = null

const getTimerSnapshot = (): typeof DEFAULT_TIMER_SNAPSHOT => {
  if (!activeTimer) {
    return DEFAULT_TIMER_SNAPSHOT
  }
  const now = Date.now()
  const targetTime = new Date(activeTimer.targetAt).getTime()
  const warningTime = activeTimer.warningAt ? new Date(activeTimer.warningAt).getTime() : null
  const remainingMs = Math.max(0, targetTime - now)

  let status: 'idle' | 'scheduled' | 'warning' = 'scheduled'
  if (remainingMs === 0) {
    status = 'idle'
  } else if (warningTime && now >= warningTime) {
    status = 'warning'
  }

  return {
    status,
    action: activeTimer.action,
    targetAt: activeTimer.targetAt,
    warningAt: activeTimer.warningAt,
    remainingMs,
    label: activeTimer.label
  }
}

const getAppState = (): AppState => {
  return {
    timer: getTimerSnapshot(),
    settings,
    schedules,
    smartRules,
    profiles: DEFAULT_PROFILES,
    history
  }
}

const notifyChanged = (): void => {
  const state = getAppState()
  listeners.forEach((callback) => callback(state))
}

const notifyAppInfoChanged = (): void => {
  appInfoListeners.forEach((callback) => callback(appInfo))
}

const startTimerPolling = (): void => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = setInterval(() => {
    if (activeTimer) {
      const now = Date.now()
      const targetTime = new Date(activeTimer.targetAt).getTime()
      if (now >= targetTime) {
        // Complete timer
        const completedEntry = {
          id: activeTimer.id,
          action: activeTimer.action,
          label: activeTimer.label,
          targetAt: activeTimer.targetAt,
          completedAt: new Date().toISOString(),
          status: 'completed' as const
        }
        history = [completedEntry, ...history].slice(0, 100)
        saveLocalStorageJSON('history', history)
        activeTimer = null
        saveLocalStorageJSON('activeTimer', null)
        if (timerInterval) {
          clearInterval(timerInterval)
          timerInterval = null
        }
      }
      notifyChanged()
    }
  }, 1000)
}

// Resume polling if there is an active timer loaded
if (activeTimer) {
  startTimerPolling()
}

export const webMockApi: TimerApi = {
  getState: async () => getAppState(),
  getAppInfo: async () => appInfo,
  start: async (request: TimerStartRequest) => {
    const now = new Date()
    let targetAt: Date
    if (request.mode === 'delay') {
      targetAt = new Date(now.getTime() + request.delayMinutes * 60 * 1000)
    } else if (request.mode === 'clock') {
      const [hours, minutes] = request.clockTime.split(':').map(Number)
      targetAt = new Date()
      targetAt.setHours(hours, minutes, 0, 0)
      if (targetAt.getTime() <= now.getTime()) {
        targetAt.setDate(targetAt.getDate() + 1)
      }
    } else {
      targetAt = new Date(request.targetAt)
    }

    const warningAt =
      request.warningMinutes > 0 ? new Date(targetAt.getTime() - request.warningMinutes * 60 * 1000) : null

    activeTimer = {
      id: Math.random().toString(36).substring(7),
      mode: request.mode,
      action: request.action,
      label: request.label || 'Hẹn giờ',
      targetAt: targetAt.toISOString(),
      warningAt: warningAt ? warningAt.toISOString() : null,
      warningMinutes: request.warningMinutes,
      soundEnabled: request.soundEnabled,
      status: 'scheduled',
      scheduleId: request.mode === 'recurring' ? request.scheduleId : null,
      createdAt: now.toISOString()
    }
    saveLocalStorageJSON('activeTimer', activeTimer)
    startTimerPolling()
    notifyChanged()
    return getAppState()
  },
  cancel: async () => {
    if (activeTimer) {
      const cancelledEntry = {
        id: activeTimer.id,
        action: activeTimer.action,
        label: activeTimer.label,
        targetAt: activeTimer.targetAt,
        completedAt: new Date().toISOString(),
        status: 'cancelled' as const
      }
      history = [cancelledEntry, ...history].slice(0, 100)
      saveLocalStorageJSON('history', history)
    }
    activeTimer = null
    saveLocalStorageJSON('activeTimer', null)
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    notifyChanged()
    return getAppState()
  },
  postpone: async (minutes: number) => {
    if (activeTimer) {
      const currentTarget = new Date(activeTimer.targetAt).getTime()
      const nextTarget = new Date(currentTarget + minutes * 60 * 1000)
      activeTimer.targetAt = nextTarget.toISOString()
      if (activeTimer.warningAt) {
        const currentWarning = new Date(activeTimer.warningAt).getTime()
        activeTimer.warningAt = new Date(currentWarning + minutes * 60 * 1000).toISOString()
      }
      saveLocalStorageJSON('activeTimer', activeTimer)
      notifyChanged()
    }
    return getAppState()
  },
  updateSettings: async (newSettings: Partial<typeof settings>) => {
    settings = { ...settings, ...newSettings }
    saveLocalStorageJSON('settings', settings)
    notifyChanged()
    return getAppState()
  },
  saveSchedule: async (schedule: RecurringSchedule) => {
    const index = schedules.findIndex((s: any) => s.id === schedule.id)
    if (index >= 0) {
      schedules[index] = schedule
    } else {
      schedules.push(schedule)
    }
    saveLocalStorageJSON('schedules', schedules)
    notifyChanged()
    return getAppState()
  },
  deleteSchedule: async (id: string) => {
    schedules = schedules.filter((s: any) => s.id !== id)
    saveLocalStorageJSON('schedules', schedules)
    notifyChanged()
    return getAppState()
  },
  toggleSchedule: async (id: string, enabled: boolean) => {
    schedules = schedules.map((s: any) => (s.id === id ? { ...s, enabled } : s))
    saveLocalStorageJSON('schedules', schedules)
    notifyChanged()
    return getAppState()
  },
  saveSmartRule: async (rule: SmartRule) => {
    const index = smartRules.findIndex((r: any) => r.id === rule.id)
    if (index >= 0) {
      smartRules[index] = rule
    } else {
      smartRules.push(rule)
    }
    saveLocalStorageJSON('smartRules', smartRules)
    notifyChanged()
    return getAppState()
  },
  deleteSmartRule: async (id: string) => {
    smartRules = smartRules.filter((r: any) => r.id !== id)
    saveLocalStorageJSON('smartRules', smartRules)
    notifyChanged()
    return getAppState()
  },
  toggleSmartRule: async (id: string, enabled: boolean) => {
    smartRules = smartRules.map((r: any) => (r.id === id ? { ...r, enabled } : r))
    saveLocalStorageJSON('smartRules', smartRules)
    notifyChanged()
    return getAppState()
  },
  clearHistory: async () => {
    history = []
    saveLocalStorageJSON('history', history)
    notifyChanged()
    return getAppState()
  },
  onStateChanged: (callback) => {
    listeners.add(callback)
    return () => {
      listeners.delete(callback)
    }
  },
  onAppInfoChanged: (callback) => {
    appInfoListeners.add(callback)
    return () => {
      appInfoListeners.delete(callback)
    }
  },
  checkForUpdates: async () => {
    appInfo = {
      ...appInfo,
      update: {
        ...appInfo.update,
        status: 'disabled',
        message: 'Tự động cập nhật không hoạt động trong bản xem trước'
      }
    }
    notifyAppInfoChanged()
    return appInfo
  },
  installUpdate: async () => {
    console.log('Mock: installUpdate called')
  },
  openFullWindow: async () => {
    console.log('Mock: openFullWindow called')
  },
  openExternal: async (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  },
  quitApp: async () => {
    console.log('Mock: quitApp called')
  }
}
