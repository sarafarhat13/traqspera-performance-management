import { useEffect, useState, type ReactNode } from 'react'
import {
  ModusWcIcon,
  ModusWcMenu,
  ModusWcMenuItem,
  ModusWcNavbar,
  ModusWcSideNavigation,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { PUSH_LAYOUT_MIN_PX } from '../types'

const MOBILE_BREAKPOINT = 768

export interface ShellMenuItem {
  label: string
  value: string
  icon: string
}

export interface AppShellLayoutProps {
  children: ReactNode
  menuItems: ShellMenuItem[]
  selectedMenuItem: string
  onMenuSelect: (value: string) => void
  navbarTitle?: string
}

export function AppShellLayout({
  children,
  menuItems,
  selectedMenuItem,
  onMenuSelect,
  navbarTitle = 'Performance Management',
}: AppShellLayoutProps) {
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : PUSH_LAYOUT_MIN_PX,
  )
  const isOverlay = viewportWidth < PUSH_LAYOUT_MIN_PX
  const isNarrow = viewportWidth < MOBILE_BREAKPOINT
  const [expanded, setExpanded] = useState(!isOverlay)
  const [mainMenuOpen, setMainMenuOpen] = useState(false)

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isOverlay) {
      setExpanded(false)
      setMainMenuOpen(false)
    } else {
      setExpanded(true)
      setMainMenuOpen(false)
    }
  }, [isOverlay])

  useEffect(() => {
    const main = document.getElementById('main-content')
    if (!main) return
    if (isOverlay) {
      main.classList.remove('pm-side-expanded')
      main.style.marginLeft = '0'
      return
    }
    if (expanded) {
      main.classList.add('pm-side-expanded')
      main.style.marginLeft = '16rem'
    } else {
      main.classList.remove('pm-side-expanded')
      main.style.marginLeft = '4rem'
    }
  }, [expanded, isOverlay])

  const handleItemSelect = (e: CustomEvent<{ value: string }>) => {
    onMenuSelect(e.detail.value)
    if (isOverlay) {
      setExpanded(false)
      setMainMenuOpen(false)
    }
  }

  const railWrapperClass = isOverlay
    ? expanded
      ? 'fixed inset-y-0 left-0 z-40 w-64 overflow-auto pointer-events-auto'
      : 'fixed inset-y-0 left-0 z-40 w-0 overflow-hidden pointer-events-none'
    : expanded
      ? 'fixed inset-y-0 left-0 z-40 w-64'
      : 'fixed inset-y-0 left-0 z-40 w-16'

  return (
    <div className="app-shell flex flex-col flex-1 min-h-0 min-w-0 overflow-hidden bg-[var(--modus-wc-color-base-page)]">
      <ModusWcNavbar
        condensed={isNarrow}
        mainMenuOpen={isOverlay ? mainMenuOpen : false}
        visibility={{
          logo: true,
          mainMenu: true,
          apps: false,
          search: false,
          searchInput: false,
          notifications: false,
          help: false,
          user: true,
          ai: false,
        }}
        onMainMenuOpenChange={(e: CustomEvent<boolean>) => {
          if (isOverlay) {
            setMainMenuOpen(e.detail)
            setExpanded(e.detail)
          }
        }}
        customClass="shrink-0"
      >
        <div
          slot="center"
          hidden={isNarrow}
          className={isNarrow ? 'app-shell-navbar-center' : 'app-shell-navbar-center flex min-w-0 items-center gap-2'}
        >
          <ModusWcTypography hierarchy="p" size="md" weight="semibold" label={navbarTitle} />
        </div>
      </ModusWcNavbar>

      {isOverlay && expanded && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40"
          aria-label="Close navigation"
          onClick={() => {
            setExpanded(false)
            setMainMenuOpen(false)
          }}
        />
      )}

      <div className="flex flex-1 min-h-0 min-w-0 relative">
        <div className={railWrapperClass} inert={isOverlay && !expanded ? true : undefined}>
          <ModusWcSideNavigation
            key={isOverlay ? 'overlay' : 'push'}
            expanded={expanded}
            maxWidth="16rem"
            mode={isOverlay ? 'overlay' : 'push'}
            targetContent="#main-content"
            collapseOnClickOutside={isOverlay}
            onExpandedChange={(e: CustomEvent<boolean>) => {
              setExpanded(e.detail)
              if (isOverlay) setMainMenuOpen(e.detail)
            }}
            customClass="h-full"
          >
            <ModusWcMenu size="lg">
              {menuItems.map((item) => (
                <ModusWcMenuItem
                  key={item.value}
                  label={item.label}
                  value={item.value}
                  selected={selectedMenuItem === item.value}
                  onItemSelect={handleItemSelect}
                >
                  <ModusWcIcon slot="start-icon" name={item.icon} decorative size="md" />
                </ModusWcMenuItem>
              ))}
            </ModusWcMenu>
          </ModusWcSideNavigation>
        </div>

        <main
          id="main-content"
          className="flex flex-1 min-h-0 min-w-0 flex-col overflow-auto bg-[var(--modus-wc-color-base-page)]"
        >
          <div className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
