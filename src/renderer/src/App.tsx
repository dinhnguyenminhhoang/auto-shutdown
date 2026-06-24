import { useEffect, useState } from 'react'
import {
  CalendarClock,
  Clock3,
  History,
  Lock,
  Moon,
  PauseCircle,
  Play,
  Power,
  RotateCcw,
  Settings,
  TimerReset,
  Home,
  Cpu,
  Trash2,
  AlertTriangle,
  LogOut,
  Menu,
  Info,
  ChevronDown
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import type {
  AppState,
  QuickProfile,
  RecurringSchedule,
  SmartConditionType,
  SmartRule,
  TimerStartRequest
} from '../../shared/app-types'
import { DEFAULT_TIMER_SNAPSHOT } from '../../shared/defaults'
import {
  formatDuration,
  type PowerAction,
  type TimerSettings,
  type Weekday
} from '../../shared/scheduler'

type StartMode = 'delay' | 'clock'
type NavTab = 'home' | 'schedules' | 'smart' | 'history' | 'settings'

const ACTIONS: { id: PowerAction; label: string; icon: React.ElementType }[] = [
  { id: 'shutdown', label: 'Tắt máy', icon: Power },
  { id: 'restart', label: 'Khởi động lại', icon: RotateCcw },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'hibernate', label: 'Hibernate', icon: PauseCircle },
  { id: 'lock', label: 'Khóa màn hình', icon: Lock },
  { id: 'signout', label: 'Đăng xuất', icon: LogOut }
]

const WEEKDAYS: { id: Weekday; label: string }[] = [
  { id: 1, label: 'T2' },
  { id: 2, label: 'T3' },
  { id: 3, label: 'T4' },
  { id: 4, label: 'T5' },
  { id: 5, label: 'T6' },
  { id: 6, label: 'T7' },
  { id: 0, label: 'CN' }
]

const EMPTY_STATE: AppState = {
  timer: DEFAULT_TIMER_SNAPSHOT,
  settings: {
    action: 'shutdown',
    warningMinutes: 5,
    soundEnabled: true,
    autoLaunch: false,
    theme: 'system',
    language: 'vi',
    forceCloseApps: true
  },
  schedules: [],
  smartRules: [],
  profiles: [],
  history: []
}

