import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle, ReviewStatus } from '../types'
import {
  MANAGER_TEAM_LIST_STATUS_LABELS,
  managerTeamListStatus,
  managerTeamListStatusBadgeColor,
  type ManagerTeamListStatus,
} from '../utils/dashboardFilters'
import { statusBadgeCustomClass } from '../utils/status'

type ManagerReviewStatusBadgeProps = {
  status: ReviewStatus
  cycle?: ReviewCycle
  review?: PerformanceReview
}

export function ManagerReviewStatusBadge({ status, cycle, review }: ManagerReviewStatusBadgeProps) {
  const listStatus: ManagerTeamListStatus =
    cycle && review
      ? managerTeamListStatus(review, cycle)
      : status === 'completed'
        ? 'complete'
        : 'pending'
  const color = managerTeamListStatusBadgeColor(listStatus)

  return (
    <ModusWcBadge
      variant="outlined"
      color={color}
      size="sm"
      customClass={statusBadgeCustomClass(color)}
    >
      {MANAGER_TEAM_LIST_STATUS_LABELS[listStatus]}
    </ModusWcBadge>
  )
}
