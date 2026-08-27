import type { ReactNode } from 'react'
import { navPageToTitle } from '../utils/text'
import {
  AlignJustify,
  Award,
  BarChart2,
  Bell,
  Briefcase,
  ChevronDown,
  ChevronRight,
  CreditCard,
  FileText,
  Grid3x3,
  HelpCircle,
  Settings,
  Shield,
  User,
  Users,
  Wrench,
} from 'lucide-react'
import { ModusWcSelect } from '@trimble-oss/moduswebcomponents-react'
import { useState, useEffect } from 'react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import type { DemoRole } from '../types'
import {
  NAV_COLLAPSED_W,
  NAV_EXPANDED_W,
  MY_INFO_PAGES,
  PERFORMANCE_PAGES,
  SETTINGS_PAGES,
  SUB_NAV_W,
  TOP_BAR_H,
  TRAQSPERA_OS,
  type TraqsperaNavPage,
} from './traqsperaShellConstants'

type NavSection = {
  key: string
  label: string
  icon: ReactNode
  page?: TraqsperaNavPage
  getChildren?: (role: DemoRole) => { key: TraqsperaNavPage; label: string }[]
}

const NAV_SECTIONS: NavSection[] = [
  {
    key: 'my_info',
    label: 'My Info',
    icon: <User size={16} />,
    getChildren: () => [
      { key: 'my_info_personal', label: 'Personal Information' },
      { key: 'my_info_hours', label: 'My Hours' },
      { key: 'my_info_certifications', label: 'Certifications' },
      { key: 'my_info_performance', label: 'My Performance' },
    ],
  },
  { key: 'employees', label: 'Employees', icon: <Users size={16} />, page: 'employees' },
  { key: 'jobs', label: 'Jobs', icon: <Briefcase size={16} />, page: 'jobs' },
  { key: 'expenses', label: 'Expenses', icon: <CreditCard size={16} />, page: 'expenses' },
  { key: 'reports', label: 'Reports', icon: <BarChart2 size={16} />, page: 'reports' },
  {
    key: 'performance',
    label: 'Performance',
    icon: <Award size={16} />,
    getChildren: (role) => {
      if (role === 'employee') {
        return [{ key: 'p_perf_my_reviews', label: 'Reviews' }]
      }
      const reviewsKey: TraqsperaNavPage =
        role === 'hr_admin' ? 'p_perf_dashboard' : 'p_perf_team'
      return [
        { key: reviewsKey, label: 'Reviews' },
        { key: 'p_perf_templates', label: 'Templates' },
      ]
    },
  },
  { key: 'equipment', label: 'Equipment', icon: <Wrench size={16} />, page: 'equipment' },
  { key: 'documents', label: 'Documents', icon: <FileText size={16} />, page: 'documents' },
  { key: 'settings', label: 'Settings', icon: <Settings size={16} />, page: 'settings' },
  { key: 'global_admin', label: 'Global Admin', icon: <Shield size={16} />, page: 'global_admin' },
]

const ROLE_VIEWING_OPTIONS = [
  { label: 'Viewing as HR Admin', value: 'hr_admin' },
  { label: 'Viewing as Employee', value: 'employee' },
  { label: 'Viewing as Manager', value: 'manager' },
]

