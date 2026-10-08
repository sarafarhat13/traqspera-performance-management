import type { CycleStatus, ReviewCycle, ReviewStatus } from '../types'

/** Unified review status shown on employee/manager dashboards and review lists. */
export type ReviewDisplayStatus =
  | 'not_started'
  | 'draft'
  | 'pending'
  | 'overdue'
  | 'employee_acknowledgement'
  | 'complete'

export const REVIEW_DISPLAY_STATUS_LABELS: Record<ReviewDisplayStatus, string> = {
  not_started: 'Not started',
  draft: 'Draft',
  pending: 'Pending',
  overdue: 'Overdue',
  employee_acknowledgement: 'Employee Acknowledgement',
  complete: 'Complete',
}

/** Reviews are visible to employees and managers only after the cycle is launched. */
export function isLaunchedReviewCycle(cycle: ReviewCycle | undefined): boolean {
  return cycle != null && cycle.status !== 'draft'
}

/** Fallback when cycle context is unavailable (overdue cannot be detected). */
export function reviewDisplayStatusFromReviewStatus(status: ReviewStatus): ReviewDisplayStatus {
  switch (status) {
    case 'not_started':
      return 'not_started'
    case 'completed':
      return 'complete'
    case 'acknowledgement_pending':
      return 'employee_acknowledgement'
    default:
      return 'pending'
  }
}

export function reviewDisplayStatusBadgeColor(
  status: ReviewDisplayStatus,
): 'primary' | 'warning' | 'success' | 'danger' | 'secondary' | 'tertiary' {
  switch (status) {
    case 'complete':
      return 'success'
    case 'not_started':
    case 'overdue':
      return 'danger'
    case 'pending':
    case 'employee_acknowledgement':
      return 'warning'
    case 'draft':
      return 'tertiary'
    default:
      return 'secondary'
  }
}

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Complete',
}

export function cycleStatusBadgeColor(
  status: CycleStatus,
): 'primary' | 'warning' | 'success' | 'tertiary' | 'secondary' {
  switch (status) {
    case 'active':
      return 'primary'
    case 'completed':
      return 'success'
    case 'draft':
      return 'tertiary'
    default:
      return 'secondary'
  }
}

/** @deprecated Prefer `REVIEW_DISPLAY_STATUS_LABELS` via `getReviewDisplayStatus`. */
export const STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: REVIEW_DISPLAY_STATUS_LABELS.not_started,
  self_eval_pending: REVIEW_DISPLAY_STATUS_LABELS.pending,
  manager_pending: REVIEW_DISPLAY_STATUS_LABELS.pending,
  parallel_review_pending: REVIEW_DISPLAY_STATUS_LABELS.pending,
  acknowledgement_pending: REVIEW_DISPLAY_STATUS_LABELS.employee_acknowledgement,
  completed: REVIEW_DISPLAY_STATUS_LABELS.complete,
}

/** @deprecated Prefer `REVIEW_DISPLAY_STATUS_LABELS` via `getReviewDisplayStatus`. */
export const MANAGER_DASHBOARD_STATUS_LABELS: Record<ReviewStatus, string> = STATUS_LABELS

export function managerDashboardStatusBadgeColor(
  status: ReviewStatus,
): 'primary' | 'warning' | 'success' | 'danger' | 'secondary' {
  return reviewDisplayStatusBadgeColor(reviewDisplayStatusFromReviewStatus(status))
}

export function statusBadgeColor(status: ReviewStatus): 'primary' | 'warning' | 'success' | 'danger' | 'secondary' {
  return reviewDisplayStatusBadgeColor(reviewDisplayStatusFromReviewStatus(status))
}

export type StatusBadgeSemanticColor =
  | 'primary'
  | 'warning'
  | 'success'
  | 'danger'
  | 'secondary'
  | 'tertiary'

export function statusBadgeCustomClass(color: StatusBadgeSemanticColor): string {
  return `tq-status-badge tq-status-badge--${color}`
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatLongDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function formatReviewPeriod(startDate: string, endDate: string): string {
  return `${formatDate(startDate)} – ${formatDate(endDate)}`
}

export function isReviewDateRangeValid(startDate: string, endDate: string): boolean {
  if (!startDate || !endDate) return false
  const start = new Date(startDate)
  const end = new Date(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false
  return start <= end
}
