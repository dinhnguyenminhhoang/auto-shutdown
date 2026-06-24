import * as React from 'react'
import { ExternalLink } from 'lucide-react'

import type { AppInfo } from '../../../shared/app-runtime'

export function AppFooter({
  appInfo,
  onOpenAuthorLink
}: {
  appInfo: AppInfo
  onOpenAuthorLink: () => void
}): React.JSX.Element {
  return (
    <footer className="shrink-0 border-t bg-card/95 px-4 py-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p className="font-medium">v{appInfo.version} • {appInfo.copyrightLabel}</p>
        <button
          className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-all hover:text-foreground cursor-pointer"
          onClick={onOpenAuthorLink}
        >
          Được phát triển bởi {appInfo.authorName}
          <ExternalLink className="size-3.5" />
        </button>
      </div>
    </footer>
  )
}
