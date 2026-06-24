import type { ActiveTimer, RecurringSchedule } from './app-types'
import { getNextRecurringTarget } from './scheduler'

export interface RecurringCandidate {
  schedule: RecurringSchedule
  target: Date
}

export function findNextRecurringCandidate(
  schedules: RecurringSchedule[],
  now: Date
): RecurringCandidate | undefined {
  return schedules
    .filter((schedule) => schedule.enabled)
    .map((schedule) => {
      const target = getNextRecurringTarget(schedule.rule, now)
      return target ? { schedule, target } : null
    })
    .filter((candidate): candidate is RecurringCandidate => Boolean(candidate))
    .sort((a, b) => a.target.getTime() - b.target.getTime())[0]
}

export function shouldReplaceRecurringTimer(
  activeTimer: ActiveTimer | null,
  nextCandidate: RecurringCandidate | undefined
): boolean {
  if (!nextCandidate) {
    return activeTimer?.mode === 'recurring'
  }

  if (!activeTimer || activeTimer.mode !== 'recurring') {
    return false
  }

  return (
    activeTimer.scheduleId !== nextCandidate.schedule.id ||
    new Date(activeTimer.targetAt).getTime() !== nextCandidate.target.getTime()
  )
}
