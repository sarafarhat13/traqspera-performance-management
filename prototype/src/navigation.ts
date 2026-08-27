import type { ViewId, DemoRole, EmployeeDetailsTab } from './types'
import type { TraqsperaNavPage } from './layouts/traqsperaShellConstants'
import { MY_INFO_PAGES, PERFORMANCE_PAGES } from './layouts/traqsperaShellConstants'

const MY_INFO_TAB_BY_PAGE: Record<
  Extract<
    TraqsperaNavPage,
    'my_info_personal' | 'my_info_hours' | 'my_info_certifications' | 'my_info_performance'
  >,
  EmployeeDetailsTab
> = {
  my_info_personal: 'personal',
  my_info_hours: 'my_hours',
  my_info_certifications: 'certifications',
  my_info_performance: 'performance',
}

const MY_INFO_PAGE_BY_TAB: Partial<Record<EmployeeDetailsTab, TraqsperaNavPage>> = {
  personal: 'my_info_personal',
  my_hours: 'my_info_hours',
  certifications: 'my_info_certifications',
  performance: 'my_info_performance',
}

export type NavTarget = {
  view: ViewId
  employeeDetailsTab?: EmployeeDetailsTab
  selectedPersonId?: string | null
}

export function navPageFromView(
  view: ViewId,
  role: DemoRole,
  options?: {
    selectedPersonId?: string | null
    activePersonId?: string
    employeeDetailsTab?: EmployeeDetailsTab
  },
): TraqsperaNavPage {
  const { selectedPersonId, activePersonId, employeeDetailsTab } = options ?? {}

  if (
    view === 'employee_details' &&
    selectedPersonId &&
    activePersonId &&
    selectedPersonId === activePersonId
  ) {
    if (employeeDetailsTab === 'performance') return 'my_info_performance'
    return MY_INFO_PAGE_BY_TAB[employeeDetailsTab ?? 'personal'] ?? 'my_info_personal'
  }

  if (view === 'templates' || view === 'template_editor') return 'p_perf_templates'
  if (view === 'launch_cycle_wizard') {
    if (role === 'hr_admin') return 'p_perf_dashboard'
    return 'p_perf_team'
  }
  if (view === 'cycle_details') {
    if (role === 'hr_admin') return 'p_perf_dashboard'
    return 'p_perf_dashboard'
  }
  if (view === 'employee_details') {
    if (role === 'hr_admin') return 'p_perf_dashboard'
    return 'p_perf_team'
  }
  if (
    view === 'employee_dashboard' ||
    view === 'self_eval' ||
    view === 'acknowledgement'
  ) {
    if (role === 'employee') return 'my_info_performance'
  }
  if (view === 'manager_dashboard' || view === 'manager_review') return 'p_perf_team'
  if (view === 'hr_dashboard') return 'p_perf_dashboard'
  if (view === 'review_details') {
    if (role === 'hr_admin') return 'p_perf_dashboard'
    if (role === 'employee') return 'my_info_performance'
    return 'p_perf_team'
  }
  if (role === 'hr_admin') return 'p_perf_dashboard'
  if (role === 'employee') return 'my_info_performance'
  return 'p_perf_team'
}

export function navTargetFromNavPage(page: TraqsperaNavPage, role: DemoRole, activePersonId: string): NavTarget | null {
  if (MY_INFO_PAGES.has(page)) {
    return {
      view: 'employee_details',
      employeeDetailsTab: MY_INFO_TAB_BY_PAGE[page as keyof typeof MY_INFO_TAB_BY_PAGE],
      selectedPersonId: activePersonId,
    }
  }

  if (!PERFORMANCE_PAGES.has(page)) return null

  switch (page) {
    case 'p_perf_dashboard':
      return { view: 'hr_dashboard' }
    case 'p_perf_templates':
      return { view: 'templates' }
    case 'p_perf_team':
      return { view: 'manager_dashboard' }
    default:
      return null
  }
}

/** @deprecated Use navTargetFromNavPage */
export function viewFromNavPage(page: TraqsperaNavPage, role: DemoRole): ViewId | null {
  return navTargetFromNavPage(page, role, '')?.view ?? null
}
