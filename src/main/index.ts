import { app, BrowserWindow, ipcMain, nativeImage, Notification, shell, type Tray } from 'electron'
import { join } from 'path'
import { optimizer, is } from '@electron-toolkit/utils'
import iconIco from '../../resources/icon.ico?asset'
import { AppUpdaterService } from './app-updater'
import { broadcastAppInfo, broadcastState, registerAppIpc, registerTimerIpc } from './ipc'
import { runPowerAction } from './power-actions'
import { SmartRuleService } from './smart-rule-service'
import { TimerService } from './timer-service'
import { createAppTray } from './tray'

let mainWindow: BrowserWindow | null = null
let appTray: Tray | null = null
let smartRuleService: SmartRuleService | null = null
let appUpdaterService: AppUpdaterService | null = null
let isQuitting = false
let lastAutoLaunch: boolean | null = null
let finalMinutePopupShown = false
const START_MENU_SHORTCUT_DELAY_MS = 10_000

function createWindow(
  timerService: TimerService,
  runtimeService: AppUpdaterService
): BrowserWindow {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 680,
    height: 680,
    minWidth: 640,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    icon: nativeImage.createFromPath(iconIco),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
    broadcastState(mainWindow, timerService)
    broadcastAppInfo(mainWindow, runtimeService)
  })

  mainWindow.on('close', (event) => {
    if (isQuitting) {
      return
    }

    event.preventDefault()
    mainWindow.hide()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

function showWindow(): void {
  if (!mainWindow) {
    return
  }

  if (mainWindow.isMinimized()) {
    mainWindow.restore()
  }

  mainWindow.show()
  mainWindow.focus()
}

let trayWindow: BrowserWindow | null = null

function createTrayWindow(
  timerService: TimerService,
  runtimeService: AppUpdaterService
): BrowserWindow {
  const win = new BrowserWindow({
    width: 320,
    height: 450,
    frame: false,
    resizable: false,
    show: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    transparent: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}?mode=tray`)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'), { query: { mode: 'tray' } })
  }

  win.on('blur', () => {
    win.hide()
  })

  win.on('close', (event) => {
    if (isQuitting) {
      return
    }
    event.preventDefault()
    win.hide()
  })

  win.on('ready-to-show', () => {
    broadcastState(win, timerService)
    broadcastAppInfo(win, runtimeService)
  })

  return win
}

function ensureTrayWindow(
  timerService: TimerService,
  runtimeService: AppUpdaterService
): BrowserWindow | null {
  if (!appTray) {
    return null
  }

  if (!trayWindow || trayWindow.isDestroyed()) {
    trayWindow = createTrayWindow(timerService, runtimeService)
  }

  return trayWindow
}

function positionTrayWindow(targetWindow: BrowserWindow): void {
  if (!appTray) {
    return
  }

  const { screen } = require('electron')
  const trayBounds = appTray.getBounds()
  const windowBounds = targetWindow.getBounds()
  const display = screen.getDisplayMatching(trayBounds)
  const screenBounds = display.workArea
  const fullBounds = display.bounds

  // Centering relative to tray icon horizontally
  let x = Math.round(trayBounds.x + (trayBounds.width / 2) - (windowBounds.width / 2))
  let y = Math.round(trayBounds.y - windowBounds.height)

  const gap = 8

  // Detect taskbar position and position relative to workArea boundaries (top of taskbar)
  if (screenBounds.y > fullBounds.y) {
    // Taskbar is at top
    y = screenBounds.y + gap
  } else if (screenBounds.x > fullBounds.x) {
    // Taskbar is at left
    x = screenBounds.x + gap
    y = Math.round(trayBounds.y + (trayBounds.height / 2) - (windowBounds.height / 2))
  } else if (screenBounds.width < fullBounds.width) {
    // Taskbar is at right
    x = screenBounds.x + screenBounds.width - windowBounds.width - gap
    y = Math.round(trayBounds.y + (trayBounds.height / 2) - (windowBounds.height / 2))
  } else {
    // Taskbar is at bottom (default Windows)
    y = screenBounds.y + screenBounds.height - windowBounds.height - gap
  }

  // Bounds enforcement
  x = Math.max(screenBounds.x + gap, Math.min(x, screenBounds.x + screenBounds.width - windowBounds.width - gap))
  y = Math.max(screenBounds.y + gap, Math.min(y, screenBounds.y + screenBounds.height - windowBounds.height - gap))

  targetWindow.setPosition(x, y)
}

function showTrayWindow(timerService: TimerService, runtimeService: AppUpdaterService): void {
  const targetWindow = ensureTrayWindow(timerService, runtimeService)
  if (!targetWindow) {
    return
  }

  const reveal = (): void => {
    positionTrayWindow(targetWindow)
    broadcastState(targetWindow, timerService)
    broadcastAppInfo(targetWindow, runtimeService)
    targetWindow.show()
    targetWindow.focus()
  }

  if (targetWindow.webContents.isLoadingMainFrame()) {
    targetWindow.once('ready-to-show', reveal)
    return
  }

  reveal()
}


function showAppNotification(title: string, body: string, silent = false): void {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title,
      body,
      icon: iconIco,
      silent
    })
    notification.on('click', () => {
      showWindow()
    })
    notification.show()
  }
}

function syncAutoLaunch(openAtLogin: boolean): void {
  if (lastAutoLaunch === openAtLogin) {
    return
  }

  lastAutoLaunch = openAtLogin
  app.setLoginItemSettings({ openAtLogin })
}

function scheduleStartMenuShortcutSync(): void {
  if (!app.isPackaged || process.platform !== 'win32') {
    return
  }

  setTimeout(() => {
    const shortcutPath = join(
      app.getPath('appData'),
      'Microsoft',
      'Windows',
      'Start Menu',
      'Programs',
      'Auto Shutdown VN.lnk'
    )

    try {
      shell.writeShortcutLink(shortcutPath, 'create', {
        target: process.execPath,
        appUserModelId: 'com.auto-shutdown-vn',
        description: 'Auto Shutdown VN'
      })
    } catch (error) {
      console.error('Failed to create start menu shortcut', error)
    }
  }, START_MENU_SHORTCUT_DELAY_MS)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows natively
  app.setAppUserModelId('com.auto-shutdown-vn')
  scheduleStartMenuShortcutSync()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  const timerService = new TimerService()
  smartRuleService = new SmartRuleService(timerService)
  const runtimeService = new AppUpdaterService()
  appUpdaterService = runtimeService
  registerTimerIpc(timerService)
  registerAppIpc(runtimeService)

  ipcMain.handle('app:open-full-window', () => {
    showWindow()
    trayWindow?.hide()
  })
  ipcMain.handle('app:open-external', (_event, url: string) => {
    return shell.openExternal(url)
  })
  ipcMain.handle('app:quit', () => {
    isQuitting = true
    smartRuleService?.stop()
    appUpdaterService?.stop()
    appTray?.destroy()
    app.quit()
  })

  timerService.on('stateChanged', (state) => {
    syncAutoLaunch(state.settings.autoLaunch)

    if (mainWindow && !mainWindow.isDestroyed()) {
      broadcastState(mainWindow, timerService)
    }
    if (trayWindow && !trayWindow.isDestroyed()) {
      broadcastState(trayWindow, timerService)
    }

    const isFinalMinute =
      state.timer.status !== 'idle' && state.timer.remainingMs > 0 && state.timer.remainingMs <= 60_000

    if (!isFinalMinute) {
      finalMinutePopupShown = false
      return
    }

    if (!finalMinutePopupShown) {
      if (
        mainWindow &&
        !mainWindow.isDestroyed() &&
        (!mainWindow.isVisible() || mainWindow.isMinimized())
      ) {
        showTrayWindow(timerService, runtimeService)
        finalMinutePopupShown = true
      }
    }
  })
  timerService.on('notify', (title, body) => {
    const state = timerService.getAppState()
    const silent = !state.settings.soundEnabled
    showAppNotification(title, body, silent)
  })
  timerService.on('execute', (action) => {
    const state = timerService.getAppState()
    const force = state.settings.forceCloseApps ?? true
    runPowerAction(action, force)
  })

  runtimeService.on('appInfoChanged', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      broadcastAppInfo(mainWindow, runtimeService)
    }

    if (trayWindow && !trayWindow.isDestroyed()) {
      broadcastAppInfo(trayWindow, runtimeService)
    }
  })
  runtimeService.on('notify', (title, body) => {
    showAppNotification(title, body)
  })
  runtimeService.start()

  smartRuleService.start(3_000)

  syncAutoLaunch(timerService.getAppState().settings.autoLaunch)

  mainWindow = createWindow(timerService, runtimeService)
  appTray = createAppTray(timerService, {
    icon: iconIco,
    openWindow: showWindow,
    clickAction: () => showTrayWindow(timerService, runtimeService),
    quitApp: () => {
      isQuitting = true
      smartRuleService?.stop()
      appUpdaterService?.stop()
      appTray?.destroy()
      app.quit()
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow(timerService, runtimeService)
    } else {
      showWindow()
    }
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (isQuitting && process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  isQuitting = true
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
