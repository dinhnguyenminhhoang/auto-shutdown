import { Bell, Clock3, Moon, Power, TimerReset } from 'lucide-react'

import { Button } from '@/components/ui/button'

function App(): React.JSX.Element {
  return (
    <main className="min-h-screen bg-background px-6 py-6 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Auto Shutdown VN</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-normal">
              Shutdown timer workspace
            </h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Bell />
              Notifications
            </Button>
            <Button size="sm">
              <Power />
              Start timer
            </Button>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-lg border bg-card p-5 text-card-foreground shadow-xs">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Countdown preview</p>
                <p className="mt-2 font-mono text-5xl font-semibold tabular-nums">00:29:12</p>
              </div>
              <div className="rounded-md border bg-secondary p-3 text-secondary-foreground">
                <TimerReset className="size-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {['15 min', '30 min', '1 hour'].map((preset) => (
                <Button key={preset} variant="secondary">
                  {preset}
                </Button>
              ))}
            </div>
          </div>

          <aside className="rounded-lg border bg-card p-5 text-card-foreground shadow-xs">
            <p className="text-sm font-medium text-muted-foreground">Next milestone</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">Schedule by exact time</p>
                  <p className="text-sm text-muted-foreground">
                    Target for version 0.1 from the roadmap.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Moon className="mt-0.5 size-4 text-primary" />
                <div>
                  <p className="font-medium">Sleep-ready desktop feel</p>
                  <p className="text-sm text-muted-foreground">
                    Tray mode and quick actions come after MVP.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  )
}

export default App
