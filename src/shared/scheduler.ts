export type PowerAction = 'shutdown' | 'restart' | 'sleep' | 'hibernate' | 'lock' | 'signout'

export type ScheduleMode = 'delay' | 'clock' | 'recurring' | 'smart'

export type TimerStatus = 'idle' | 'scheduled' | 'warning' | 'executing' | 'completed' | 'cancelled'

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface RecurringRule {
  time: string
  weekdays: Weekday[]
}

export interface TimerSettings {
  action: PowerAction
  warningMinutes: number
  soundEnabled: boolean
  autoLaunch: boolean
  theme: 'light' | 'dark' | 'system'
  language: 'vi' | 'en'
  forceCloseApps: boolean
}

export interface TimerSnapshot {
  status: TimerStatus
  action: PowerAction
  targetAt: string | null
  warningAt: string | null
  remainingMs: number
  label: string
}

const MIN_DELAY_MINUTES = 1
const MAX_DELAY_MINUTES = 24 * 60
const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export function isValidDelay(minutes: number): boolean {
  return Number.isFinite(minutes) && minutes >= MIN_DELAY_MINUTES && minutes <= MAX_DELAY_MINUTES
}

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000))
  const seconds = totalSeconds % 60
  const totalMinutes = Math.floor(totalSeconds / 60)
  const minutes = totalMinutes % 60
  const hours = Math.floor(totalMinutes / 60)

  return [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':')
}

export function addDelay(now: Date, delayMinutes: number): Date {
  if (!isValidDelay(delayMinutes)) {
    throw new Error('Delay must be between 1 and 1440 minutes.')
  }

  return new Date(now.getTime() + delayMinutes * 60 * 1000)
}

export function getNextClockTarget(clockTime: string, now: Date): Date {
  const parsed = parseClockTime(clockTime)
  const target = new Date(now)
  target.setHours(parsed.hours, parsed.minutes, 0, 0)

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1)
  }

  return target
}

export function getWarningTime(target: Date, warningMinutes: number): Date | null {
  if (!Number.isFinite(warningMinutes) || warningMinutes <= 0) {
    return null
  }

  const warningAt = new Date(target.getTime() - warningMinutes * 60 * 1000)

  return warningAt.getTime() < target.getTime() ? warningAt : null
}

export function getNextRecurringTarget(rule: RecurringRule, now: Date): Date | null {
  if (rule.weekdays.length === 0) {
    return null
  }

  const parsed = parseClockTime(rule.time)
  const selectedWeekdays = new Set(rule.weekdays)

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const candidate = new Date(now)
    candidate.setDate(candidate.getDate() + dayOffset)
    candidate.setHours(parsed.hours, parsed.minutes, 0, 0)

    if (
      selectedWeekdays.has(candidate.getDay() as Weekday) &&
      candidate.getTime() > now.getTime()
    ) {
      return candidate
    }
  }

  return null
}

export function parseClockTime(clockTime: string): { hours: number; minutes: number } {
  const match = CLOCK_PATTERN.exec(clockTime)

  if (!match) {
    throw new Error('Clock time must use HH:mm format.')
  }

  return {
    hours: Number(match[1]),
    minutes: Number(match[2])
  }
}
