import type { PerformanceReview, Person, ReviewCycle } from '../types'

export const DASHBOARD_FILTER_ALL = '__all__'

/** @deprecated Use DASHBOARD_FILTER_ALL */
export const DASHBOARD_DEPARTMENT_ALL = DASHBOARD_FILTER_ALL

export type DashboardStatusFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'draft'

export type DashboardFilters = {
  search: string
  department: string
  costCenter: string
  title: string
  union: string
  status: DashboardStatusFilter
}

export function createDefaultDashboardFilters(): DashboardFilters {
  return {
    search: '',
    department: DASHBOARD_FILTER_ALL,
    costCenter: DASHBOARD_FILTER_ALL,
    title: DASHBOARD_FILTER_ALL,
    union: DASHBOARD_FILTER_ALL,
    status: 'all',
  }
}

export type DashboardReviewCounts = {
  all: number
  pending: number
  completed: number
  overdue: number
  draft: number
}

type ReviewBucket = 'pending' | 'completed' | 'overdue'

type PersonFilterKey = 'department' | 'costCenter' | 'title' | 'union'

function reviewBucket(
  review: PerformanceReview,
  cycle: ReviewCycle,
  now = new Date(),
): ReviewBucket {
  if (review.status === 'completed') return 'completed'
  const due = new Date(cycle.dueDate)
  due.setHours(23, 59, 59, 999)
  if (due < now) return 'overdue'
  return 'pending'
}

