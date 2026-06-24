import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  addDelay,
  formatDuration,
  getNextClockTarget,
  getNextRecurringTarget,
  getWarningTime,
  isValidDelay
} from '../src/shared/scheduler'

describe('scheduler', () => {
  it('formats remaining time as hh:mm:ss', () => {
    assert.equal(formatDuration(29 * 60 * 1000 + 12 * 1000), '00:29:12')
    assert.equal(formatDuration(25 * 60 * 60 * 1000 + 3 * 1000), '25:00:03')
    assert.equal(formatDuration(-5_000), '00:00:00')
  })

  it('creates a delay target from a minute count', () => {
    const now = new Date('2026-06-24T20:00:00+07:00')

    assert.equal(addDelay(now, 90).toISOString(), '2026-06-24T14:30:00.000Z')
  })

  it('validates delay minutes for user input', () => {
    assert.equal(isValidDelay(1), true)
    assert.equal(isValidDelay(1440), true)
    assert.equal(isValidDelay(0), false)
    assert.equal(isValidDelay(1441), false)
    assert.equal(isValidDelay(Number.NaN), false)
  })

  it('uses today for an exact clock time that is still ahead', () => {
    const now = new Date('2026-06-24T20:00:00+07:00')

    assert.equal(getNextClockTarget('23:30', now).toISOString(), '2026-06-24T16:30:00.000Z')
  })

  it('rolls exact clock time to tomorrow when that time already passed', () => {
    const now = new Date('2026-06-24T23:45:00+07:00')

    assert.equal(getNextClockTarget('23:30', now).toISOString(), '2026-06-25T16:30:00.000Z')
  })

  it('computes warning time only when the warning is before target', () => {
    const target = new Date('2026-06-24T23:30:00+07:00')

    assert.equal(getWarningTime(target, 5)?.toISOString(), '2026-06-24T16:25:00.000Z')
    assert.equal(getWarningTime(target, 0), null)
  })

  it('finds next recurring target from selected weekdays', () => {
    const now = new Date('2026-06-24T23:00:00+07:00')

    assert.equal(
      getNextRecurringTarget({ time: '22:00', weekdays: [1, 3, 5] }, now)?.toISOString(),
      '2026-06-26T15:00:00.000Z'
    )
  })
})
