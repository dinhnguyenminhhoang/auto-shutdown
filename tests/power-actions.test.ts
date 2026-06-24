import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { buildPowerCommand } from '../src/main/power-actions'

describe('power actions', () => {
  it('builds a shutdown command', () => {
    assert.deepEqual(buildPowerCommand('shutdown'), {
      command: 'shutdown.exe',
      args: ['/s', '/t', '0']
    })
  })

  it('builds a restart command', () => {
    assert.deepEqual(buildPowerCommand('restart'), {
      command: 'shutdown.exe',
      args: ['/r', '/t', '0']
    })
  })

  it('builds sleep, hibernate, lock, and sign out commands', () => {
    assert.deepEqual(buildPowerCommand('sleep'), {
      command: 'rundll32.exe',
      args: ['powrprof.dll,SetSuspendState', '0,1,0']
    })
    assert.deepEqual(buildPowerCommand('hibernate'), {
      command: 'shutdown.exe',
      args: ['/h']
    })
    assert.deepEqual(buildPowerCommand('lock'), {
      command: 'rundll32.exe',
      args: ['user32.dll,LockWorkStation']
    })
    assert.deepEqual(buildPowerCommand('signout'), {
      command: 'shutdown.exe',
      args: ['/l']
    })
  })
})
