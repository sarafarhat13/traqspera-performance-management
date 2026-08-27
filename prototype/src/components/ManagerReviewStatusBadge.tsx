import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { ReviewStatus } from '../types'
import {
  MANAGER_DASHBOARD_STATUS_LABELS,
  managerDashboardStatusBadgeColor,
  statusBadgeCustomClass,
} from '../utils/status'

export function ManagerReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const color = managerDashboardStatusBadgeColor(status)

  return (
    <ModusWcBadge
      variant="outlined"
      color={color}
      size="sm"
      customClass={statusBadgeCustomClass(color)}
    >
      {MANAGER_DASHBOARD_STATUS_LABELS[status]}
    </ModusWcBadge>
  )
}
