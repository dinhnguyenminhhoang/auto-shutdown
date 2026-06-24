import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import type { SmartRule } from '../src/shared/app-types'
import {
  getSmartRuleMatchedDurationMs,
  matchSmartRuleCondition,
  type SystemSnapshot
} from '../src/main/smart-rule-engine'

const baseSnapshot: SystemSnapshot = {
  idleSeconds: 0,
  onBatteryPower: false,
  batteryPercent: null,
  cpuPercent: 50,
  gpuPercent: 50,
  networkTotalBytesPerSecond: 200 * 1024,
  networkReceivedBytesPerSecond: 200 * 1024
}

function createRule(overrides: Partial<SmartRule>): SmartRule {
  return {
    id: 'rule-1',
    name: 'Rule test',
    condition: 'idle',
    action: 'shutdown',
    durationMinutes: 5,
    threshold: 10,
    warningMinutes: 5,
    soundEnabled: true,
    enabled: true,
    ...overrides
  }
}

describe('smart rule engine', () => {
  it('uses actual idle duration instead of starting idle tracking from zero again', () => {
    const rule = createRule({ condition: 'idle', durationMinutes: 15 })

    assert.equal(
      getSmartRuleMatchedDurationMs(rule, { ...baseSnapshot, idleSeconds: 20 * 60 }),
      20 * 60 * 1000
    )
  })

  it('matches battery-below only when the device is on battery power', () => {
    const rule = createRule({ condition: 'battery-below', threshold: 20 })

    assert.deepEqual(
      matchSmartRuleCondition(
        rule,
        { ...baseSnapshot, onBatteryPower: true, batteryPercent: 18 },
        false
      ),
      { matched: true, nextDownloadPrimed: false }
    )

    assert.deepEqual(
      matchSmartRuleCondition(
        rule,
        { ...baseSnapshot, onBatteryPower: false, batteryPercent: 18 },
        false
      ),
      { matched: false, nextDownloadPrimed: false }
    )
  })

  it('does not match gpu-below when GPU telemetry is unavailable', () => {
    const rule = createRule({ condition: 'gpu-below', threshold: 10 })

    assert.deepEqual(
      matchSmartRuleCondition(rule, { ...baseSnapshot, gpuPercent: null }, false),
      { matched: false, nextDownloadPrimed: false }
    )
  })

  it('primes and completes a download-complete rule only after an active download', () => {
    const rule = createRule({ condition: 'download-complete', threshold: 64 })

    assert.deepEqual(
      matchSmartRuleCondition(
        rule,
        { ...baseSnapshot, networkReceivedBytesPerSecond: 40 * 1024 },
        false
      ),
      { matched: false, nextDownloadPrimed: false }
    )

    assert.deepEqual(
      matchSmartRuleCondition(
        rule,
        { ...baseSnapshot, networkReceivedBytesPerSecond: 900 * 1024 },
        false
      ),
      { matched: false, nextDownloadPrimed: true }
    )

    assert.deepEqual(
      matchSmartRuleCondition(
        rule,
        { ...baseSnapshot, networkReceivedBytesPerSecond: 120 * 1024 },
        true
      ),
      { matched: false, nextDownloadPrimed: true }
    )

    assert.deepEqual(
      matchSmartRuleCondition(
        rule,
        { ...baseSnapshot, networkReceivedBytesPerSecond: 32 * 1024 },
        true
      ),
      { matched: true, nextDownloadPrimed: true }
    )
  })

  it('uses total network traffic for network-below rules', () => {
    const rule = createRule({ condition: 'network-below', threshold: 100 })

    assert.deepEqual(
      matchSmartRuleCondition(rule, { ...baseSnapshot, networkTotalBytesPerSecond: 80 * 1024 }, false),
      { matched: true, nextDownloadPrimed: false }
    )

    assert.deepEqual(
      matchSmartRuleCondition(rule, { ...baseSnapshot, networkTotalBytesPerSecond: 180 * 1024 }, false),
      { matched: false, nextDownloadPrimed: false }
    )
  })
})
