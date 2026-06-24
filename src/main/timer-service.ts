import { EventEmitter } from 'events'

import {
  addHistory,
  clearHistory,
  getActiveTimer,
  getHistory,
  getSchedules,
  getSettings,
  getSmartRules,
  setActiveTimer,
  setSchedules,
  setSmartRules,
  setSettings
} from './app-store'
import type {
  ActiveTimer,
  AppState,
  RecurringSchedule,
  SmartRule,
  TimerHistoryEntry,
  TimerStartRequest
} from '../shared/app-types'
import { DEFAULT_PROFILES, DEFAULT_TIMER_SNAPSHOT } from '../shared/defaults'
import {
  addDelay,
  formatDuration,
  getNextClockTarget,
  getNextRecurringTarget,
  getWarningTime,
  type TimerSettings,
  type TimerSnapshot
} from '../shared/scheduler'

type TimerEventMap = {
  stateChanged: [AppState]
  notify: [title: string, body: string]
  execute: [action: ActiveTimer['action']]
}

const MAX_TIMEOUT_MS = 2_147_483_647

export class TimerService extends EventEmitter<TimerEventMap> {
  private activeTimer: ActiveTimer | null = getActiveTimer()
  private warningTimeout: NodeJS.Timeout | null = null
  private executeTimeout: NodeJS.Timeout | null = null
  private tickInterval: NodeJS.Timeout | null = null

  constructor() {
    super()
    this.rehydrateTimer()
  }

  getAppState(): AppState {
    return {
      timer: this.getSnapshot(),
      settings: getSettings(),
      schedules: getSchedules(),
      smartRules: getSmartRules(),
      profiles: DEFAULT_PROFILES,
      history: getHistory()
    }
  }

  start(request: TimerStartRequest): AppState {
    const now = new Date()
    const target = this.getTargetFromRequest(request, now)
    const warningAt = getWarningTime(target, request.warningMinutes)
    const activeTimer: ActiveTimer = {
      id: createId(),
      mode: request.mode,
      action: request.action,
      label: request.label.trim() || getDefaultLabel(request.action),
      targetAt: target.toISOString(),
      warningAt: warningAt?.toISOString() ?? null,
      warningMinutes: request.warningMinutes,
      soundEnabled: request.soundEnabled,
      status: 'scheduled',
      scheduleId: request.mode === 'recurring' ? request.scheduleId : null,
      createdAt: now.toISOString()
    }

    this.setActive(activeTimer)
    this.emit('notify', 'Đã đặt hẹn giờ', `${activeTimer.label} lúc ${target.toLocaleTimeString()}`)

    return this.emitState()
  }

  cancel(): AppState {
    if (this.activeTimer) {
      const label = this.activeTimer.label
      this.writeHistory(this.activeTimer, 'cancelled')
      this.clearTimers()
      this.activeTimer = null
      setActiveTimer(null)
      this.emit('notify', 'Đã hủy hẹn giờ', `Đã hủy ${label.toLowerCase()}.`)
    } else {
      this.clearTimers()
      this.activeTimer = null
      setActiveTimer(null)
    }

    return this.emitState()
  }

  postpone(minutes: number): AppState {
    if (!this.activeTimer) {
      return this.getAppState()
    }

    const target = addDelay(new Date(this.activeTimer.targetAt), minutes)
    const warningAt = getWarningTime(target, this.activeTimer.warningMinutes)

    this.setActive({
      ...this.activeTimer,
      targetAt: target.toISOString(),
      warningAt: warningAt?.toISOString() ?? null,
      status: 'scheduled'
    })

    this.emit('notify', 'Đã dời hẹn giờ', `Thêm ${minutes} phút.`)

    return this.emitState()
  }

  updateSettings(settings: Partial<TimerSettings>): AppState {
    setSettings(settings)

    return this.emitState()
  }

  saveSchedule(schedule: RecurringSchedule): AppState {
    const schedules = getSchedules()
    const existingIndex = schedules.findIndex((item) => item.id === schedule.id)
    const nextSchedules =
      existingIndex >= 0
        ? schedules.map((item) => (item.id === schedule.id ? schedule : item))
        : [schedule, ...schedules]

    setSchedules(nextSchedules)
    this.ensureRecurringTimer()

    return this.emitState()
  }

  deleteSchedule(id: string): AppState {
    setSchedules(getSchedules().filter((schedule) => schedule.id !== id))

    if (this.activeTimer?.scheduleId === id) {
      this.cancel()
    }

    this.ensureRecurringTimer()

    return this.emitState()
  }

  toggleSchedule(id: string, enabled: boolean): AppState {
    setSchedules(
      getSchedules().map((schedule) => (schedule.id === id ? { ...schedule, enabled } : schedule))
    )
    this.ensureRecurringTimer()

    return this.emitState()
  }

  saveSmartRule(rule: SmartRule): AppState {
    const rules = getSmartRules()
    const existingIndex = rules.findIndex((item) => item.id === rule.id)
    const nextRules =
      existingIndex >= 0
        ? rules.map((item) => (item.id === rule.id ? rule : item))
        : [rule, ...rules]

    setSmartRules(nextRules)

    return this.emitState()
  }

  deleteSmartRule(id: string): AppState {
    setSmartRules(getSmartRules().filter((rule) => rule.id !== id))

    return this.emitState()
  }

