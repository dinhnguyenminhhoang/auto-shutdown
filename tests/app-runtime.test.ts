import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  createDefaultAppInfo,
  formatUpdateStatusLabel
} from '../src/shared/app-runtime'

describe('app runtime helpers', () => {
  it('formats key updater states for the UI', () => {
    const appInfo = createDefaultAppInfo('1.0.0')

    assert.equal(formatUpdateStatusLabel(appInfo.update), 'Sẵn sàng kiểm tra cập nhật')
    assert.equal(
      formatUpdateStatusLabel({ ...appInfo.update, status: 'checking' }),
      'Đang kiểm tra bản cập nhật...'
    )
    assert.equal(
      formatUpdateStatusLabel({
        ...appInfo.update,
        status: 'downloading',
        availableVersion: '1.0.1',
        downloadProgressPercent: 42
      }),
      'Đang tải bản 1.0.1 (42%)'
    )
    assert.equal(
      formatUpdateStatusLabel({
        ...appInfo.update,
        status: 'downloaded',
        availableVersion: '1.0.1'
      }),
      'Đã tải xong bản 1.0.1, sẵn sàng cài đặt'
    )
    assert.equal(
      formatUpdateStatusLabel({
        ...appInfo.update,
        status: 'error',
        message: 'Network failed'
      }),
      'Không thể cập nhật: Network failed'
    )
  })
})
