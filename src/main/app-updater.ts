import { EventEmitter } from 'events'
import { app } from 'electron'
import {
  autoUpdater,
  type ProgressInfo,
  type UpdateDownloadedEvent,
  type UpdateInfo
} from 'electron-updater'

import {
  createDefaultAppInfo,
  type AppInfo,
  type AppUpdateState
} from '../shared/app-runtime'

const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const UPDATE_INITIAL_DELAY_MS = 8_000

type AppUpdaterEventMap = {
  appInfoChanged: [AppInfo]
  notify: [title: string, body: string]
}

export class AppUpdaterService extends EventEmitter<AppUpdaterEventMap> {
  private readonly appInfo: AppInfo
  private readonly enabled: boolean
  private checkInterval: NodeJS.Timeout | null = null
  private initialCheckTimeout: NodeJS.Timeout | null = null
  private started = false

  constructor() {
    super()

    this.appInfo = createDefaultAppInfo(app.getVersion())
    this.enabled = app.isPackaged

    if (!this.enabled) {
      this.patchUpdateState({
        status: 'disabled',
        message: 'Tự động cập nhật chỉ hoạt động trên bản đã cài đặt'
      })
      return
    }

    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true
    this.bindUpdaterEvents()
  }

  start(): void {
    if (!this.enabled || this.started) {
      return
    }

    this.started = true
    this.initialCheckTimeout = setTimeout(() => {
      this.initialCheckTimeout = null
      void this.checkForUpdates()
    }, UPDATE_INITIAL_DELAY_MS)

    this.checkInterval = setInterval(() => {
      void this.checkForUpdates()
    }, UPDATE_CHECK_INTERVAL_MS)
  }

  stop(): void {
    if (this.initialCheckTimeout) {
      clearTimeout(this.initialCheckTimeout)
      this.initialCheckTimeout = null
    }

    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  getAppInfo(): AppInfo {
    return structuredClone(this.appInfo)
  }

  async checkForUpdates(): Promise<AppInfo> {
    if (!this.enabled) {
      return this.getAppInfo()
    }

    if (
      this.appInfo.update.status === 'checking' ||
      this.appInfo.update.status === 'downloading'
    ) {
      return this.getAppInfo()
    }

    try {
      await autoUpdater.checkForUpdates()
    } catch (error) {
      this.handleUpdateError(error)
    }

    return this.getAppInfo()
  }

  installUpdate(): void {
    if (this.appInfo.update.status !== 'downloaded') {
      return
    }

    autoUpdater.quitAndInstall(false, true)
  }

  private bindUpdaterEvents(): void {
    autoUpdater.on('checking-for-update', () => {
      this.patchUpdateState({
        status: 'checking',
        checkedAt: new Date().toISOString(),
        message: null,
        downloadProgressPercent: null
      })
    })

    autoUpdater.on('update-available', (info) => {
      const nextVersion = getUpdateVersion(info)
      const shouldNotify = this.appInfo.update.availableVersion !== nextVersion

      this.patchUpdateState({
        status: 'available',
        availableVersion: nextVersion,
        checkedAt: new Date().toISOString(),
        message: null,
        downloadProgressPercent: 0
      })

      if (shouldNotify && nextVersion) {
        this.emit('notify', 'Có bản cập nhật mới', `Đang tải bản ${nextVersion}.`)
      }
    })

    autoUpdater.on('download-progress', (progress) => {
      this.handleDownloadProgress(progress)
    })

    autoUpdater.on('update-downloaded', (info) => {
      const nextVersion = getUpdateVersion(info)

      this.patchUpdateState({
        status: 'downloaded',
        availableVersion: nextVersion,
        checkedAt: new Date().toISOString(),
        message: null,
        downloadProgressPercent: 100
      })

      if (nextVersion) {
        this.emit(
          'notify',
          'Đã tải xong bản cập nhật',
          `Bản ${nextVersion} sẽ được cài khi bạn thoát ứng dụng hoặc bấm cài ngay.`
        )
      }
    })

    autoUpdater.on('update-not-available', () => {
      this.patchUpdateState({
        status: 'not-available',
        availableVersion: null,
        checkedAt: new Date().toISOString(),
        message: null,
        downloadProgressPercent: null
      })
    })

    autoUpdater.on('error', (error) => {
      this.handleUpdateError(error)
    })
  }

  private handleDownloadProgress(progress: ProgressInfo): void {
    this.patchUpdateState({
      status: 'downloading',
      downloadProgressPercent: progress.percent,
      message: null
    })
  }

  private handleUpdateError(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Không rõ nguyên nhân'
    this.patchUpdateState({
      status: 'error',
      message,
      checkedAt: new Date().toISOString()
    })
  }

  private patchUpdateState(nextState: Partial<AppUpdateState>): void {
    Object.assign(this.appInfo.update, nextState)
    this.emit('appInfoChanged', this.getAppInfo())
  }
}

function getUpdateVersion(info: UpdateInfo | UpdateDownloadedEvent): string | null {
  return typeof info.version === 'string' && info.version.length > 0 ? info.version : null
}
