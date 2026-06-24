import { execFile } from 'child_process'
import { promisify } from 'util'
import { powerMonitor } from 'electron'

import type { SmartRule } from '../shared/app-types'
import { getSmartRules } from './app-store'
import {
  getSmartRuleMatchedDurationMs,
  matchSmartRuleCondition,
  type SystemSnapshot
} from './smart-rule-engine'
import { TimerService } from './timer-service'

const execFileAsync = promisify(execFile)
const POLL_INTERVAL_MS = 15_000
const SAFE_FALLBACK_METRICS = {
  cpuPercent: Number.POSITIVE_INFINITY,
  gpuPercent: null,
  networkTotalBytesPerSecond: Number.POSITIVE_INFINITY,
  networkReceivedBytesPerSecond: Number.POSITIVE_INFINITY,
  batteryPercent: null
} as const
const SYSTEM_METRICS_SCRIPT = `
  $cpu = [double]::PositiveInfinity
  $networkTotal = [double]::PositiveInfinity
  $networkReceived = [double]::PositiveInfinity
  $gpu = $null
  $battery = $null

  try {
    $cpu = [double](Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue
  } catch {}

  try {
    $networkTotalCounter = (Get-Counter '\\Network Interface(*)\\Bytes Total/sec').CounterSamples |
      Measure-Object -Property CookedValue -Sum |
      Select-Object -ExpandProperty Sum
    if ($null -ne $networkTotalCounter) {
      $networkTotal = [double]$networkTotalCounter
    }
  } catch {}

  try {
    $networkReceivedCounter = (Get-Counter '\\Network Interface(*)\\Bytes Received/sec').CounterSamples |
      Measure-Object -Property CookedValue -Sum |
      Select-Object -ExpandProperty Sum
    if ($null -ne $networkReceivedCounter) {
      $networkReceived = [double]$networkReceivedCounter
    }
  } catch {}

  try {
    $gpuSamples = (Get-Counter '\\GPU Engine(*)\\Utilization Percentage').CounterSamples |
      ForEach-Object { [double]$_.CookedValue } |
      Where-Object { $_ -ge 0 }
    if ($gpuSamples.Count -gt 0) {
      $gpu = ($gpuSamples | Measure-Object -Maximum).Maximum
    }
  } catch {}

  try {
    $batteries = Get-CimInstance Win32_Battery -ErrorAction Stop |
      Where-Object { $null -ne $_.EstimatedChargeRemaining }
    if ($batteries) {
      $battery = ($batteries | Measure-Object -Property EstimatedChargeRemaining -Average).Average
    }
  } catch {}

  [PSCustomObject]@{
    cpuPercent = $cpu
    gpuPercent = $gpu
    networkTotalBytesPerSecond = $networkTotal
    networkReceivedBytesPerSecond = $networkReceived
    batteryPercent = $battery
  } | ConvertTo-Json -Compress
`

export class SmartRuleService {
  private readonly matchedSince = new Map<string, number>()
  private readonly downloadPrimed = new Map<string, boolean>()
  private pollInterval: NodeJS.Timeout | null = null
  private initialPollTimeout: NodeJS.Timeout | null = null
  private isPolling = false

  constructor(private readonly timerService: TimerService) {}

  start(initialDelayMs = 0): void {
    if (this.pollInterval || this.initialPollTimeout) {
      return
    }

    this.pollInterval = setInterval(() => {
      void this.poll()
    }, POLL_INTERVAL_MS)

    if (initialDelayMs > 0) {
      this.initialPollTimeout = setTimeout(() => {
        this.initialPollTimeout = null
        void this.poll()
      }, initialDelayMs)
      return
    }

    void this.poll()
  }

  stop(): void {
    if (this.initialPollTimeout) {
      clearTimeout(this.initialPollTimeout)
    }

    if (this.pollInterval) {
      clearInterval(this.pollInterval)
    }

    this.initialPollTimeout = null
    this.pollInterval = null
  }

  private async poll(): Promise<void> {
    if (this.isPolling) {
      return
    }

    this.isPolling = true

    try {
      const activeRules = getSmartRules().filter((item) => item.enabled)
      this.pruneRuleState(activeRules)

      if (activeRules.length === 0) {
        return
      }

      const snapshot = await collectSystemSnapshot(activeRules)

      for (const rule of activeRules) {
        this.evaluateRule(rule, snapshot)
      }
    } finally {
      this.isPolling = false
    }
  }

