import type { AppState, EmployeeDetailsTab, ViewId } from '../types'

/** Serializable route derived from URL or applied to app state. */
export type PerformanceRouteState = {
  view: ViewId
  cycleId?: string | null
  templateId?: string | null
  personId?: string | null
  reviewId?: string | null
  tab?: EmployeeDetailsTab
}

const TAB_TO_SLUG: Record<EmployeeDetailsTab, string> = {
  personal: 'personal',
  emergency_contact: 'emergency-contact',
  certifications: 'certifications',
  my_hours: 'hours',
  time_off_balance: 'time-off',
  performance: 'performance',
  additional: 'additional',
  history: 'history',
}

const SLUG_TO_TAB: Record<string, EmployeeDetailsTab> = Object.fromEntries(
  Object.entries(TAB_TO_SLUG).map(([tab, slug]) => [slug, tab as EmployeeDetailsTab]),
) as Record<string, EmployeeDetailsTab>

function parseEmployeeTabParam(tabParam: string | null): EmployeeDetailsTab {
  if (!tabParam) return 'personal'
  if (tabParam in TAB_TO_SLUG) return tabParam as EmployeeDetailsTab
  return SLUG_TO_TAB[tabParam] ?? 'personal'
}

function normalizePath(path: string): string {
  const trimmed = path.replace(/\/+$/, '') || '/'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function splitPath(pathname: string): string[] {
  return normalizePath(pathname)
    .split('/')
    .filter(Boolean)
}

export function buildPerformancePath(state: AppState): string {
  const { view } = state

  switch (view) {
    case 'hr_dashboard':
      return '/'
    case 'cycle_details': {
      const id = state.selectedCycleId
      return id ? `/cycles/${encodeURIComponent(id)}` : '/'
    }
    case 'launch_cycle_wizard':
      return '/launch-cycle'
    case 'templates':
      return '/templates'
    case 'template_editor': {
      const id = state.editingTemplateId ?? state.selectedTemplateId
      return id ? `/templates/${encodeURIComponent(id)}/edit` : '/templates'
    }
    case 'review_groups':
      return '/review-groups'
    case 'employee_dashboard':
      return '/my'
    case 'employee_details': {
      const personId = state.selectedPersonId ?? state.activePersonId
      const tab = state.employeeDetailsTab
      if (personId === state.activePersonId) {
        const slug = TAB_TO_SLUG[tab] ?? 'personal'
        return `/my/${slug}`
      }
      const tabParam = encodeURIComponent(tab)
      return `/employees/${encodeURIComponent(personId)}?tab=${tabParam}`
    }
    case 'self_eval': {
      const id = state.selectedReviewId
      return id ? `/my/self-eval/${encodeURIComponent(id)}` : '/my/performance'
    }
    case 'acknowledgement': {
      const id = state.selectedReviewId
      return id ? `/my/acknowledge/${encodeURIComponent(id)}` : '/my/performance'
    }
    case 'review_details': {
      const id = state.selectedReviewId
      if (!id) return '/my/performance'
      const review = state.reviews.find((r) => r.id === id)
      const personId = state.selectedPersonId ?? review?.employeeId ?? state.activePersonId
      if (personId === state.activePersonId) {
        return `/my/reviews/${encodeURIComponent(id)}`
      }
      if (personId) {
        return `/employees/${encodeURIComponent(personId)}/reviews/${encodeURIComponent(id)}`
      }
      return `/my/reviews/${encodeURIComponent(id)}`
    }
    case 'manager_dashboard':
      return '/team'
    case 'manager_review': {
      const id = state.selectedReviewId
      return id ? `/team/reviews/${encodeURIComponent(id)}` : '/team'
    }
    default:
      return '/'
  }
}

export function parsePerformancePath(pathname: string, search: string): PerformanceRouteState | null {
  const segments = splitPath(pathname)
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  if (segments.length === 0) {
    return { view: 'hr_dashboard' }
  }

  const [root, ...rest] = segments

  if (root === 'cycles') {
    if (rest.length === 1) {
      return { view: 'cycle_details', cycleId: decodeURIComponent(rest[0]) }
    }
    return null
  }

  if (root === 'launch-cycle') {
    return { view: 'launch_cycle_wizard' }
  }

  if (root === 'templates') {
    if (rest.length === 0) return { view: 'templates' }
    if (rest.length === 2 && rest[1] === 'edit') {
      return {
        view: 'template_editor',
        templateId: decodeURIComponent(rest[0]),
      }
    }
    return null
  }

  if (root === 'review-groups') {
    return { view: 'review_groups' }
  }

  if (root === 'my') {
    if (rest.length === 0) {
      return { view: 'employee_dashboard' }
    }
    if (rest[0] === 'self-eval' && rest[1]) {
      return {
        view: 'self_eval',
        reviewId: decodeURIComponent(rest[1]),
      }
    }
    if (rest[0] === 'acknowledge' && rest[1]) {
      return {
        view: 'acknowledgement',
        reviewId: decodeURIComponent(rest[1]),
      }
    }
    if (rest[0] === 'reviews' && rest[1]) {
      return {
        view: 'review_details',
        reviewId: decodeURIComponent(rest[1]),
      }
    }
    const tab = SLUG_TO_TAB[rest[0]] ?? 'personal'
    return {
      view: 'employee_details',
      tab,
    }
  }

  if (root === 'team') {
    if (rest.length === 0) return { view: 'manager_dashboard' }
    if (rest[0] === 'reviews' && rest[1]) {
      return {
        view: 'manager_review',
        reviewId: decodeURIComponent(rest[1]),
      }
    }
    return null
  }

  if (root === 'employees' && rest[0]) {
    const personId = decodeURIComponent(rest[0])
    if (rest[1] === 'reviews' && rest[2]) {
      return {
        view: 'review_details',
        personId,
        reviewId: decodeURIComponent(rest[2]),
      }
    }
    const tab = parseEmployeeTabParam(params.get('tab'))
    return {
      view: 'employee_details',
      personId,
      tab,
    }
  }

  return null
}

export function routeMatchesAppState(route: PerformanceRouteState, state: AppState): boolean {
  if (route.view !== state.view) return false

  switch (route.view) {
    case 'cycle_details':
      return (route.cycleId ?? null) === state.selectedCycleId
    case 'template_editor': {
      const templateId = state.editingTemplateId ?? state.selectedTemplateId
      return (route.templateId ?? null) === templateId
    }
    case 'employee_details': {
      const personId = state.selectedPersonId ?? state.activePersonId
      const expectedPerson = route.personId ?? state.activePersonId
      return personId === expectedPerson && (route.tab ?? 'personal') === state.employeeDetailsTab
    }
    case 'self_eval':
    case 'acknowledgement':
    case 'manager_review':
    case 'review_details':
      return (route.reviewId ?? null) === state.selectedReviewId
    default:
      return true
  }
}

export function appStatePatchFromRoute(
  route: PerformanceRouteState,
  state: AppState,
): Partial<AppState> {
  const personIdForMy =
    route.view === 'employee_details' && !route.personId ? state.activePersonId : route.personId

  const review =
    route.reviewId != null ? state.reviews.find((r) => r.id === route.reviewId) : undefined

  const selectedPersonId =
    route.personId ??
    (route.view === 'employee_details' ? state.activePersonId : null) ??
    review?.employeeId ??
    state.selectedPersonId

  const reviewViews = new Set<ViewId>([
    'self_eval',
    'acknowledgement',
    'manager_review',
    'review_details',
  ])

  const base: Partial<AppState> = {
    view: route.view,
    selectedCycleId: route.view === 'cycle_details' ? (route.cycleId ?? null) : null,
    selectedReviewId:
      route.reviewId != null
        ? route.reviewId
        : reviewViews.has(route.view)
          ? state.selectedReviewId
          : null,
    selectedPersonId:
      route.view === 'employee_details'
        ? (route.personId ?? state.activePersonId)
        : route.view === 'review_details' ||
            route.view === 'self_eval' ||
            route.view === 'acknowledgement'
          ? (review?.employeeId ?? selectedPersonId ?? state.activePersonId)
          : route.view === 'manager_review'
            ? (review?.employeeId ?? state.selectedPersonId)
            : state.selectedPersonId,
    employeeDetailsTab:
      route.view === 'employee_details'
        ? (route.tab ?? 'personal')
        : state.employeeDetailsTab,
  }

  if (route.view === 'template_editor' && route.templateId) {
    base.selectedTemplateId = route.templateId
    base.editingTemplateId = route.templateId
  }

  if (route.view === 'self_eval' || route.view === 'acknowledgement' || route.view === 'review_details') {
    if (review) {
      base.selectedPersonId = review.employeeId
      if (route.view === 'review_details' && personIdForMy === state.activePersonId) {
        base.employeeDetailsTab = 'performance'
      }
    }
  }

  if (route.view === 'manager_review' && review) {
    base.selectedPersonId = review.employeeId
  }

  if (route.view === 'manager_dashboard') {
    base.selectedCycleId = null
    base.selectedReviewId = null
  }

  return base
}
