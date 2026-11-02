import type { PerformanceReview, Person, ReviewCycle } from '../types'
import { getCycleDisplayEndDate } from './cycleDisplay'
import { normalizeRatingScale } from './ratingScale'
import {
  cycleIncludesRatingScale,
  getCurrentStageDeadline,
  getEmployeeReviewParticipantProgress,
  getEnabledWorkflowSteps,
  getManagerReviewParticipantProgress,
  getReviewDisplayStatus,
  getReviewWorkflowStage,
  needsEmployeeSelfEval,
  needsManagerReview,
  readManagerOverallRatingValue,
  workflowFromLegacy,
} from './workflow'

export const DASHBOARD_FILTER_ALL = '__all__'

/** Cycle detail — employees with no submitted overall rating yet. */
export const DASHBOARD_RATING_UNRATED = '__unrated__'

/** @deprecated Use DASHBOARD_FILTER_ALL */
export const DASHBOARD_DEPARTMENT_ALL = DASHBOARD_FILTER_ALL

export type DashboardPackageStatusFilter = 'all' | 'draft' | 'active' | 'completed'

export type DashboardReviewStatusFilter = 'all' | 'pending' | 'completed' | 'overdue' | 'draft'

/** Who still needs to act on a manager's team review. Shown on the summary cards and row badges. */
export type ManagerTeamQueue = 'with_employee' | 'manager_action' | 'acknowledgement' | 'complete'

/** Manager list chips: All, Pending, Overdue, Complete. */
export type ManagerTeamListStatus = 'pending' | 'overdue' | 'complete'

export type ManagerTeamListStatusFilter = 'all' | ManagerTeamListStatus

export type DashboardStatusFilter =
  | DashboardPackageStatusFilter
  | DashboardReviewStatusFilter
  | ManagerTeamQueue

export type DashboardFilters = {
  search: string
  department: string
  costCenter: string
  title: string
  union: string
  reviewerId: string
  rating: string
  status: DashboardStatusFilter
}

export function createDefaultDashboardFilters(): DashboardFilters {
  return {
    search: '',
    department: DASHBOARD_FILTER_ALL,
    costCenter: DASHBOARD_FILTER_ALL,
    title: DASHBOARD_FILTER_ALL,
    union: DASHBOARD_FILTER_ALL,
    reviewerId: DASHBOARD_FILTER_ALL,
    rating: DASHBOARD_FILTER_ALL,
    status: 'all',
  }
}

export type DashboardPackageCounts = {
  all: number
  draft: number
  active: number
  completed: number
}

export type DashboardReviewCounts = {
  all: number
  pending: number
  completed: number
  overdue: number
  draft: number
}

export type DashboardManagerTeamCounts = Record<ManagerTeamListStatusFilter, number>

export const MANAGER_TEAM_QUEUE_LABELS: Record<ManagerTeamQueue, string> = {
  with_employee: 'With employee',
  manager_action: 'Your review',
  acknowledgement: 'Acknowledgement',
  complete: 'Complete',
}

export function isManagerTeamListStatusFilter(
  status: DashboardStatusFilter,
): status is ManagerTeamListStatusFilter {
  return status === 'all' || status === 'pending' || status === 'overdue' || status === 'complete'
}

type ReviewBucket = 'pending' | 'completed' | 'overdue' | 'draft'

export type DashboardReviewFilterOptions = {
  employeeIds?: Set<string>
  /** Manager team list: chips are Pending, Overdue, and Complete. */
  managerTeamReviewStatus?: boolean
  getPerson?: (id: string) => Person | undefined
}

type PersonFilterKey = 'department' | 'costCenter' | 'title' | 'union'

function isCyclePastDue(cycle: ReviewCycle, now: Date): boolean {
  const due = new Date(getCycleDisplayEndDate(cycle))
  due.setHours(23, 59, 59, 999)
  return due < now
}

function queueFromFirstEnabledStep(cycle: ReviewCycle): ManagerTeamQueue {
  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  const first = getEnabledWorkflowSteps(workflow)[0]
  if (!first) return 'with_employee'
  switch (first.type) {
    case 'manager':
    case 'rating_scale':
      return 'manager_action'
    case 'acknowledgement':
      return 'acknowledgement'
    default:
      return 'with_employee'
  }
}

function queueFromWorkflowStage(cycle: ReviewCycle, review: PerformanceReview): ManagerTeamQueue {
  switch (getReviewWorkflowStage(cycle, review)) {
    case 'complete':
      return 'complete'
    case 'employee_acknowledgment':
      return 'acknowledgement'
    case 'manager_review':
      return 'manager_action'
    default:
      return 'with_employee'
  }
}

