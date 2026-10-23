import { type ReactNode } from 'react'
import { BrowserRouter, HashRouter } from 'react-router-dom'
export type PerformanceRouterMode = 'browser' | 'hash'

type PerformanceRouterShellProps = {
  children: ReactNode
  mode?: PerformanceRouterMode
  basename?: string
}

export function PerformanceRouterShell({
  children,
  mode = 'browser',
  basename,
}: PerformanceRouterShellProps) {
  const resolvedBasename =
    basename ?? (mode === 'browser' ? import.meta.env.BASE_URL.replace(/\/$/, '') || undefined : undefined)

  if (mode === 'hash') {
    return <HashRouter>{children}</HashRouter>
  }

  return <BrowserRouter basename={resolvedBasename}>{children}</BrowserRouter>
}