function App(): React.JSX.Element {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [activeTab, setActiveTab] = useState<NavTab>('home')
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [mode, setMode] = useState<StartMode>('delay')
  const [delayMinutes, setDelayMinutes] = useState(30)
  const [clockTime, setClockTime] = useState('23:30')
  const [scheduleName, setScheduleName] = useState('Ngủ buổi tối')
  const [scheduleTime, setScheduleTime] = useState('23:30')
  const [scheduleWeekdays, setScheduleWeekdays] = useState<Weekday[]>([1, 2, 3, 4, 5])
  const [smartName, setSmartName] = useState('Tắt khi máy rảnh')
  const [smartCondition, setSmartCondition] = useState<SmartConditionType>('idle')
  const [smartDuration, setSmartDuration] = useState(15)
  const [smartThreshold, setSmartThreshold] = useState(10)
  const [scheduleAction, setScheduleAction] = useState<PowerAction>('shutdown')
  const [smartAction, setSmartAction] = useState<PowerAction>('shutdown')

  useEffect(() => {
    window.api.getState().then(setState)

    return window.api.onStateChanged(setState)
  }, [])

  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const shouldUseDark =
      state.settings.theme === 'dark' || (state.settings.theme === 'system' && isSystemDark)
    document.documentElement.classList.toggle('dark', shouldUseDark)
  }, [state.settings.theme])

  const hasActiveTimer = state.timer.status !== 'idle'
  const targetLabel = state.timer.targetAt
    ? new Date(state.timer.targetAt).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit'
      })
    : 'Chưa đặt'

  const actionLabel = ACTIONS.find((action) => action.id === state.timer.action)?.label ?? 'Tắt máy'

  async function refresh(nextState: Promise<AppState>): Promise<void> {
    setState(await nextState)
  }

  function createStartRequest(profile?: QuickProfile): TimerStartRequest {
    const settings = state.settings
    const action = profile?.action ?? settings.action
    const warningMinutes = profile?.warningMinutes ?? settings.warningMinutes
    const soundEnabled = profile?.soundEnabled ?? settings.soundEnabled

    if ((profile?.mode ?? mode) === 'delay') {
      return {
        mode: 'delay',
        delayMinutes: profile?.delayMinutes ?? delayMinutes,
        action,
        warningMinutes,
        soundEnabled,
        label: profile?.name ?? `${getActionLabel(action)} sau ${delayMinutes} phút`
      }
    }

    return {
      mode: 'clock',
      clockTime: profile?.clockTime ?? clockTime,
      action,
      warningMinutes,
      soundEnabled,
      label: profile?.name ?? `${getActionLabel(action)} lúc ${clockTime}`
    }
  }

  async function startTimer(profile?: QuickProfile): Promise<void> {
    await refresh(window.api.start(createStartRequest(profile)))
  }

  async function saveSchedule(): Promise<void> {
    if (scheduleWeekdays.length === 0) {
      alert('Vui lòng chọn ít nhất một ngày trong tuần.');
      return;
    }

    const conflict = state.schedules.find((s) => {
      if (s.rule.time !== scheduleTime) return false;
      return s.rule.weekdays.some((day) => scheduleWeekdays.includes(day));
    });

    if (conflict) {
      alert(`Trùng lịch hẹn! Đã có lịch "${conflict.name}" chạy cùng khung giờ ${scheduleTime} vào một hoặc nhiều ngày bạn đã chọn.`);
      return;
    }

    const schedule: RecurringSchedule = {
      id: `schedule-${Date.now().toString(36)}`,
      name: scheduleName.trim() || 'Lịch hẹn mới',
      action: scheduleAction,
      rule: {
        time: scheduleTime,
        weekdays: scheduleWeekdays
      },
      warningMinutes: state.settings.warningMinutes,
      soundEnabled: state.settings.soundEnabled,
      enabled: true
    }

    await refresh(window.api.saveSchedule(schedule))
  }

  async function saveSmartRule(): Promise<void> {
    const rule: SmartRule = {
      id: `smart-${Date.now().toString(36)}`,
      name: smartName.trim() || 'Điều kiện thông minh',
      condition: smartCondition,
      action: smartAction,
      durationMinutes: Math.max(1, smartDuration),
      threshold: Math.max(0, smartThreshold),
      warningMinutes: state.settings.warningMinutes,
      soundEnabled: state.settings.soundEnabled,
      enabled: true
    }

    await refresh(window.api.saveSmartRule(rule))
  }

  const selectedActionLabel = ACTIONS.find((a) => a.id === state.settings.action)?.label ?? 'Tắt máy'
  const triggerButtonText = mode === 'delay'
    ? `Kích hoạt: ${selectedActionLabel} sau ${delayMinutes} phút`
    : `Kích hoạt: ${selectedActionLabel} lúc ${clockTime}`

  const isTrayMode = window.location.search.includes('mode=tray')

  if (isTrayMode) {
    return <TrayView state={state} refresh={refresh} />
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-foreground">
      {/* Top Header */}
      <header className="relative h-16 border-b bg-card flex items-center justify-between px-6 shrink-0 z-30 select-none">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Power className="size-5 animate-pulse" />
          </div>
          <div>
            <h2 className="font-semibold text-sm leading-none tracking-tight">Auto Shutdown</h2>
            <span className="text-[10px] text-muted-foreground">Vietnamese Edition</span>
          </div>
        </div>

        {/* Dynamic header label displaying active section */}
        <div className="absolute left-1/2 -translate-x-1/2 hidden sm:block text-sm font-semibold text-foreground">
          {activeTab === 'home' && 'Trang chủ hẹn giờ'}
          {activeTab === 'schedules' && 'Lịch lặp lại tự động'}
          {activeTab === 'smart' && 'Hẹn giờ thông minh'}
          {activeTab === 'history' && 'Nhật ký hoạt động'}
          {activeTab === 'settings' && 'Cấu hình hệ thống'}
        </div>

        <div className="flex items-center gap-3">
          {/* Navigation Menu Button */}
          <div className="relative">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl relative h-10 w-10 flex items-center justify-center cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <Menu className="size-5" />
            </Button>
            
            {/* Click-outside backdrop */}
            {isMenuOpen && (
              <div 
                className="fixed inset-0 z-40 bg-transparent" 
                onClick={() => setIsMenuOpen(false)} 
              />
            )}

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border bg-card p-2 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <nav className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('home')
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'home'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    } cursor-pointer`}
                  >
                    <Home className="size-3.5" />
                    Trang chủ hẹn giờ
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('schedules')
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'schedules'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    } cursor-pointer`}
                  >
                    <span className="flex items-center gap-3">
                      <CalendarClock className="size-3.5" />
                      Lịch lặp lại
                    </span>
                    {state.schedules.filter((s) => s.enabled).length > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                        {state.schedules.filter((s) => s.enabled).length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('smart')
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'smart'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    } cursor-pointer`}
                  >
                    <span className="flex items-center gap-3">
                      <Cpu className="size-3.5" />
                      Hẹn giờ thông minh
                    </span>
                    {state.smartRules.filter((r) => r.enabled).length > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                        {state.smartRules.filter((r) => r.enabled).length}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('history')
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'history'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    } cursor-pointer`}
                  >
                    <History className="size-3.5" />
                    Lịch sử hoạt động
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab('settings')
                      setIsMenuOpen(false)
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'settings'
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
                    } cursor-pointer`}
                  >
                    <Settings className="size-3.5" />
                    Cấu hình hệ thống
                  </button>
                </nav>
                <div className="border-t mt-2 pt-2 px-3 text-[10px] text-muted-foreground font-mono text-center">
                  v1.0.0 · AutoShutdownVN
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-secondary/10 p-4 flex flex-col">
        <div className="max-w-5xl w-full mx-auto flex flex-col space-y-4">
          {/* Render Active View Tab */}
          {activeTab === 'home' && (
            <div className="max-w-2xl mx-auto w-full flex flex-col space-y-4 self-center">
              {/* 1. Countdown Widget Card */}
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card to-primary/5 p-4 shadow-sm flex flex-col justify-between shrink-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Clock3 className="size-3" />
                      Thời gian còn lại
                    </p>
                    <p className="mt-2 font-mono text-4xl font-bold tracking-tight tabular-nums text-foreground leading-none">
                      {formatDuration(state.timer.remainingMs)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                      <span className={`inline-block size-1.5 rounded-full ${hasActiveTimer ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                      {hasActiveTimer ? (
                        <span>
                          {state.timer.label} · <strong className="text-foreground">{actionLabel}</strong> lúc {targetLabel}
                        </span>
                      ) : (
                        <span>Chưa thiết lập</span>
                      )}
                    </p>
                  </div>
                  <StatusBadge status={state.timer.status} />
                </div>

                {hasActiveTimer && (
                  <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border/50">
                    <Button variant="outline" className="h-9 rounded-xl px-3 text-[11px] font-medium cursor-pointer" onClick={() => refresh(window.api.postpone(5))}>
                      <TimerReset className="size-3.5 mr-1 text-muted-foreground" />
                      +5 phút
                    </Button>
                    <Button variant="outline" className="h-9 rounded-xl px-3 text-[11px] font-medium cursor-pointer" onClick={() => refresh(window.api.postpone(30))}>
                      <TimerReset className="size-3.5 mr-1 text-muted-foreground" />
                      +30 phút
                    </Button>
                    <Button variant="destructive" className="h-9 rounded-xl px-3 text-[11px] font-semibold cursor-pointer" onClick={() => refresh(window.api.cancel())}>
                      Hủy hẹn giờ ngay
                    </Button>

                    <div className="flex items-center gap-1.5 ml-auto text-[11px] font-medium text-muted-foreground select-none">
                      <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-all">
                        <input
                          type="checkbox"
                          checked={state.settings.forceCloseApps}
                          className="size-3.5 accent-primary cursor-pointer rounded"
                          onChange={(e) => refresh(window.api.updateSettings({ forceCloseApps: e.target.checked }))}
                        />
                        Tự động lưu & đóng ứng dụng
                      </label>
                      <div className="relative group flex items-center justify-center">
                        <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                          <Info className="size-3.5" />
                        </span>
                        <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal">
                          Tự động gửi phím tắt lưu (Ctrl+S) và đóng các ứng dụng đang mở trước khi tắt máy, giúp tránh mất mát dữ liệu.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Setup Board */}
              <div className="rounded-2xl border bg-card p-4 shadow-sm space-y-4 shrink-0">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Play className="size-3.5 text-primary" />
                    Đặt hẹn giờ một lần
                  </h3>

                  <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-secondary/40">
                    <button
                      onClick={() => setMode('delay')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                        mode === 'delay'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      } cursor-pointer`}
                    >
                      Sau khoảng thời gian
                    </button>
                    <button
                      onClick={() => setMode('clock')}
                      className={`py-1.5 px-3 rounded-lg text-xs font-medium transition-all ${
                        mode === 'clock'
                          ? 'bg-card text-foreground shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      } cursor-pointer`}
                    >
                      Chính xác mốc giờ
                    </button>
                  </div>

                  {mode === 'delay' ? (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Số phút chờ đợi
                      </label>
                      <div className="flex gap-2">
                        <input
                          className="h-10 flex-1 rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                          min={1}
                          max={1440}
                          type="number"
                          value={delayMinutes}
                          onChange={(event) => setDelayMinutes(Number(event.target.value))}
                        />
                        <div className="flex gap-1">
                          {[15, 30, 60, 120].map((mins) => (
                            <Button
                              key={mins}
                              variant="secondary"
                              className="h-10 px-3 text-xs cursor-pointer"
                              onClick={() => setDelayMinutes(mins)}
                            >
                              {mins}m
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                        Giờ kích hoạt thiết bị
                      </label>
                      <input
                        className="h-10 w-full rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                        type="time"
                        value={clockTime}
                        onClick={(event) => event.currentTarget.showPicker()}
                        onChange={(event) => setClockTime(event.target.value)}
                      />
                    </div>
                  )}

                  {/* Actions Selector Grid */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Hành động thực hiện
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ACTIONS.map((action) => {
                        const Icon = action.icon
                        const isSelected = state.settings.action === action.id
                        return (
                          <button
                            key={action.id}
                            type="button"
                            onClick={() =>
                              refresh(window.api.updateSettings({ action: action.id }))
                            }
                            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-center transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 text-primary'
                                : 'border-border bg-card hover:bg-secondary/40 text-foreground'
                            } cursor-pointer`}
                          >
                            <Icon className={`size-4 ${isSelected ? 'scale-110' : ''}`} />
                            <span className="text-[11px] font-medium">{action.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground select-none pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-all">
                      <input
                        type="checkbox"
                        checked={state.settings.forceCloseApps}
                        className="size-3.5 accent-primary cursor-pointer rounded"
                        onChange={(e) => refresh(window.api.updateSettings({ forceCloseApps: e.target.checked }))}
                      />
                      Tự động lưu & đóng ứng dụng
                    </label>
                    <div className="relative group flex items-center justify-center">
                      <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                        <Info className="size-3.5" />
                      </span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal">
                        Tự động gửi phím tắt lưu (Ctrl+S) và đóng các ứng dụng đang mở trước khi tắt máy, giúp tránh mất mát dữ liệu.
                      </div>
                    </div>
                  </div>

                  <Button size="lg" className="w-full h-10 text-xs font-semibold rounded-xl cursor-pointer" onClick={() => startTimer()}>
                    <Power className="size-3.5 mr-1" />
                    {triggerButtonText}
                  </Button>
              </div>
            </div>
          )}

          {activeTab === 'schedules' && (
            <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
              {/* Creator Form */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 h-fit">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <CalendarClock className="size-4 text-primary" />
                  Thêm lịch biểu mới
                </h3>
                <div className="space-y-4">
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tên gợi nhớ
                    <input
                      className="h-11 rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                      value={scheduleName}
                      onChange={(event) => setScheduleName(event.target.value)}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Giờ hẹn định kỳ
                    <input
                      className="h-11 rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                      type="time"
                      value={scheduleTime}
                      onClick={(event) => event.currentTarget.showPicker()}
                      onChange={(event) => setScheduleTime(event.target.value)}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hành động thực hiện
                    <div className="relative w-full">
                      <select
                        className="h-11 w-full rounded-xl border bg-background pl-3 pr-10 text-sm font-medium outline-none appearance-none focus:ring-2 focus:ring-primary cursor-pointer transition-all hover:bg-secondary/20"
                        value={scheduleAction}
                        onChange={(event) =>
                          setScheduleAction(event.target.value as PowerAction)
                        }
                      >
                        {ACTIONS.map((action) => (
                          <option key={action.id} value={action.id}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
                    </div>
                  </label>

                  <div className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                      Các ngày trong tuần
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAYS.map((weekday) => {
                        const isSelected = scheduleWeekdays.includes(weekday.id)
                        return (
                          <button
                            key={weekday.id}
                            type="button"
                            onClick={() =>
                              setScheduleWeekdays(toggleWeekday(scheduleWeekdays, weekday.id))
                            }
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                              isSelected
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-background hover:bg-secondary/40 text-foreground'
                            } cursor-pointer`}
                          >
                            {weekday.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground select-none pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-all">
                      <input
                        type="checkbox"
                        checked={state.settings.forceCloseApps}
                        className="size-3.5 accent-primary cursor-pointer rounded"
                        onChange={(e) => refresh(window.api.updateSettings({ forceCloseApps: e.target.checked }))}
                      />
                      Tự động lưu & đóng ứng dụng
                    </label>
                    <div className="relative group flex items-center justify-center">
                      <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                        <Info className="size-3.5" />
                      </span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal">
                        Tự động gửi phím tắt lưu (Ctrl+S) và đóng các ứng dụng đang mở trước khi tắt máy, giúp tránh mất mát dữ liệu.
                      </div>
                    </div>
                  </div>

                  <Button className="w-full h-11 text-xs font-semibold rounded-xl cursor-pointer" onClick={saveSchedule}>
                    Lưu lịch lặp lại
                  </Button>
                </div>
              </div>

              {/* List View */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col">
                <h3 className="text-base font-semibold">Danh sách lịch hẹn tự động</h3>
                <div className="space-y-2 mt-3">
                  {state.schedules.length === 0 ? (
                    <EmptyText text="Chưa cấu hình lịch biểu lặp lại nào." />
                  ) : (
                    state.schedules.map((schedule) => (
                      <div
                        key={schedule.id}
                        className="rounded-xl border bg-background py-3 px-4 flex justify-between items-center gap-3 transition-all hover:border-primary/20"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{schedule.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {schedule.rule.time} ·{' '}
                            {schedule.rule.weekdays.map(formatWeekday).join(', ')} ·{' '}
                            <span className="text-primary font-semibold">
                              {getActionLabel(schedule.action)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              refresh(window.api.toggleSchedule(schedule.id, !schedule.enabled))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              schedule.enabled
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            } cursor-pointer`}
                          >
                            {schedule.enabled ? 'Đang bật' : 'Đang tắt'}
                          </button>
                          <button
                            onClick={() => refresh(window.api.deleteSchedule(schedule.id))}
                            className="p-1.5 rounded-lg border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-muted-foreground cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'smart' && (
            <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
              {/* Rule Creator */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4 h-fit">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Cpu className="size-4 text-primary" />
                  Thiết lập hẹn giờ thông minh
                </h3>
                <div className="space-y-4">
                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tên rule gợi nhớ
                    <input
                      className="h-11 rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                      value={smartName}
                      onChange={(event) => setSmartName(event.target.value)}
                    />
                  </label>

                  <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Hành động thực hiện
                    <div className="relative w-full">
                      <select
                        className="h-11 w-full rounded-xl border bg-background pl-3 pr-10 text-sm font-medium outline-none appearance-none focus:ring-2 focus:ring-primary cursor-pointer transition-all hover:bg-secondary/20"
                        value={smartAction}
                        onChange={(event) =>
                          setSmartAction(event.target.value as PowerAction)
                        }
                      >
                        {ACTIONS.map((action) => (
                          <option key={action.id} value={action.id}>
                            {action.label}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
                    </div>
                  </label>

                  <div className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Điều kiện lọc hoạt động</span>
                      <div className="relative group flex items-center justify-center">
                        <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                          <Info className="size-3.5" />
                        </span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal normal-case font-normal">
                          {smartCondition === 'idle' && 'Tự động kích hoạt hành động khi máy tính không nhận bất kỳ thao tác bàn phím/chuột nào.'}
                          {smartCondition === 'cpu-below' && 'Tự động kích hoạt hành động khi hiệu suất CPU hệ thống hạ thấp dưới mức giới hạn.'}
                          {smartCondition === 'network-below' && 'Tự động kích hoạt hành động khi lưu lượng mạng hệ thống hạ thấp dưới mức giới hạn.'}
                        </div>
                      </div>
                    </div>
                    <div className="relative w-full">
                      <select
                        className="h-11 w-full rounded-xl border bg-background pl-3 pr-10 text-sm font-medium outline-none appearance-none focus:ring-2 focus:ring-primary cursor-pointer transition-all hover:bg-secondary/20"
                        value={smartCondition}
                        onChange={(event) =>
                          setSmartCondition(event.target.value as SmartConditionType)
                        }
                      >
                        <option value="idle">Không tác động máy (Idle)</option>
                        <option value="cpu-below">Hiệu suất CPU thấp hơn mức</option>
                        <option value="network-below">Lưu lượng mạng thấp hơn mức</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
                    </div>
                  </div>

                  {(smartCondition === 'cpu-below' || smartCondition === 'network-below') && (
                    <div className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span>Ngưỡng giới hạn ({smartCondition === 'network-below' ? 'KB/s' : '%'})</span>
                        <div className="relative group flex items-center justify-center">
                          <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                            <Info className="size-3.5" />
                          </span>
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal normal-case font-normal">
                            {smartCondition === 'cpu-below'
                              ? 'Nhập phần trăm CPU tối đa (ví dụ: 5 nghĩa là dưới 5% CPU). Nếu CPU hạ thấp dưới mức này liên tục, hành động sẽ chạy.'
                              : 'Nhập tốc độ mạng tối đa bằng KB/s (ví dụ: 100 nghĩa là dưới 100 KB/s). Nếu tốc độ mạng hạ thấp dưới mức này liên tục, hành động sẽ chạy.'}
                          </div>
                        </div>
                      </div>
                      <input
                        className="h-11 rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                        min={0}
                        type="number"
                        value={smartThreshold}
                        onChange={(event) => setSmartThreshold(Number(event.target.value))}
                      />
                    </div>
                  )}

                  <div className="grid gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <span>Thời gian duy trì điều kiện (phút)</span>
                      <div className="relative group flex items-center justify-center">
                        <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                          <Info className="size-3.5" />
                        </span>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal normal-case font-normal">
                          {smartCondition === 'idle'
                            ? 'Thời gian rảnh liên tục của máy tính trước khi bắt đầu đếm ngược thực hiện hành động.'
                            : 'Khoảng thời gian liên tục mà điều kiện trên phải được thỏa mãn trước khi bắt đầu đếm ngược thực hiện hành động.'}
                        </div>
                      </div>
                    </div>
                    <input
                      className="h-11 rounded-xl border bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary"
                      min={1}
                      type="number"
                      value={smartDuration}
                      onChange={(event) => setSmartDuration(Number(event.target.value))}
                    />
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground select-none pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-all">
                      <input
                        type="checkbox"
                        checked={state.settings.forceCloseApps}
                        className="size-3.5 accent-primary cursor-pointer rounded"
                        onChange={(e) => refresh(window.api.updateSettings({ forceCloseApps: e.target.checked }))}
                      />
                      Tự động lưu & đóng ứng dụng
                    </label>
                    <div className="relative group flex items-center justify-center">
                      <span className="cursor-help text-muted-foreground hover:text-foreground transition-all">
                        <Info className="size-3.5" />
                      </span>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal">
                        Tự động gửi phím tắt lưu (Ctrl+S) và đóng các ứng dụng đang mở trước khi tắt máy, giúp tránh mất mát dữ liệu.
                      </div>
                    </div>
                  </div>

                  <Button className="w-full h-11 text-xs font-semibold rounded-xl cursor-pointer" onClick={saveSmartRule}>
                    Lưu cấu hình thông minh
                  </Button>
                </div>
              </div>

              {/* Rules List */}
              <div className="rounded-2xl border bg-card p-5 shadow-sm flex flex-col">
                <h3 className="text-base font-semibold">Danh sách bộ lọc hoạt động</h3>
                <div className="space-y-2 mt-3">
                  {state.smartRules.length === 0 ? (
                    <EmptyText text="Chưa thiết lập bộ lọc tự động nào." />
                  ) : (
                    state.smartRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="rounded-xl border bg-background py-3 px-4 flex justify-between items-center gap-3 transition-all hover:border-primary/20"
                      >
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">{rule.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">
                            {formatSmartCondition(rule)} ·{' '}
                            <span className="text-primary font-semibold">
                              {getActionLabel(rule.action)}
                            </span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              refresh(window.api.toggleSmartRule(rule.id, !rule.enabled))
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              rule.enabled
                                ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                                : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                            } cursor-pointer`}
                          >
                            {rule.enabled ? 'Đang bật' : 'Đang tắt'}
                          </button>
                          <button
                            onClick={() => refresh(window.api.deleteSmartRule(rule.id))}
                            className="p-1.5 rounded-lg border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-all text-muted-foreground cursor-pointer"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="rounded-2xl border bg-card p-6 shadow-sm flex flex-col">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <History className="size-4 text-primary" />
                  Nhật ký lịch trình đã chạy
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refresh(window.api.clearHistory())}
                  disabled={state.history.length === 0}
                  className="text-xs rounded-lg cursor-pointer"
                >
                  Dọn dẹp nhật ký
                </Button>
              </div>

              <div className="space-y-2 mt-4">
                {state.history.length === 0 ? (
                  <EmptyText text="Chưa có nhật ký ghi lại." />
                ) : (
                  state.history.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border bg-background py-3 px-4 flex justify-between items-center text-sm transition-all hover:border-primary/10"
                    >
                      <div className="space-y-1">
                        <p className="font-semibold">{item.label}</p>
                        <p className="text-xs text-muted-foreground font-medium">
                          Hành động: <strong className="text-foreground">{getActionLabel(item.action)}</strong> · Lúc:{' '}
                          {new Date(item.completedAt).toLocaleString('vi-VN')}
                        </p>
                      </div>
                      <div>
                        {item.status === 'completed' && (
                          <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                            Hoàn tất
                          </span>
                        )}
                        {item.status === 'cancelled' && (
                          <span className="bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-xs font-semibold">
                            Đã hủy
                          </span>
                        )}
                        {item.status === 'missed' && (
                          <span className="bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full text-xs font-semibold">
                            Bỏ qua
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Settings className="size-4 text-primary" />
                  Cài đặt thông báo & khởi chạy
                </h3>

                <div className="space-y-4">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Thời gian cảnh báo trước hành động
                    <div className="relative w-full">
                      <select
                        className="h-11 w-full rounded-xl border bg-background pl-3 pr-10 text-sm font-medium outline-none appearance-none focus:ring-2 focus:ring-primary cursor-pointer transition-all hover:bg-secondary/20"
                        value={state.settings.warningMinutes}
                        onChange={(event) =>
                          refresh(
                            window.api.updateSettings({ warningMinutes: Number(event.target.value) })
                          )
                        }
                      >
                        {[0, 1, 5, 10, 30].map((minutes) => (
                          <option key={minutes} value={minutes}>
                            {minutes === 0 ? 'Không gửi cảnh báo trước' : `Cảnh báo trước ${minutes} phút`}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
                    </div>
                  </label>

                  <ToggleRow
                    label="Phát âm thanh cảnh báo / Notification"
                    checked={state.settings.soundEnabled}
                    onChange={(soundEnabled) => refresh(window.api.updateSettings({ soundEnabled }))}
                  />

                  <ToggleRow
                    label="Tự khởi chạy cùng Windows hệ thống"
                    checked={state.settings.autoLaunch}
                    onChange={(autoLaunch) => refresh(window.api.updateSettings({ autoLaunch }))}
                  />

                  <ToggleRow
                    label="Tự động lưu & đóng ứng dụng"
                    checked={state.settings.forceCloseApps}
                    onChange={(forceCloseApps) => refresh(window.api.updateSettings({ forceCloseApps }))}
                    tooltip="Tự động gửi phím tắt lưu (Ctrl+S) và đóng các ứng dụng đang mở trước khi tắt máy, giúp tránh mất mát dữ liệu."
                  />
                </div>
              </div>

              <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-6">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Moon className="size-4 text-primary" />
                  Chủ đề & hiển thị
                </h3>

                <div className="space-y-4">
                  <label className="grid gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Giao diện ứng dụng
                    <div className="relative w-full">
                      <select
                        className="h-11 w-full rounded-xl border bg-background pl-3 pr-10 text-sm font-medium outline-none appearance-none focus:ring-2 focus:ring-primary cursor-pointer transition-all hover:bg-secondary/20"
                        value={state.settings.theme}
                        onChange={(event) =>
                          refresh(
                            window.api.updateSettings({
                              theme: event.target.value as TimerSettings['theme']
                            })
                          )
                        }
                      >
                        <option value="system">Theo cấu hình hệ thống (System)</option>
                        <option value="light">Chủ đề sáng (Light)</option>
                        <option value="dark">Chủ đề tối (Dark)</option>
                      </select>
                      <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 pointer-events-none text-muted-foreground" />
                    </div>
                  </label>

                  <div className="p-4 rounded-xl border border-dashed flex gap-3 text-xs text-muted-foreground leading-normal bg-secondary/20">
                    <AlertTriangle className="size-5 shrink-0 text-amber-500" />
                    <p>
                      Việc cấu hình giao diện theo hệ thống (System) sẽ tự động đồng bộ hóa với
                      tùy chỉnh Dark/Light Mode trên Windows hiện tại của bạn.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: AppState['timer']['status'] }): React.JSX.Element {
  const labels: Record<AppState['timer']['status'], string> = {
    idle: 'Chưa thiết lập',
    scheduled: 'Đã hẹn giờ',
    warning: 'Sắp thực hiện',
    executing: 'Đang chạy',
    completed: 'Hoàn tất',
    cancelled: 'Đã hủy'
  }

  const badgeStyles: Record<AppState['timer']['status'], string> = {
    idle: 'bg-secondary text-muted-foreground border-border',
    scheduled: 'bg-primary/10 text-primary border-primary/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse',
    executing: 'bg-primary text-primary-foreground border-primary',
    completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    cancelled: 'bg-destructive/10 text-destructive border-destructive/20'
  }

  return (
    <span className={`rounded-xl border px-3 py-1.5 text-xs font-semibold tracking-wide ${badgeStyles[status]}`}>
      {labels[status]}
    </span>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
  tooltip
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  tooltip?: string
}): React.JSX.Element {
  return (
    <div className="relative group">
      <label className="flex items-center justify-between gap-4 rounded-xl border bg-background px-4 py-3 text-sm font-medium hover:bg-secondary/20 transition-all cursor-pointer">
        <span className="flex items-center gap-1.5">
          {label}
          {tooltip && <Info className="size-3.5 text-muted-foreground hover:text-foreground transition-all cursor-help" />}
        </span>
        <input
          checked={checked}
          className="size-4 accent-primary cursor-pointer rounded"
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
      </label>
      {tooltip && (
        <div className="absolute bottom-full left-4 mb-2 hidden group-hover:block w-64 p-2.5 bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal">
          {tooltip}
        </div>
      )}
    </div>
  )
}

function EmptyText({ text }: { text: string }): React.JSX.Element {
  return (
    <p className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground font-medium bg-secondary/10">
      {text}
    </p>
  )
}

function getActionLabel(actionId: PowerAction): string {
  return ACTIONS.find((action) => action.id === actionId)?.label ?? actionId
}

function toggleWeekday(current: Weekday[], weekday: Weekday): Weekday[] {
  return current.includes(weekday)
    ? current.filter((item) => item !== weekday)
    : [...current, weekday].sort((a, b) => a - b)
}

function formatWeekday(weekday: Weekday): string {
  return WEEKDAYS.find((item) => item.id === weekday)?.label ?? String(weekday)
}

function formatSmartCondition(rule: SmartRule): string {
  const labels: Record<SmartConditionType, string> = {
    idle: `Không dùng máy ${rule.durationMinutes} phút`,
    'cpu-below': `CPU dưới ${rule.threshold}% trong ${rule.durationMinutes} phút`,
    'network-below': `Mạng dưới ${rule.threshold} KB/s trong ${rule.durationMinutes} phút`
  }

  return labels[rule.condition]
}

function TrayView({
  state,
  refresh
}: {
  state: AppState
  refresh: (nextState: Promise<AppState>) => Promise<void>
}): React.JSX.Element {
  const hasActiveTimer = state.timer.status !== 'idle'
  const targetLabel = state.timer.targetAt
    ? new Date(state.timer.targetAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    : ''

  const remainingTimeStr = formatDuration(state.timer.remainingMs)
  const activeActionLabel = ACTIONS.find((a) => a.id === state.timer.action)?.label ?? 'Tắt máy'

  // Form states for setting a quick timer when idle
  const [selectedAction, setSelectedAction] = useState<PowerAction>('shutdown')
  const [selectedMinutes, setSelectedMinutes] = useState<number>(30)

  const quickMinutesOptions = [15, 30, 60, 120]

  const trayActionLabels: Record<PowerAction, string> = {
    shutdown: 'Tắt máy',
    restart: 'Khởi động',
    sleep: 'Sleep',
    hibernate: 'Ngủ đông',
    lock: 'Khóa máy',
    signout: 'Đăng xuất'
  }

  const handleStartTimer = (): void => {
    refresh(
      window.api.start({
        mode: 'delay',
        delayMinutes: selectedMinutes,
        action: selectedAction,
        warningMinutes: state.settings.warningMinutes,
        soundEnabled: state.settings.soundEnabled,
        label: 'Hẹn giờ nhanh'
      })
    )
  }

  const handlePostpone = (minutes: number): void => {
    refresh(window.api.postpone(minutes))
  }

  const handleCancel = (): void => {
    refresh(window.api.cancel())
  }

  return (
    <div className="flex flex-col w-[320px] h-[450px] bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl overflow-hidden shadow-2xl select-none font-sans">
      {/* Top Banner / Status */}
      <div
        className={`p-3 text-center border-b flex items-center justify-between px-4 shrink-0 ${
          hasActiveTimer
            ? 'bg-emerald-950/40 border-emerald-900/30'
            : 'bg-zinc-900/90 border-zinc-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <Power className={`size-4 ${hasActiveTimer ? 'text-emerald-400 animate-pulse' : 'text-zinc-400'}`} />
          <span className="text-xs font-bold text-zinc-200">
            Auto Shutdown VN
          </span>
        </div>
        <span
          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
            hasActiveTimer ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {hasActiveTimer ? 'Đang đếm ngược' : 'Chưa thiết lập'}
        </span>
      </div>

      {/* Main Interactive Area */}
      <div className="flex-1 p-4 flex flex-col justify-center overflow-y-auto space-y-4 bg-zinc-950/40">
        {hasActiveTimer ? (
          /* Active State View */
          <div className="text-center space-y-5 flex flex-col justify-center items-center py-2">
            <div className="space-y-1">
              <div className="text-4xl font-mono font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
                {remainingTimeStr}
              </div>
              <p className="text-xs text-zinc-400">
                {activeActionLabel} lúc <span className="font-semibold text-zinc-200">{targetLabel}</span>
              </p>
            </div>

            {/* Quick Postpone Buttons */}
            <div className="w-full space-y-2">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-zinc-500 block text-left px-1">
                Dời thêm thời gian
              </span>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-300 text-xs cursor-pointer"
                  onClick={(): void => handlePostpone(10)}
                >
                  +10p
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-300 text-xs cursor-pointer"
                  onClick={(): void => handlePostpone(30)}
                >
                  +30p
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg h-9 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-300 text-xs cursor-pointer"
                  onClick={(): void => handlePostpone(60)}
                >
                  +1g
                </Button>
              </div>
            </div>

            {/* Cancel Button */}
            <div className="w-full space-y-2">
              <Button
                variant="destructive"
                className="w-full rounded-lg h-10 font-medium text-xs bg-red-950 border border-red-900 text-red-200 hover:bg-red-900 hover:text-white transition-all shadow-md cursor-pointer"
                onClick={handleCancel}
              >
                Hủy hẹn giờ
              </Button>
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-zinc-400 select-none pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer hover:text-zinc-200 transition-all">
                  <input
                    type="checkbox"
                    checked={state.settings.forceCloseApps}
                    className="size-3.5 accent-primary cursor-pointer rounded"
                    onChange={(e) => refresh(window.api.updateSettings({ forceCloseApps: e.target.checked }))}
                  />
                  Tự động lưu & đóng ứng dụng
                </label>
                <div className="relative group flex items-center justify-center">
                  <span className="cursor-help text-zinc-500 hover:text-zinc-300 transition-all">
                    <Info className="size-3.5" />
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 p-2.5 bg-zinc-950 border border-zinc-800 text-[9px] text-zinc-300 rounded-lg shadow-xl z-50 text-center leading-normal">
                    Tự động lưu (Ctrl+S) và tắt các ứng dụng đang mở trước khi tắt máy, tránh mất dữ liệu.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Idle State View */
          <div className="space-y-4 flex flex-col justify-center">
            {/* Action Select */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-zinc-500 block px-1">
                Hành động
              </span>
              <div className="grid grid-cols-3 gap-2 bg-zinc-900/60 p-1.5 rounded-xl border border-zinc-800">
                {(['shutdown', 'sleep', 'restart'] as PowerAction[]).map((act) => {
                  const actInfo = ACTIONS.find((a) => a.id === act)
                  const ActIcon = actInfo?.icon || Power
                  const isActive = selectedAction === act
                  return (
                    <button
                      key={act}
                      className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-lg text-xs font-semibold gap-1.5 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-primary text-primary-foreground shadow-md border border-primary/20'
                          : 'bg-zinc-900/40 text-zinc-400 hover:text-zinc-200 border border-transparent hover:bg-zinc-800/40'
                      }`}
                      onClick={(): void => setSelectedAction(act)}
                    >
                      <ActIcon className="size-4 shrink-0" />
                      <span className="leading-none text-[11px]">{trayActionLabels[act]}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Quick Minutes Select */}
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase font-semibold tracking-widest text-zinc-500 block px-1">
                Thời gian
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {quickMinutesOptions.map((mins) => {
                  const isActive = selectedMinutes === mins
                  return (
                    <button
                      key={mins}
                      className={`h-8 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-primary border-primary text-primary-foreground shadow-md'
                          : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 hover:bg-zinc-800/40'
                      }`}
                      onClick={(): void => setSelectedMinutes(mins)}
                    >
                      {mins >= 60 ? `${mins / 60}g` : `${mins}p`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Custom slider input */}
            <div className="space-y-1.5 px-1 bg-zinc-900/20 p-2 rounded-lg border border-zinc-900">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span>Tùy chọn: {selectedMinutes} phút</span>
              </div>
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={selectedMinutes}
                className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                onChange={(e): void => setSelectedMinutes(Number(e.target.value))}
              />
            </div>

            {/* Start Button */}
            <Button
              className="w-full rounded-lg h-10 font-bold text-xs bg-primary hover:bg-primary/95 text-primary-foreground transition-all shadow-md mt-2 cursor-pointer border border-primary/20"
              onClick={handleStartTimer}
            >
              Bắt đầu hẹn giờ
            </Button>
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="h-12 border-t border-zinc-800 bg-zinc-900/80 px-4 flex items-center justify-between shrink-0 text-xs">
        <button
          className="text-zinc-400 hover:text-white flex items-center gap-1 transition-all py-1.5 px-2 hover:bg-zinc-800/50 rounded-lg cursor-pointer font-medium"
          onClick={(): Promise<void> => window.api.openFullWindow()}
        >
          <Home className="size-3.5" />
          <span>Mở giao diện đầy đủ</span>
        </button>

        <button
          className="text-zinc-500 hover:text-red-400 flex items-center gap-1 transition-all py-1.5 px-2 hover:bg-red-950/20 rounded-lg cursor-pointer font-medium"
          onClick={(): Promise<void> => window.api.quitApp()}
        >
          <span>Thoát</span>
          <span className="text-[10px] opacity-75">✕</span>
        </button>
      </div>
    </div>
  )
}

export default App