/**
 * Exclusive owner queue for the manager team list.
 * Parallel reviews the manager can still submit count as Your review.
 */
export function managerTeamQueue(review: PerformanceReview, cycle: ReviewCycle): ManagerTeamQueue {
  if (review.status === 'completed') return 'complete'
  if (review.status === 'acknowledgement_pending') return 'acknowledgement'
  if (needsManagerReview(cycle, review)) return 'manager_action'
  if (needsEmployeeSelfEval(cycle, review)) return 'with_employee'
  if (review.status === 'not_started') return queueFromFirstEnabledStep(cycle)
  return queueFromWorkflowStage(cycle, review)
}

export function managerTeamQueueForReview(
  review: PerformanceReview,
  cycle: ReviewCycle | undefined,
): ManagerTeamQueue {
  if (cycle) return managerTeamQueue(review, cycle)
  switch (review.status) {
    case 'completed':
      return 'complete'
    case 'acknowledgement_pending':
      return 'acknowledgement'
    case 'manager_pending':
    case 'parallel_review_pending':
      return 'manager_action'
    default:
      return 'with_employee'
  }
}

function isStageDeadlinePast(deadline: string | undefined, now: Date): boolean {
  if (!deadline) return false
  const due = new Date(deadline)
  if (Number.isNaN(due.getTime())) return false
  due.setHours(23, 59, 59, 999)
  return due < now
}

/** The queue's own step is past its deadline. Complete reviews are never overdue. */
export function isManagerTeamStageOverdue(
  review: PerformanceReview,
  cycle: ReviewCycle,
  now = new Date(),
): boolean {
  const queue = managerTeamQueue(review, cycle)
  if (queue === 'complete') return false
  if (queue === 'with_employee') {
    return getEmployeeReviewParticipantProgress(cycle, review, now) === 'overdue'
  }
  if (queue === 'manager_action') {
    return getManagerReviewParticipantProgress(cycle, review, now) === 'overdue'
  }
  return isStageDeadlinePast(getCurrentStageDeadline(cycle, review), now)
}

/** Chip bucket for the manager list. Overdue stays inside the owner cards. */
export function managerTeamListStatus(
  review: PerformanceReview,
  cycle: ReviewCycle,
  now = new Date(),
): ManagerTeamListStatus {
  if (managerTeamQueue(review, cycle) === 'complete') return 'complete'
  if (isManagerTeamStageOverdue(review, cycle, now)) return 'overdue'
  return 'pending'
}

export const MANAGER_TEAM_LIST_STATUS_LABELS: Record<ManagerTeamListStatus, string> = {
  pending: 'Pending',
  overdue: 'Overdue',
  complete: 'Complete',
}

export function managerTeamListStatusBadgeColor(
  status: ManagerTeamListStatus,
): 'warning' | 'danger' | 'success' {
  if (status === 'overdue') return 'danger'
  if (status === 'complete') return 'success'
  return 'warning'
}

function reviewBucket(
  review: PerformanceReview,
  cycle: ReviewCycle,
  now = new Date(),
): ReviewBucket {
  const display = getReviewDisplayStatus(cycle, review, now)
  if (display === 'complete') return 'completed'
  if (display === 'overdue') return 'overdue'
  if (display === 'draft') return 'draft'
  return 'pending'
}