  private evaluateRule(rule: SmartRule, snapshot: SystemSnapshot): void {
    const result = matchSmartRuleCondition(
      rule,
      snapshot,
      this.downloadPrimed.get(rule.id) ?? false
    )

    if (result.nextDownloadPrimed) {
      this.downloadPrimed.set(rule.id, true)
    } else {
      this.downloadPrimed.delete(rule.id)
    }

    if (!result.matched) {
      this.matchedSince.delete(rule.id)
      return
    }

    const now = Date.now()
    const matchedDurationMs = getSmartRuleMatchedDurationMs(rule, snapshot)
    const since = this.matchedSince.get(rule.id) ?? Math.max(0, now - matchedDurationMs)
    this.matchedSince.set(rule.id, since)

    if (now - since < rule.durationMinutes * 60_000) {
      return
    }

    if (this.timerService.getAppState().timer.status !== 'idle') {
      return
    }

    this.matchedSince.delete(rule.id)
    this.downloadPrimed.delete(rule.id)
    this.timerService.start({
      mode: 'delay',
      delayMinutes: Math.max(1, rule.warningMinutes || 1),
      action: rule.action,
      warningMinutes: Math.min(rule.warningMinutes, Math.max(1, rule.warningMinutes || 1)),
      soundEnabled: rule.soundEnabled,
      label: rule.name
    })
  }

  private pruneRuleState(activeRules: SmartRule[]): void {
    const activeRuleIds = new Set(activeRules.map((rule) => rule.id))

    for (const key of this.matchedSince.keys()) {
      if (!activeRuleIds.has(key)) {
        this.matchedSince.delete(key)
      }
    }

    for (const key of this.downloadPrimed.keys()) {
      if (!activeRuleIds.has(key)) {
        this.downloadPrimed.delete(key)
      }
    }
  }
}

async function collectSystemSnapshot(activeRules: SmartRule[]): Promise<SystemSnapshot> {
  const requiresSystemMetrics = activeRules.some((rule) => rule.condition !== 'idle')
  const metrics = requiresSystemMetrics
    ? await getSystemMetrics()
    : SAFE_FALLBACK_METRICS

  return {
    idleSeconds: powerMonitor.getSystemIdleTime(),
    onBatteryPower: powerMonitor.isOnBatteryPower(),
    cpuPercent: metrics.cpuPercent,
    gpuPercent: metrics.gpuPercent,
    networkTotalBytesPerSecond: metrics.networkTotalBytesPerSecond,
    networkReceivedBytesPerSecond: metrics.networkReceivedBytesPerSecond,
    batteryPercent: metrics.batteryPercent
  }
}

async function getSystemMetrics(): Promise<Omit<SystemSnapshot, 'idleSeconds' | 'onBatteryPower'>> {
  try {
    const output = await runPowerShell(SYSTEM_METRICS_SCRIPT)
    return parseSystemMetrics(output)
  } catch (error) {
    console.error('Failed to collect smart rule metrics', error)

    return { ...SAFE_FALLBACK_METRICS }
  }
}

async function runPowerShell(command: string): Promise<string> {
  const { stdout } = await execFileAsync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
    { windowsHide: true }
  )

  return stdout
}

function parseSystemMetrics(output: string): Omit<SystemSnapshot, 'idleSeconds' | 'onBatteryPower'> {
  try {
    const parsed = JSON.parse(output) as Record<string, unknown>

    return {
      cpuPercent: parseFiniteNumber(parsed.cpuPercent, Number.POSITIVE_INFINITY),
      gpuPercent: parseNullableNumber(parsed.gpuPercent),
      networkTotalBytesPerSecond: parseFiniteNumber(
        parsed.networkTotalBytesPerSecond,
        Number.POSITIVE_INFINITY
      ),
      networkReceivedBytesPerSecond: parseFiniteNumber(
        parsed.networkReceivedBytesPerSecond,
        Number.POSITIVE_INFINITY
      ),
      batteryPercent: parseNullableNumber(parsed.batteryPercent)
    }
  } catch (error) {
    console.error('Failed to parse smart rule metrics', error)

    return { ...SAFE_FALLBACK_METRICS }
  }
}

function parseFiniteNumber(value: unknown, fallback: number): number {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : fallback
}

function parseNullableNumber(value: unknown): number | null {
  const parsed = Number(value)

  return Number.isFinite(parsed) ? parsed : null
}
