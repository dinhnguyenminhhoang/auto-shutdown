export type AppUpdateStatus =
  | 'disabled'
  | 'idle'
  | 'checking'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'not-available'
  | 'error'

export interface AppUpdateState {
  status: AppUpdateStatus
  currentVersion: string
  availableVersion: string | null
  downloadProgressPercent: number | null
  message: string | null
  checkedAt: string | null
}

export interface AppInfo {
  version: string
  authorName: string
  authorFacebookUrl: string
  repositoryUrl: string
  copyrightLabel: string
  update: AppUpdateState
}

export const AUTHOR_NAME = 'Đinh Nguyễn Minh Hoàng'
export const AUTHOR_FACEBOOK_URL = 'https://www.facebook.com/dinhnguyenminhhoang'
export const REPOSITORY_URL = 'https://github.com/dinhnguyenminhhoang/auto-shutdown'
export const COPYRIGHT_LABEL = 'No copyright'

export function createDefaultAppInfo(version: string): AppInfo {
  return {
    version,
    authorName: AUTHOR_NAME,
    authorFacebookUrl: AUTHOR_FACEBOOK_URL,
    repositoryUrl: REPOSITORY_URL,
    copyrightLabel: COPYRIGHT_LABEL,
    update: {
      status: 'idle',
      currentVersion: version,
      availableVersion: null,
      downloadProgressPercent: null,
      message: null,
      checkedAt: null
    }
  }
}

export function formatUpdateStatusLabel(update: AppUpdateState): string {
  switch (update.status) {
    case 'disabled':
      return update.message ?? 'Tự động cập nhật chỉ hoạt động trên bản đã cài đặt'
    case 'idle':
      return 'Sẵn sàng kiểm tra cập nhật'
    case 'checking':
      return 'Đang kiểm tra bản cập nhật...'
    case 'available':
      return update.availableVersion
        ? `Đã tìm thấy bản ${update.availableVersion}, chuẩn bị tải xuống`
        : 'Đã tìm thấy bản cập nhật mới'
    case 'downloading': {
      const versionLabel = update.availableVersion ? ` bản ${update.availableVersion}` : ''
      const progressLabel =
        typeof update.downloadProgressPercent === 'number'
          ? ` (${Math.round(update.downloadProgressPercent)}%)`
          : ''
      return `Đang tải${versionLabel}${progressLabel}`
    }
    case 'downloaded':
      return update.availableVersion
        ? `Đã tải xong bản ${update.availableVersion}, sẵn sàng cài đặt`
        : 'Đã tải xong bản cập nhật, sẵn sàng cài đặt'
    case 'not-available':
      return 'Bạn đang dùng bản mới nhất'
    case 'error':
      return update.message ? `Không thể cập nhật: ${update.message}` : 'Không thể kiểm tra cập nhật'
    default:
      return 'Sẵn sàng kiểm tra cập nhật'
  }
}

export function canCheckForUpdates(update: AppUpdateState): boolean {
  return (
    update.status !== 'disabled' &&
    update.status !== 'checking' &&
    update.status !== 'downloading'
  )
}

export function canInstallUpdate(update: AppUpdateState): boolean {
  return update.status === 'downloaded'
}
