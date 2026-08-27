import type { CycleStatus, ReviewStatus } from '../types'

export const CYCLE_STATUS_LABELS: Record<CycleStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  completed: 'Completed',
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

export const STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: 'Not started',
  self_eval_pending: 'Self-evaluation pending',
  manager_pending: 'Manager review pending',
  acknowledgement_pending: 'Acknowledgement pending',
  completed: 'Completed',
}

export const MANAGER_DASHBOARD_STATUS_LABELS: Record<ReviewStatus, string> = {
  not_started: 'Not started',
  self_eval_pending: 'Self-evaluation pending',
  manager_pending: 'Your Review Due',
  acknowledgement_pending: 'Awaiting Acknowledgement',
  completed: 'Completed',
}

export function managerDashboardStatusBadgeColor(
  status: ReviewStatus,
): 'primary' | 'warning' | 'success' | 'danger' | 'secondary' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'manager_pending':
      return 'danger'
    case 'acknowledgement_pending':
    case 'self_eval_pending':
      return 'warning'
    case 'not_started':
      return 'secondary'
    default:
      return 'secondary'
  }
}

export function statusBadgeColor(status: ReviewStatus): 'primary' | 'warning' | 'success' | 'danger' | 'secondary' {
  switch (status) {
    case 'completed':
      return 'success'
    case 'not_started':
      return 'danger'
    case 'self_eval_pending':
    case 'acknowledgement_pending':
      return 'warning'
    case 'manager_pending':
      return 'primary'
    default:
      return 'secondary'
  }
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
