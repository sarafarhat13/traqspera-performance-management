import { useState, type ReactNode } from 'react'
import { AlignJustify, Monitor, User } from 'lucide-react'
import { ModusWcButton } from '@trimble-oss/moduswebcomponents-react'
import { personInitials } from './employeeMobileConstants'

type EmployeeMobileShellProps = {
  title: string
  personName: string
  showBack?: boolean
  onBack?: () => void
  layoutMode: 'desktop' | 'mobile'
  onLayoutModeChange: (mode: 'desktop' | 'mobile') => void
  children: ReactNode
}

export function EmployeeMobileShell({
  title,
  personName,
  showBack = false,
  onBack,
  layoutMode,
  onLayoutModeChange,
  children,
}: EmployeeMobileShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = personInitials(personName)

  return (
    <div className="tq-employee-mobile-phone-frame">
      <div className="tq-employee-mobile-phone-frame__chrome">
        <ModusWcButton
          variant="outlined"
          color="tertiary"
          size="sm"
          customClass="tq-employee-mobile-phone-frame__desktop-btn"
          onButtonClick={() => onLayoutModeChange('desktop')}
        >
          <Monitor size={14} aria-hidden />
          Desktop view
        </ModusWcButton>
      </div>

      <div className="tq-employee-mobile-phone">
        <header className="tq-employee-mobile-shell__header shrink-0 border-b border-[#e0e1e9] bg-white px-3">
          <div className="flex h-14 items-center gap-2">
            {showBack ? (
              <button
                type="button"
                className="tq-employee-mobile-shell__icon-btn"
                aria-label="Back"
                onClick={onBack}
              >
                <span className="text-[20px] leading-none text-[#464b52]" aria-hidden>
                  ‹
                </span>
              </button>
            ) : (
              <button
                type="button"
                className="tq-employee-mobile-shell__icon-btn"
                aria-label="Open menu"
                aria-expanded={menuOpen}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <AlignJustify size={18} className="text-[#464b52]" aria-hidden />
              </button>
            )}

            <div className="flex min-w-0 flex-1 items-center gap-2">
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] bg-[#0d3560]"
                aria-hidden
              >
                <span className="text-[11px] font-black text-white">T</span>
              </div>
              <h1 className="truncate text-[15px] font-bold leading-[20px] text-[#252a2e]">{title}</h1>
            </div>

            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d3560] text-[11px] font-bold text-white"
              aria-label={`${personName} profile`}
            >
              {initials}
            </div>
          </div>

          {menuOpen && !showBack && (
            <div className="border-t border-[#e0e1e9] px-1 py-2">
              <p className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6a6e79]">
                Prototype view
              </p>
              <div className="flex gap-1 px-1">
                <ModusWcButton
                  variant={layoutMode === 'desktop' ? 'filled' : 'outlined'}
                  color={layoutMode === 'desktop' ? 'primary' : 'tertiary'}
                  size="sm"
                  onButtonClick={() => {
                    onLayoutModeChange('desktop')
                    setMenuOpen(false)
                  }}
                >
                  Desktop
                </ModusWcButton>
                <ModusWcButton
                  variant={layoutMode === 'mobile' ? 'filled' : 'outlined'}
                  color={layoutMode === 'mobile' ? 'primary' : 'tertiary'}
                  size="sm"
                  onButtonClick={() => setMenuOpen(false)}
                >
                  Mobile
                </ModusWcButton>
              </div>
            </div>
          )}
        </header>

        <main className="tq-employee-mobile-shell__main tq-employee-view min-h-0 flex-1 overflow-y-auto">{children}</main>

        {!showBack && (
          <nav
            className="tq-employee-mobile-shell__bottom-nav shrink-0 border-t border-[#e0e1e9] bg-white"
            aria-label="Employee mobile navigation"
          >
            <button
              type="button"
              className="tq-employee-mobile-shell__bottom-nav-item is-active w-full"
              aria-current="page"
            >
              <User size={20} aria-hidden />
              <span>My Info</span>
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
