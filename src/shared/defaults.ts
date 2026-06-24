import type { QuickProfile, StoreShape } from './app-types'
import type { TimerSettings, TimerSnapshot } from './scheduler'

export const DEFAULT_SETTINGS: TimerSettings = {
  action: 'shutdown',
  warningMinutes: 5,
  soundEnabled: true,
  autoLaunch: false,
  theme: 'system',
  language: 'vi',
  forceCloseApps: true
}

export const DEFAULT_TIMER_SNAPSHOT: TimerSnapshot = {
  status: 'idle',
  action: 'shutdown',
  targetAt: null,
  warningAt: null,
  remainingMs: 0,
  label: 'Chưa có hẹn giờ'
}

export const DEFAULT_PROFILES: QuickProfile[] = [
  {
    id: 'sleep',
    name: 'Ngủ',
    description: 'Tắt máy sau 1 giờ, cảnh báo trước 5 phút.',
    action: 'shutdown',
    mode: 'delay',
    delayMinutes: 60,
    warningMinutes: 5,
    soundEnabled: true
  },
  {
    id: 'study',
    name: 'Học tập',
    description: 'Khóa màn hình sau 45 phút.',
    action: 'lock',
    mode: 'delay',
    delayMinutes: 45,
    warningMinutes: 5,
    soundEnabled: true
  },
  {
    id: 'office',
    name: 'Văn phòng',
    description: 'Tắt máy lúc 18:00.',
    action: 'shutdown',
    mode: 'clock',
    clockTime: '18:00',
    warningMinutes: 10,
    soundEnabled: true
  }
]

export const DEFAULT_STORE: StoreShape = {
  settings: DEFAULT_SETTINGS,
  schedules: [],
  smartRules: [],
  history: [],
  activeTimer: null
}
