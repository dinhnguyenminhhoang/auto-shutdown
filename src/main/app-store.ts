import Store from 'electron-store'
import { resolveElectronStoreConstructor } from './electron-store-interop'

import type {
  ActiveTimer,
  RecurringSchedule,
  SmartRule,
  StoreShape,
  TimerHistoryEntry
} from '../shared/app-types'
import { DEFAULT_STORE } from '../shared/defaults'
import type { TimerSettings } from '../shared/scheduler'

const ElectronStore = resolveElectronStoreConstructor<typeof Store>(Store)

const store = new ElectronStore<StoreShape>({
  name: 'auto-shutdown-vn',
  defaults: DEFAULT_STORE
})

export function getSettings(): TimerSettings {
  return store.get('settings')
}

export function setSettings(settings: Partial<TimerSettings>): TimerSettings {
  const nextSettings = {
    ...getSettings(),
    ...settings
  }

  store.set('settings', nextSettings)

  return nextSettings
}

export function getSchedules(): RecurringSchedule[] {
  return store.get('schedules')
}

export function setSchedules(schedules: RecurringSchedule[]): RecurringSchedule[] {
  store.set('schedules', schedules)

  return schedules
}

export function getSmartRules(): SmartRule[] {
  return store.get('smartRules')
}

export function setSmartRules(rules: SmartRule[]): SmartRule[] {
  store.set('smartRules', rules)

  return rules
}

export function getHistory(): TimerHistoryEntry[] {
  return store.get('history')
}

export function addHistory(entry: TimerHistoryEntry): TimerHistoryEntry[] {
  const nextHistory = [entry, ...getHistory()].slice(0, 100)
  store.set('history', nextHistory)

  return nextHistory
}

export function clearHistory(): TimerHistoryEntry[] {
  store.set('history', [])

  return []
}

export function getActiveTimer(): ActiveTimer | null {
  return store.get('activeTimer')
}

export function setActiveTimer(timer: ActiveTimer | null): ActiveTimer | null {
  store.set('activeTimer', timer)

  return timer
}