  toggleSmartRule(id: string, enabled: boolean): AppState {
    setSmartRules(getSmartRules().map((rule) => (rule.id === id ? { ...rule, enabled } : rule)))

    return this.emitState()
  }

  clearHistory(): AppState {
    clearHistory()

    return this.emitState()
  }

  private rehydrateTimer(): void {
    if (!this.activeTimer) {
      this.ensureRecurringTimer()
      return
    }

    if (new Date(this.activeTimer.targetAt).getTime() <= Date.now()) {
      this.writeHistory(this.activeTimer, 'missed')
      this.activeTimer = null
      setActiveTimer(null)
      this.ensureRecurringTimer()
      return
    }

    this.scheduleActiveTimer()
  }

  private getTargetFromRequest(request: TimerStartRequest, now: Date): Date {
    if (request.mode === 'delay') {
      return addDelay(now, request.delayMinutes)
    }

    if (request.mode === 'clock') {
      return getNextClockTarget(request.clockTime, now)
    }

    return new Date(request.targetAt)
  }

  private setActive(timer: ActiveTimer): void {
    this.clearTimers()
    this.activeTimer = timer
    setActiveTimer(timer)
    this.scheduleActiveTimer()
  }

  private scheduleActiveTimer(): void {
    if (!this.activeTimer) {
      return
    }

    const now = Date.now()
    const targetAt = new Date(this.activeTimer.targetAt).getTime()
    const warningAt = this.activeTimer.warningAt
      ? new Date(this.activeTimer.warningAt).getTime()
      : null

    if (warningAt && warningAt > now) {
      this.warningTimeout = setTimeout(() => this.warn(), Math.min(warningAt - now, MAX_TIMEOUT_MS))
    }

    this.executeTimeout = setTimeout(
      () => this.execute(),
      Math.min(Math.max(0, targetAt - now), MAX_TIMEOUT_MS)
    )
    this.tickInterval = setInterval(() => this.emitState(), 1000)
  }

  private warn(): void {
    if (!this.activeTimer) {
      return
    }

    this.activeTimer = {
      ...this.activeTimer,
      status: 'warning'
    }
    setActiveTimer(this.activeTimer)
    this.emit(
      'notify',
      'Sắp đến giờ',
      `${this.activeTimer.label} còn ${this.activeTimer.warningMinutes} phút.`
    )
    this.emitState()
  }

  private execute(): void {
    if (!this.activeTimer) {
      return
    }

    const timer = {
      ...this.activeTimer,
      status: 'executing' as const
    }
    this.activeTimer = timer
    setActiveTimer(timer)
    this.emitState()
    this.emit('notify', 'Đang thực hiện', `${timer.label}.`)
    this.emit('execute', timer.action)
    this.writeHistory(timer, 'completed')
    this.clearTimers()
    this.activeTimer = null
    setActiveTimer(null)
    this.ensureRecurringTimer()
    this.emitState()
  }

  private ensureRecurringTimer(): void {
    if (this.activeTimer) {
      return
    }

    const candidates = getSchedules()
      .filter((schedule) => schedule.enabled)
      .map((schedule) => {
        const target = getNextRecurringTarget(schedule.rule, new Date())
        return target ? { schedule, target } : null
      })
      .filter((candidate): candidate is { schedule: RecurringSchedule; target: Date } =>
        Boolean(candidate)
      )
      .sort((a, b) => a.target.getTime() - b.target.getTime())

    const next = candidates[0]

    if (!next) {
      return
    }

    this.start({
      mode: 'recurring',
      targetAt: next.target.toISOString(),
      scheduleId: next.schedule.id,
      action: next.schedule.action,
      warningMinutes: next.schedule.warningMinutes,
      soundEnabled: next.schedule.soundEnabled,
      label: next.schedule.name
    })
  }

  private getSnapshot(): TimerSnapshot {
    if (!this.activeTimer) {
      return DEFAULT_TIMER_SNAPSHOT
    }

    const remainingMs = new Date(this.activeTimer.targetAt).getTime() - Date.now()

    return {
      status: this.activeTimer.status,
      action: this.activeTimer.action,
      targetAt: this.activeTimer.targetAt,
      warningAt: this.activeTimer.warningAt,
      remainingMs: Math.max(0, remainingMs),
      label: this.activeTimer.label
    }
  }

  private writeHistory(timer: ActiveTimer, status: TimerHistoryEntry['status']): void {
    addHistory({
      id: createId(),
      action: timer.action,
      label: timer.label,
      targetAt: timer.targetAt,
      completedAt: new Date().toISOString(),
      status
    })
  }

  private clearTimers(): void {
    for (const timeout of [this.warningTimeout, this.executeTimeout]) {
      if (timeout) {
        clearTimeout(timeout)
      }
    }

    if (this.tickInterval) {
      clearInterval(this.tickInterval)
    }

    this.warningTimeout = null
    this.executeTimeout = null
    this.tickInterval = null
  }

  private emitState(): AppState {
    const state = this.getAppState()
    this.emit('stateChanged', state)

    return state
  }
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function getDefaultLabel(action: ActiveTimer['action']): string {
  const labels: Record<ActiveTimer['action'], string> = {
    shutdown: 'Tắt máy',
    restart: 'Khởi động lại',
    sleep: 'Sleep',
    hibernate: 'Hibernate',
    lock: 'Khóa màn hình',
    signout: 'Đăng xuất'
  }

  return labels[action]
}

export { formatDuration }
