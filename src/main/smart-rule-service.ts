import { execFile } from 'child_process'
import { promisify } from 'util'
import { powerMonitor } from 'electron'

import type { SmartRule } from '../shared/app-types'
import { getSmartRules } from './app-store'
import { TimerService } from './timer-service'

const execFileAsync = promisify(execFile)
const POLL_INTERVAL_MS = 30_000

export class SmartRuleService {
  private readonly matchedSince = new Map<string, number>()
  private pollInterval: NodeJS.Timeout | null = null
  private isPolling = false

  constructor(private readonly timerService: TimerService) {}

  start(): void {
    this.pollInterval = setInterval(() => {
      void this.poll()
    }, POLL_INTERVAL_MS)
    void this.poll()
  }

  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }

    this.pollInterval = null
  }

  private async poll(): Promise<void> {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    try {
      for (const rule of getSmartRules().filter((item) => item.enabled)) {
        await this.evaluateRule(rule)
      }
    } finally {
      this.isPolling = false
    }
  }

  private async evaluateRule(rule: SmartRule): Promise<void> {
    const matched = await isRuleMatched(rule)

    if (!matched) {
      this.matchedSince.delete(rule.id)
      return
    }

    const now = Date.now()
    const since = this.matchedSince.get(rule.id) ?? now
    this.matchedSince.set(rule.id, since)

    if (now - since < rule.durationMinutes * 60_000) {
      return
    }

    if (this.timerService.getAppState().timer.status !== 'idle') {
      return
    }

    this.matchedSince.delete(rule.id)
    this.timerService.start({
      mode: 'delay',
      delayMinutes: Math.max(1, rule.warningMinutes || 1),
      action: rule.action,
      warningMinutes: Math.min(rule.warningMinutes, Math.max(1, rule.warningMinutes || 1)),
      soundEnabled: rule.soundEnabled,
      label: rule.name
    })
  }
}

async function isRuleMatched(rule: SmartRule): Promise<boolean> {
  switch (rule.condition) {
    case 'idle':
      return powerMonitor.getSystemIdleTime() >= rule.durationMinutes * 60
    case 'cpu-below':
      return (await getCpuUsage()) <= rule.threshold
    case 'network-below':
      return (await getNetworkBytesPerSecond()) <= rule.threshold * 1024
  }
}

async function getCpuUsage(): Promise<number> {
  const output = await runPowerShell(
    "(Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue"
  )

  return parseNumber(output)
}

async function getNetworkBytesPerSecond(): Promise<number> {
  const output = await runPowerShell(
    "(Get-Counter '\\Network Interface(*)\\Bytes Total/sec').CounterSamples | Measure-Object -Property CookedValue -Sum | Select-Object -ExpandProperty Sum"
  )

  return parseNumber(output)
}

async function runPowerShell(command: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { windowsHide: true }
  )

  return stdout
}



function parseNumber(output: string): number {
  const value = Number(output.trim().replace(',', '.'))

  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}
