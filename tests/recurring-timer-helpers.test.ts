import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { ActiveTimer, RecurringSchedule } from '../src/shared/app-types'
import {
  findNextRecurringCandidate,
  shouldReplaceRecurringTimer
} from '../src/shared/recurring-timer-helpers'

function createSchedule(
  id: string,
  time: string,
  weekdays: RecurringSchedule['rule']['weekdays'],
  enabled = true
): RecurringSchedule {
  return {
    id,
    name: id,
    action: 'shutdown',
    rule: { time, weekdays },
    warningMinutes: 5,
    soundEnabled: true,
    enabled
  }
}

function createRecurringTimer(scheduleId: string, targetAt: string): ActiveTimer {
  return {
    id: 'timer-1',
    mode: 'recurring',
    action: 'shutdown',
    label: 'Recurring',
    targetAt,
    warningAt: null,
    warningMinutes: 5,
    soundEnabled: true,
    status: 'scheduled',
    scheduleId,
    createdAt: '2026-06-24T00:00:00.000Z'
  }
}

describe('recurring timer helpers', () => {
  it('picks the earliest enabled recurring schedule candidate', () => {
    const now = new Date('2026-06-24T20:00:00+07:00')
    const schedules = [
      createSchedule('later', '23:30', [3]),
      createSchedule('sooner', '21:15', [3]),
      createSchedule('disabled', '20:30', [3], false)
    ]

    const next = findNextRecurringCandidate(schedules, now)

    assert.equal(next?.schedule.id, 'sooner')
    assert.equal(next?.target.toISOString(), '2026-06-24T14:15:00.000Z')
  })

  it('replaces the current recurring timer when a different earlier candidate becomes active', () => {
    const activeTimer = createRecurringTimer('later', '2026-06-24T16:30:00.000Z')
    const nextCandidate = {
      schedule: createSchedule('sooner', '21:15', [3]),
      target: new Date('2026-06-24T14:15:00.000Z')
    }

    assert.equal(shouldReplaceRecurringTimer(activeTimer, nextCandidate), true)
  })

  it('keeps the current recurring timer when it still matches the next candidate', () => {
    const activeTimer = createRecurringTimer('same', '2026-06-24T16:30:00.000Z')
    const nextCandidate = {
      schedule: createSchedule('same', '23:30', [3]),
      target: new Date('2026-06-24T16:30:00.000Z')
    }

    assert.equal(shouldReplaceRecurringTimer(activeTimer, nextCandidate), false)
  })
})
