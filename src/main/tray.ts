import { Menu, Tray } from 'electron'

import { TimerService } from './timer-service'

interface TrayOptions {
  icon: string
  openWindow: () => void
  quitApp: () => void
  clickAction?: () => void
}

export function createAppTray(timerService: TimerService, options: TrayOptions): Tray {
  const tray = new Tray(options.icon)


  const updateMenu = (): void => {
    const state = timerService.getAppState()
    const hasTimer = state.timer.status !== 'idle'
    const label = hasTimer
      ? `${state.timer.label} - ${formatTrayRemaining(state.timer.remainingMs)}`
      : 'Chưa thiết lập'

    tray.setToolTip(`Auto Shutdown VN\n${label}`)
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label, enabled: false },
        { type: 'separator' },
        { label: 'Mở ứng dụng', click: options.openWindow },
        {
          label: 'Tắt máy sau 30 phút',
          click: () =>
            timerService.start({
              mode: 'delay',
              delayMinutes: 30,
              action: 'shutdown',
              warningMinutes: 5,
              soundEnabled: true,
              label: 'Tắt máy nhanh'
            })
        },
        { label: 'Hủy hẹn giờ', enabled: hasTimer, click: () => timerService.cancel() },
        { type: 'separator' },
        { label: 'Thoát app', click: options.quitApp }
      ])
    )
  }

  tray.on('click', options.clickAction || options.openWindow)
  timerService.on('stateChanged', updateMenu)
  updateMenu()

  return tray
}

function formatTrayRemaining(remainingMs: number): string {
  const totalMinutes = Math.max(0, Math.ceil(remainingMs / 60_000))

  if (totalMinutes < 60) {
    return `${totalMinutes} phút`
  }

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${hours} giờ ${minutes} phút`
}