function statusBucketForReview(
  review: PerformanceReview,
  cycle: ReviewCycle,
  now: Date,
): ReviewBucket {
  return reviewBucket(review, cycle, now)
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

export function hasActiveReviewerFilter(
  filters: Pick<DashboardFilters, 'reviewerId'>,
): boolean {
  return filters.reviewerId !== DASHBOARD_FILTER_ALL
}

/** Employee field filters plus reviewer — used when narrowing cycles/reviews (not search-only). */
export function hasActiveReviewScopedFilters(
  filters: Pick<DashboardFilters, 'department' | 'costCenter' | 'title' | 'union' | 'reviewerId'>,
): boolean {
  return (
    hasActiveEmployeeFieldFilters(filters as DashboardFilters) || hasActiveReviewerFilter(filters)
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
  options?: DashboardReviewFilterOptions,
): boolean {
  const query = filters.search.trim().toLowerCase()

  if (query) {
    const employeeHit = employeeMatchesSearch(employee, query)
    const cycleHit = cycleMatchesSearch(cycle, query)
    const reviewer = options?.getPerson?.(review.managerId)
    const reviewerHit = employeeMatchesSearch(reviewer, query)
    if (!employeeHit && !cycleHit && !reviewerHit) return false
  }

  if (!employeeMatchesFieldFilters(employee, filters)) {
    return false
  }

  if (
    filters.reviewerId !== DASHBOARD_FILTER_ALL &&
    review.managerId !== filters.reviewerId
  ) {
    return false
  }

  if (filters.rating !== DASHBOARD_FILTER_ALL) {
    const submittedRating = readManagerOverallRatingValue(cycle, review)
    if (filters.rating === DASHBOARD_RATING_UNRATED) {
      if (submittedRating !== null) return false
    } else {
      const filterRating = Number(filters.rating)
      if (!Number.isFinite(filterRating) || submittedRating !== filterRating) {
        return false
      }
    }
  }

  if (options?.managerTeamReviewStatus) {
    if (filters.status === 'all') return true
    if (filters.status !== 'pending' && filters.status !== 'overdue' && filters.status !== 'complete') {
      return false
    }
    return managerTeamListStatus(review, cycle, now) === filters.status
  }

  const reviewStatusFilters: DashboardReviewStatusFilter[] = [
    'pending',
    'completed',
    'overdue',
    'draft',
  ]
  if (
    reviewStatusFilters.includes(filters.status as DashboardReviewStatusFilter) &&
    statusBucketForReview(review, cycle, now) !== filters.status
  ) {
    return false
  }

  return true
}

function cycleMatchesListFilters(
  cycle: ReviewCycle,
  reviews: PerformanceReview[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
): boolean {
  const listFilters: DashboardFilters = { ...filters, status: 'all' }

  if (cycle.status === 'draft') {
    const draftReviews = reviews.filter((review) => review.cycleId === cycle.id)
    if (draftReviews.length === 0) {
      if (hasActiveReviewerFilter(filters)) return false
      return draftCycleMatchesListFilters(cycle, people, filters)
    }
  }

  const query = filters.search.trim().toLowerCase()
  if (!query && !hasActiveReviewScopedFilters(listFilters)) {
    return true
  }

  if (query && cycleMatchesSearch(cycle, query) && !hasActiveReviewScopedFilters(listFilters)) {
    return true
  }

  const cycleReviews = reviews.filter((review) => review.cycleId === cycle.id)
  const getPerson = (id: string) => people.find((person) => person.id === id)
  return cycleReviews.some((review) => {
    const employee = people.find((person) => person.id === review.employeeId)
    return reviewMatchesDashboardFilters(
      review,
      cycle,
      employee,
      { ...filters, status: 'all' },
      undefined,
      { getPerson },
    )
  })
}

export function filterDashboardCycles(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: DashboardFilters,
): ReviewCycle[] {
  const packageStatuses: DashboardPackageStatusFilter[] = ['draft', 'active', 'completed']

  return cycles.filter((cycle) => {
    if (
      packageStatuses.includes(filters.status as DashboardPackageStatusFilter) &&
      filters.status !== 'all' &&
      cycle.status !== filters.status
    ) {
      return false
    }

    return cycleMatchesListFilters(cycle, reviews, people, filters)
  })
}

export function computeDashboardPackageCounts(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
): DashboardPackageCounts {
  const listFiltered = filterDashboardCycles(cycles, reviews, people, { ...filters, status: 'all' })

  return {
    all: listFiltered.length,
    draft: listFiltered.filter((cycle) => cycle.status === 'draft').length,
    active: listFiltered.filter((cycle) => cycle.status === 'active').length,
    completed: listFiltered.filter((cycle) => cycle.status === 'completed').length,
  }
}

/** @deprecated Use computeDashboardPackageCounts for HR cycle dashboards. */
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
  options?: DashboardReviewFilterOptions,
  now = new Date(),
): PerformanceReview[] {
  const employeeIds = options?.employeeIds

  return reviews.filter((review) => {
    if (employeeIds && !employeeIds.has(review.employeeId)) return false
    const cycle = cycles.find((item) => item.id === review.cycleId)
    if (!cycle) return false
    const employee = people.find((person) => person.id === review.employeeId)
    const getPerson = (id: string) => people.find((person) => person.id === id)
    return reviewMatchesDashboardFilters(review, cycle, employee, filters, now, {
      ...options,
      getPerson,
    })
  })
}

export function computeScopedDashboardReviewCounts(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
  options?: DashboardReviewFilterOptions,
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
    draft: 0,
  }

  for (const review of scopedReviews) {
    const cycle = cycles.find((item) => item.id === review.cycleId)
    if (!cycle) continue
    const employee = people.find((person) => person.id === review.employeeId)
    const getPerson = (id: string) => people.find((person) => person.id === id)
    if (
      !reviewMatchesDashboardFilters(
        review,
        cycle,
        employee,
        { ...filters, status: 'all' },
        now,
        { ...options, getPerson },
      )
    ) {
      continue
    }

    counts.all += 1
    const bucket = statusBucketForReview(review, cycle, now)
    counts[bucket] += 1
  }

  if (counts.draft === 0) {
    counts.draft = countDraftCycles(cycles, people, filters)
  }

  return counts
}

export function computeManagerTeamStatusCounts(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
  filters: Omit<DashboardFilters, 'status'>,
  options?: DashboardReviewFilterOptions,
  now = new Date(),
): DashboardManagerTeamCounts {
  const employeeIds = options?.employeeIds
  const scopedReviews = employeeIds
    ? reviews.filter((review) => employeeIds.has(review.employeeId))
    : reviews

  const counts: DashboardManagerTeamCounts = {
    all: 0,
    pending: 0,
    overdue: 0,
    complete: 0,
  }

  for (const review of scopedReviews) {
    const cycle = cycles.find((item) => item.id === review.cycleId)
    if (!cycle) continue
    const employee = people.find((person) => person.id === review.employeeId)
    const getPerson = (id: string) => people.find((person) => person.id === id)
    if (
      !reviewMatchesDashboardFilters(
        review,
        cycle,
        employee,
        { ...filters, status: 'all' },
        now,
        { ...options, getPerson },
      )
    ) {
      continue
    }

    counts.all += 1
    counts[managerTeamListStatus(review, cycle, now)] += 1
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
  if (filters.reviewerId !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.rating !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.status !== 'all') count += 1
  return count
}

export function countActivePanelFilters(filters: DashboardFilters): number {
  let count = 0
  if (filters.department !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.costCenter !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.title !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.union !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.reviewerId !== DASHBOARD_FILTER_ALL) count += 1
  if (filters.rating !== DASHBOARD_FILTER_ALL) count += 1
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

export function ratingOptionsFromCycle(
  cycle: ReviewCycle,
): { label: string; value: string }[] {
  if (!cycleIncludesRatingScale(cycle) || !cycle.ratingScale) {
    return [{ label: 'All ratings', value: DASHBOARD_FILTER_ALL }]
  }

  const scale = normalizeRatingScale(cycle.ratingScale)
  const options: { label: string; value: string }[] = [
    { label: 'All ratings', value: DASHBOARD_FILTER_ALL },
    { label: 'No rating yet', value: DASHBOARD_RATING_UNRATED },
  ]

  for (let index = 0; index < scale.labels.length; index += 1) {
    const rating = scale.min + index
    const label = scale.labels[index]?.trim() || `Level ${rating}`
    options.push({ label: `${rating} — ${label}`, value: String(rating) })
  }

  return options
}

export function reviewerOptionsFromReviews(
  reviews: PerformanceReview[],
  getPerson: (id: string) => Person | undefined,
): { label: string; value: string }[] {
  const managerIds = [...new Set(reviews.map((review) => review.managerId).filter(Boolean))].sort(
    (a, b) => {
      const nameA = getPerson(a)?.name ?? a
      const nameB = getPerson(b)?.name ?? b
      return nameA.localeCompare(nameB)
    },
  )
  return [
    { label: 'All reviewers', value: DASHBOARD_FILTER_ALL },
    ...managerIds.map((id) => ({
      label: getPerson(id)?.name ?? 'Unknown reviewer',
      value: id,
    })),
  ]
}

/** Short summary of distinct reviewers assigned in a cycle (for dashboard table rows). */
export function cycleReviewersSummary(
  cycleId: string,
  reviews: PerformanceReview[],
  getPerson: (id: string) => Person | undefined,
): string {
  const names = [
    ...new Set(
      reviews
        .filter((review) => review.cycleId === cycleId)
        .map((review) => getPerson(review.managerId)?.name)
        .filter((name): name is string => Boolean(name)),
    ),
  ].sort((a, b) => a.localeCompare(b))

  if (names.length === 0) return '—'
  if (names.length <= 2) return names.join(', ')
  return `${names.slice(0, 2).join(', ')} (+${names.length - 2} more)`
}
