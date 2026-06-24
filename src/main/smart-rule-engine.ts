import type { SmartRule } from '../shared/app-types'
import { getDownloadActivationThresholdKbPerSecond } from '../shared/smart-rule-helpers'

export interface SystemSnapshot {
  idleSeconds: number
  onBatteryPower: boolean
  batteryPercent: number | null
  cpuPercent: number
  gpuPercent: number | null
  networkTotalBytesPerSecond: number
  networkReceivedBytesPerSecond: number
}

export interface SmartRuleMatchResult {
  matched: boolean
  nextDownloadPrimed: boolean
}

export function getSmartRuleMatchedDurationMs(
  rule: SmartRule,
  snapshot: SystemSnapshot
): number {
  if (rule.condition === 'idle') {
    return Math.max(0, snapshot.idleSeconds * 1000)
  }

  return 0
}

export function matchSmartRuleCondition(
  rule: SmartRule,
  snapshot: SystemSnapshot,
  downloadPrimed: boolean
): SmartRuleMatchResult {
  switch (rule.condition) {
    case 'idle':
      return {
        matched: snapshot.idleSeconds >= rule.durationMinutes * 60,
        nextDownloadPrimed: false
      }
    case 'battery-below':
      return {
        matched:
          snapshot.onBatteryPower &&
          snapshot.batteryPercent !== null &&
          snapshot.batteryPercent <= rule.threshold,
        nextDownloadPrimed: false
      }
    case 'cpu-below':
      return {
        matched: snapshot.cpuPercent <= rule.threshold,
        nextDownloadPrimed: false
      }
    case 'gpu-below':
      return {
        matched: snapshot.gpuPercent !== null && snapshot.gpuPercent <= rule.threshold,
        nextDownloadPrimed: false
      }
    case 'network-below':
      return {
        matched: snapshot.networkTotalBytesPerSecond <= rule.threshold * 1024,
        nextDownloadPrimed: false
      }
    case 'download-complete':
      return matchDownloadCompleteRule(rule, snapshot, downloadPrimed)
    default:
      return {
        matched: false,
        nextDownloadPrimed: false
      }
  }
}

function matchDownloadCompleteRule(
  rule: SmartRule,
  snapshot: SystemSnapshot,
  downloadPrimed: boolean
): SmartRuleMatchResult {
  const quietThresholdBytesPerSecond = Math.max(0, rule.threshold) * 1024
  const activeThresholdBytesPerSecond =
    getDownloadActivationThresholdKbPerSecond(Math.max(0, rule.threshold)) * 1024

  if (snapshot.networkReceivedBytesPerSecond >= activeThresholdBytesPerSecond) {
    return {
      matched: false,
      nextDownloadPrimed: true
    }
  }

  if (!downloadPrimed) {
    return {
      matched: false,
      nextDownloadPrimed: false
    }
  }

  return {
    matched: snapshot.networkReceivedBytesPerSecond <= quietThresholdBytesPerSecond,
    nextDownloadPrimed: true
  }
}