function TopBar({
  onMenuClick,
  minimalChrome = false,
}: {
  onMenuClick?: () => void
  minimalChrome?: boolean
}) {
  const [tenant, setTenant] = useState('enterprise')
  const { state, setDemoRole } = usePerformance()
  const person = state.people.find((p) => p.id === state.activePersonId)

  return (
    <div
      className="fixed top-0 left-0 right-0 flex items-center bg-white border-b border-[#e0e1e9] px-[12px]"
      style={{ height: TOP_BAR_H, zIndex: 60 }}
    >
      {!minimalChrome && (
        <button
          type="button"
          onClick={onMenuClick}
          className="flex h-[32px] w-[32px] shrink-0 items-center justify-center rounded-[4px] text-[#464b52] hover:text-[#252a2e] hover:bg-[#f1f1f6] transition-colors mr-[10px]"
          aria-label="Toggle navigation"
        >
          <AlignJustify size={16} />
        </button>
      )}
      <div className="flex items-center gap-[7px] mr-[16px]">
        <div className="flex h-[24px] w-[24px] shrink-0 items-center justify-center rounded-[4px] bg-[#0d3560]">
          <span className="text-[11px] font-black text-white">T</span>
        </div>
        <span className="text-[14px] font-bold text-[#0d3560] whitespace-nowrap">Traqspera</span>
      </div>
      <ModusWcSelect
        aria-label="Tenant"
        size="sm"
        value={tenant}
        options={[
          { label: 'Enterprise', value: 'enterprise' },
          { label: 'Northwest Division', value: 'northwest' },
        ]}
        onInputChange={(e) => setTenant(readInputString(e as CustomEvent))}
        customClass="w-[180px]"
      />
      <div className="ml-auto flex items-center gap-[6px]">
        <ModusWcSelect
          aria-label="Viewing as"
          size="sm"
          value={state.demoRole}
          options={ROLE_VIEWING_OPTIONS}
          onInputChange={(e) => setDemoRole(readInputString(e as CustomEvent) as DemoRole)}
          customClass="w-[200px]"
        />
        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6a6e79] hover:text-[#252a2e] hover:bg-[#f1f1f6] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={15} />
        </button>
        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6a6e79] hover:text-[#252a2e] hover:bg-[#f1f1f6] transition-colors"
          aria-label="Help"
        >
          <HelpCircle size={15} />
        </button>
        <button
          type="button"
          className="flex h-[32px] w-[32px] items-center justify-center rounded-full text-[#6a6e79] hover:text-[#252a2e] hover:bg-[#f1f1f6] transition-colors"
          aria-label="Applications"
        >
          <Grid3x3 size={15} />
        </button>
        <div
          className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-[#252a2e] text-white text-[11px] font-bold"
          title={person?.name ?? 'User'}
        >
          {person?.name
            ? person.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()
            : 'JD'}
        </div>
      </div>
    </div>
  )
}

function NavSidebar({
  activePage,
  onNavigate,
  collapsed,
  onToggleCollapse,
  role,
}: {
  activePage: TraqsperaNavPage
  onNavigate: (page: TraqsperaNavPage) => void
  collapsed: boolean
  onToggleCollapse: () => void
  role: DemoRole
}) {
  const navW = collapsed ? NAV_COLLAPSED_W : NAV_EXPANDED_W
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => ({
    my_info: MY_INFO_PAGES.has(activePage),
    performance: PERFORMANCE_PAGES.has(activePage),
  }))

  useEffect(() => {
    if (MY_INFO_PAGES.has(activePage)) {
      setExpandedSections((prev) => ({ ...prev, my_info: true }))
    }
    if (PERFORMANCE_PAGES.has(activePage)) {
      setExpandedSections((prev) => ({ ...prev, performance: true }))
    }
  }, [activePage])

  const toggleSection = (sectionKey: string, collapsedSidebar: boolean) => {
    if (collapsedSidebar) {
      onToggleCollapse()
      setExpandedSections((prev) => ({ ...prev, [sectionKey]: true }))
      return
    }
    setExpandedSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))
  }

  return (
    <div
      className="fixed left-0 flex flex-col transition-all duration-200"
      style={{
        width: navW,
        top: TOP_BAR_H,
        height: `calc(100vh - ${TOP_BAR_H}px)`,
        background: '#0d3560',
        zIndex: 40,
        overflow: 'hidden',
      }}
    >
      <div className="flex-1 overflow-y-auto py-[4px]" style={{ scrollbarWidth: 'none' }}>
        {NAV_SECTIONS.map((section) => {
          const children = section.getChildren?.(role)
          const myInfoActive = section.key === 'my_info' && MY_INFO_PAGES.has(activePage)
          const performanceActive = section.key === 'performance' && PERFORMANCE_PAGES.has(activePage)
          const settingsActive = section.key === 'settings' && SETTINGS_PAGES.has(activePage)
          const rowActive = section.page === activePage || myInfoActive || performanceActive || settingsActive
          const expanded = Boolean(expandedSections[section.key])

          if (children) {
            return (
              <div key={section.key}>
                <button
                  type="button"
                  title={collapsed ? section.label : undefined}
                  aria-expanded={!collapsed ? expanded : undefined}
                  onClick={() => toggleSection(section.key, collapsed)}
                  className="flex w-full items-center transition-colors"
                  style={{
                    position: 'relative',
                    height: 44,
                    paddingLeft: collapsed ? 0 : 14,
                    paddingRight: collapsed ? 0 : 14,
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    gap: collapsed ? 0 : 10,
                    background: rowActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                    borderLeft: rowActive ? '3px solid #f59e0b' : '3px solid transparent',
                  }}
                >
                  <span className="shrink-0" style={{ color: rowActive ? '#fff' : 'rgba(255,255,255,0.72)' }}>
                    {section.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left text-[13px] font-semibold text-white whitespace-nowrap">
                        {section.label}
                      </span>
                      {expanded ? (
                        <ChevronDown size={13} color="rgba(255,255,255,0.30)" />
                      ) : (
                        <ChevronRight size={13} color="rgba(255,255,255,0.30)" />
                      )}
                    </>
                  )}
                  {collapsed && (
                    <span style={{ position: 'absolute', right: 3, color: 'rgba(255,255,255,0.35)' }}>
                      <ChevronRight size={9} />
                    </span>
                  )}
                </button>
                {!collapsed && expanded && (
                  <div className="pb-[4px]">
                    {children.map((child) => {
                      const childActive = activePage === child.key
                      return (
                        <button
                          key={child.key}
                          type="button"
                          onClick={() => onNavigate(child.key)}
                          className="flex w-full items-center transition-colors"
                          style={{
                            height: 36,
                            paddingLeft: 42,
                            paddingRight: 14,
                            background: childActive ? 'rgba(255,255,255,0.08)' : 'transparent',
                            borderLeft: childActive ? '3px solid #f59e0b' : '3px solid transparent',
                          }}
                          aria-current={childActive ? 'page' : undefined}
                        >
                          <span
                            className="text-left text-[12px] whitespace-nowrap"
                            style={{
                              color: childActive ? '#fff' : 'rgba(255,255,255,0.65)',
                              fontWeight: childActive ? 600 : 400,
                            }}
                          >
                            {child.label}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          return (
            <button
              key={section.key}
              type="button"
              title={collapsed ? section.label : undefined}
              onClick={() => {
                if (collapsed) {
                  onToggleCollapse()
                }
                if (section.page) onNavigate(section.page)
              }}
              className="flex w-full items-center transition-colors"
              style={{
                position: 'relative',
                height: 44,
                paddingLeft: collapsed ? 0 : 14,
                paddingRight: collapsed ? 0 : 14,
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 10,
                background: rowActive ? 'rgba(255,255,255,0.10)' : 'transparent',
                borderLeft: rowActive ? '3px solid #f59e0b' : '3px solid transparent',
              }}
            >
              <span className="shrink-0" style={{ color: rowActive ? '#fff' : 'rgba(255,255,255,0.72)' }}>
                {section.icon}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 text-left text-[13px] font-semibold text-white whitespace-nowrap">
                    {section.label}
                  </span>
                  <ChevronRight size={13} color="rgba(255,255,255,0.30)" />
                </>
              )}
              {collapsed && (
                <span style={{ position: 'absolute', right: 3, color: 'rgba(255,255,255,0.35)' }}>
                  <ChevronRight size={9} />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-center">
        <div className="mx-auto mb-[12px] flex h-[48px] w-[48px] items-center justify-center rounded-full bg-[#e0e1e9]">
          <FileText size={22} className="text-[#6a6e79]" />
        </div>
        <p className="text-[16px] font-bold text-[#252a2e]" style={{ fontFamily: TRAQSPERA_OS }}>{title}</p>
        <p className="mt-[4px] text-[12px] text-[#6a6e79]">This page is under construction.</p>
      </div>
    </div>
  )
}

export interface TraqsperaShellProps {
  activePage: TraqsperaNavPage
  onNavigate: (page: TraqsperaNavPage) => void
  minimalChrome?: boolean
  fullScreenContent?: boolean
  children: ReactNode
}

export function TraqsperaShell({
  activePage,
  onNavigate,
  minimalChrome = false,
  fullScreenContent = false,
  children,
}: TraqsperaShellProps) {
  const [navCollapsed, setNavCollapsed] = useState(true)
  const { state } = usePerformance()
  const inSettings = SETTINGS_PAGES.has(activePage)
  const navW = navCollapsed ? NAV_COLLAPSED_W : NAV_EXPANDED_W
  const showSideNav = !minimalChrome && !fullScreenContent
  const contentLeft = showSideNav ? navW + (inSettings ? SUB_NAV_W + 16 : 0) : 0

  if (fullScreenContent) {
    return (
      <div
        className="h-[100dvh] overflow-hidden bg-[#f1f1f6] font-sans"
        style={{ fontFamily: TRAQSPERA_OS }}
      >
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-[#f1f1f6]" style={{ fontFamily: TRAQSPERA_OS }}>
      <TopBar
        minimalChrome={minimalChrome}
        onMenuClick={() => setNavCollapsed((v) => !v)}
      />
      {showSideNav && (
        <NavSidebar
          activePage={activePage}
          onNavigate={onNavigate}
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed((v) => !v)}
          role={state.demoRole}
        />
      )}
      {showSideNav && inSettings && (
        <div
          className="fixed flex flex-col"
          style={{
            left: navW,
            top: TOP_BAR_H,
            width: SUB_NAV_W + 16,
            height: `calc(100vh - ${TOP_BAR_H}px)`,
            zIndex: 39,
            padding: '12px 8px',
          }}
        >
          <div className="flex flex-col bg-white rounded-[8px] shadow-[0_2px_12px_rgba(0,0,0,0.12)] border border-[#e0e1e9] h-full items-center justify-center p-6">
            <p className="text-[14px] text-[#6a6e79]">Settings modules are not part of this prototype.</p>
          </div>
        </div>
      )}
      <div
        className="min-w-0 bg-[#f1f1f6] overflow-y-auto"
        style={{
          marginLeft: contentLeft,
          marginTop: TOP_BAR_H,
          height: `calc(100vh - ${TOP_BAR_H}px)`,
        }}
      >
        {minimalChrome || PERFORMANCE_PAGES.has(activePage) || MY_INFO_PAGES.has(activePage)
          ? children
          : <PlaceholderPage title={navPageToTitle(activePage)} />}
      </div>
    </div>
  )
}
