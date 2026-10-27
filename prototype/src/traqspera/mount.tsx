import '@trimble-oss/moduswebcomponents/modus-wc-styles.css'
import '@trimble-oss/moduswebcomponents/modus-icons.css'
import { createRoot, type Root } from 'react-dom/client'
import { ModusWcThemeProvider } from '@trimble-oss/moduswebcomponents-react'
import { useEffect, useState } from 'react'
import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import '../index.css'
import { PerformanceProvider } from '../context/PerformanceContext'
import { PerformanceViewRouter } from '../components/PerformanceViewRouter'
import { PerformanceRouterShell } from '../routing/PerformanceRouterShell'
import { PerformanceUrlSync } from '../routing/PerformanceUrlSync'
import { fetchPerformanceState, type PerformanceBootstrapPayload } from '../api/performanceApi'
import { bootstrapLightTheme, LIGHT_THEME } from '../theme'
import type { ViewId } from '../types'
import { setAssetPath } from '@trimble-oss/moduswebcomponents/components'

export type TraqsperaPerformanceMountOptions = {
  apiBaseUrl: string
  dataSource?: 'localStorage' | 'api'
  initialView?: ViewId
  currentUserPersonId?: string
}

let activeRoot: Root | null = null

function IslandApp({
  options,
  bootstrap,
}: {
  options: TraqsperaPerformanceMountOptions
  bootstrap: PerformanceBootstrapPayload
}) {
  return (
    <PerformanceProvider
      dataSource={options.dataSource ?? 'api'}
      apiBaseUrl={options.apiBaseUrl}
      bootstrap={bootstrap}
      initialView={options.initialView}
      currentUserPersonId={options.currentUserPersonId}
    >
      <PerformanceRouterShell mode="hash">
        <PerformanceUrlSync />
        <div className="performance-management-island w-full min-w-0">
          <PerformanceViewRouter />
        </div>
      </PerformanceRouterShell>
    </PerformanceProvider>
  )
}

function LoadingState() {
  return (
    <div className="p-6">
      <ModusWcTypography hierarchy="p" size="md" label="Loading performance management…" />
    </div>
  )
}

function TraqsperaPerformanceRoot({ options }: { options: TraqsperaPerformanceMountOptions }) {
  const [bootstrap, setBootstrap] = useState<PerformanceBootstrapPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if ((options.dataSource ?? 'api') === 'localStorage') {
      setBootstrap(null)
      return
    }
    void fetchPerformanceState(options.apiBaseUrl)
      .then(setBootstrap)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load')
      })
  }, [options.apiBaseUrl, options.currentUserPersonId, options.dataSource])

  if (error) {
    return (
      <div className="p-6">
        <ModusWcTypography hierarchy="p" size="md" label={error} />
      </div>
    )
  }
  if ((options.dataSource ?? 'api') === 'localStorage') {
    return (
      <PerformanceProvider
        dataSource="localStorage"
        initialView={options.initialView}
        currentUserPersonId={options.currentUserPersonId}
      >
        <PerformanceRouterShell mode="hash">
          <PerformanceUrlSync />
          <div className="performance-management-island w-full min-w-0">
            <PerformanceViewRouter />
          </div>
        </PerformanceRouterShell>
      </PerformanceProvider>
    )
  }

  if (!bootstrap) return <LoadingState />
  return <IslandApp options={options} bootstrap={bootstrap} />
}

export function mountTraqsperaPerformance(
  element: HTMLElement,
  options: TraqsperaPerformanceMountOptions,
): void {
  bootstrapLightTheme()
  if (typeof window !== 'undefined') {
    setAssetPath(`${window.location.origin}/`)
  }

  activeRoot?.unmount()
  activeRoot = createRoot(element)
  activeRoot.render(
    <ModusWcThemeProvider initialTheme={LIGHT_THEME}>
      <TraqsperaPerformanceRoot options={options} />
    </ModusWcThemeProvider>,
  )
}

declare global {
  interface Window {
    TraqsperaPerformance?: {
      mount: typeof mountTraqsperaPerformance
    }
  }
}

if (typeof window !== 'undefined') {
  window.TraqsperaPerformance = { mount: mountTraqsperaPerformance }
}
