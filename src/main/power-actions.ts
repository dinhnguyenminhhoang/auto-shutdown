import { spawn } from 'child_process'

import type { PowerAction } from '../shared/scheduler'

export interface PowerCommand {
  command: string
  args: string[]
}

export function buildPowerCommand(action: PowerAction): PowerCommand {
  switch (action) {
    case 'shutdown':
      return { command: 'shutdown.exe', args: ['/s', '/t', '0'] }
    case 'restart':
      return { command: 'shutdown.exe', args: ['/r', '/t', '0'] }
    case 'sleep':
      return { command: 'rundll32.exe', args: ['powrprof.dll,SetSuspendState', '0,1,0'] }
    case 'hibernate':
      return { command: 'shutdown.exe', args: ['/h'] }
    case 'lock':
      return { command: 'rundll32.exe', args: ['user32.dll,LockWorkStation'] }
    case 'signout':
      return { command: 'shutdown.exe', args: ['/l'] }
  }
}

export function gracefulCloseAllApps(): Promise<void> {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve()
      return
    }

    const script = `
      $wshell = New-Object -ComObject WScript.Shell;
      Get-Process | Where-Object { $_.MainWindowTitle -ne '' -and $_.Id -ne $PID -and $_.ProcessName -ne 'explorer' -and $_.ProcessName -ne 'electron' -and $_.ProcessName -ne 'auto-shutdown-vn' } | ForEach-Object {
        try {
          $wshell.AppActivate($_.Id);
          Start-Sleep -Milliseconds 150;
          $wshell.SendKeys('^s');
          Start-Sleep -Milliseconds 250;
          $_.CloseMainWindow();
        } catch {}
      }
    `
    const ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script])
    ps.on('close', () => {
      resolve()
    })
  })
}

export async function runPowerAction(action: PowerAction, force = false): Promise<void> {
  if (force && (action === 'shutdown' || action === 'restart' || action === 'signout')) {
    try {
      await gracefulCloseAllApps()
    } catch (e) {
      console.error('Failed to gracefully close apps', e)
    }
    // Delay to let apps save and exit
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }

  const { command, args } = buildPowerCommand(action)

  spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref()
}

export function abortWindowsShutdown(): void {
  spawn('shutdown.exe', ['/a'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  }).unref()
}