function employeeMatchesSearch(employee: Person | undefined, query: string): boolean {
  if (!query) return true
  if (!employee) return false
  const haystack = [
    employee.name,
    employee.department,
    employee.costCenter,
    employee.title,
    employee.union,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

function cycleMatchesSearch(cycle: ReviewCycle, query: string): boolean {
  if (!query) return false
  return cycle.name.toLowerCase().includes(query)
}

export function hasActiveEmployeeFieldFilters(filters: DashboardFilters): boolean {
  return (
    filters.department !== DASHBOARD_FILTER_ALL ||
    filters.costCenter !== DASHBOARD_FILTER_ALL ||
    filters.title !== DASHBOARD_FILTER_ALL ||
    filters.union !== DASHBOARD_FILTER_ALL
  )
}

function employeeMatchesFieldFilters(employee: Person | undefined, filters: DashboardFilters): boolean {
  if (!employee) return !hasActiveEmployeeFieldFilters(filters)

  const fields: PersonFilterKey[] = ['department', 'costCenter', 'title', 'union']
  for (const field of fields) {
    if (filters[field] !== DASHBOARD_FILTER_ALL && employee[field] !== filters[field]) {
      return false
    }
  }
  return true
}

export function draftCycleMatchesListFilters(
  cycle: ReviewCycle,
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
): boolean {
  const query = filters.search.trim().toLowerCase()
  if (query && !cycleMatchesSearch(cycle, query)) return false

  const listFilters: DashboardFilters = { ...filters, status: 'all' }

  if (hasActiveEmployeeFieldFilters(listFilters)) {
    if (cycle.employeeIds.length === 0) return false
    return cycle.employeeIds.some((employeeId) => {
      const employee = people.find((person) => person.id === employeeId)
      return employeeMatchesFieldFilters(employee, listFilters)
    })
  }

  return true
}

export function countDraftCycles(
  cycles: ReviewCycle[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
): number {
  return cycles.filter(
    (cycle) => cycle.status === 'draft' && draftCycleMatchesListFilters(cycle, people, filters),
  ).length
}

export function reviewMatchesDashboardFilters(
  review: PerformanceReview,
  cycle: ReviewCycle,
  employee: Person | undefined,
  filters: DashboardFilters,
  now = new Date(),
): boolean {
  const query = filters.search.trim().toLowerCase()

  if (query) {
    const employeeHit = employeeMatchesSearch(employee, query)
    const cycleHit = cycleMatchesSearch(cycle, query)
    if (!employeeHit && !cycleHit) return false
  }

  if (!employeeMatchesFieldFilters(employee, filters)) {
    return false
  }

  if (filters.status !== 'all' && filters.status !== 'draft' && reviewBucket(review, cycle, now) !== filters.status) {
    return false
  }

  return true
}

export function filterDashboardCycles(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: DashboardFilters,
  now = new Date(),
): ReviewCycle[] {
  const query = filters.search.trim().toLowerCase()

  return cycles.filter((cycle) => {
    if (cycle.status === 'draft') {
      if (filters.status !== 'all' && filters.status !== 'draft') return false
      return draftCycleMatchesListFilters(cycle, people, filters)
    }

    if (filters.status === 'draft') return false

    const cycleReviews = reviews.filter((review) => review.cycleId === cycle.id)

    if (cycleReviews.length === 0) {
      if (!query && !hasActiveEmployeeFieldFilters(filters) && filters.status === 'all') {
        return true
      }
      if (
        query &&
        cycleMatchesSearch(cycle, query) &&
        !hasActiveEmployeeFieldFilters(filters) &&
        filters.status === 'all'
      ) {
        return true
      }
      return false
    }

    return cycleReviews.some((review) => {
      const employee = people.find((person) => person.id === review.employeeId)
      return reviewMatchesDashboardFilters(review, cycle, employee, filters, now)
    })
  })
}

export function computeDashboardReviewCounts(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
  now = new Date(),
): DashboardReviewCounts {
  return computeScopedDashboardReviewCounts(cycles, reviews, people, filters, undefined, now)
}

export function filterReviewsForDashboard(
  reviews: PerformanceReview[],
  cycles: ReviewCycle[],
  people: Person[],
  filters: DashboardFilters,
  options?: { employeeIds?: Set<string> },
  now = new Date(),
): PerformanceReview[] {
  const employeeIds = options?.employeeIds

  return reviews.filter((review) => {
    if (employeeIds && !employeeIds.has(review.employeeId)) return false
    const cycle = cycles.find((item) => item.id === review.cycleId)
    if (!cycle) return false
    const employee = people.find((person) => person.id === review.employeeId)
    return reviewMatchesDashboardFilters(review, cycle, employee, filters, now)
  })
}

export function computeScopedDashboardReviewCounts(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
  options?: { employeeIds?: Set<string> },
  now = new Date(),
): DashboardReviewCounts {
  const employeeIds = options?.employeeIds
  const scopedReviews = employeeIds
    ? reviews.filter((review) => employeeIds.has(review.employeeId))
    : reviews

  const counts: DashboardReviewCounts = {
    all: 0,
    pending: 0,
    completed: 0,
    overdue: 0,
    draft: countDraftCycles(cycles, people, filters),
  }

  for (const cycle of cycles) {
    for (const review of scopedReviews) {
      if (review.cycleId !== cycle.id) continue
      const employee = people.find((person) => person.id === review.employeeId)
      if (
        !reviewMatchesDashboardFilters(review, cycle, employee, { ...filters, status: 'all' }, now)
      ) {
        continue
      }
      const bucket = reviewBucket(review, cycle, now)
      counts.all += 1
      counts[bucket] += 1
    }
  }

  return counts
}

export function countActiveDashboardFilters(filters: DashboardFilters): number {
  let count = 0
  if (filters.search.trim()) count += 1
  if (filters.department !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.costCenter !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.title !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.union !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.status !== 'all') count += 1
  return count
}

export function countActivePanelFilters(filters: DashboardFilters): number {
  let count = 0
  if (filters.department !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.costCenter !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.title !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.union !== DASHBOARD_FILTER_ALL) count += 1
  return count
}

function distinctOptionsFromPeople(
  people: Person[],
  field: PersonFilterKey,
): { label: string; value: string }[] {
  const values = [...new Set(people.map((person) => person[field]))].sort()
  return [
    { label: 'All', value: DASHBOARD_FILTER_ALL },
    ...values.map((value) => ({ label: value, value })),
  ]
}

export function departmentOptionsFromPeople(people: Person[]): { label: string; value: string }[] {
  return distinctOptionsFromPeople(people, 'department')
}

export function costCenterOptionsFromPeople(people: Person[]): { label: string; value: string }[] {
  return distinctOptionsFromPeople(people, 'costCenter')
}

export function titleOptionsFromPeople(people: Person[]): { label: string; value: string }[] {
  return distinctOptionsFromPeople(people, 'title')
}

export function unionOptionsFromPeople(people: Person[]): { label: string; value: string }[] {
  return distinctOptionsFromPeople(people, 'union')
}
