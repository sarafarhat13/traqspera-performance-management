import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { ReviewStatus } from '../types'
import { STATUS_LABELS, statusBadgeColor, statusBadgeCustomClass } from '../utils/status'

export function StatusBadge({ status }: { status: ReviewStatus }) {
  const color = statusBadgeColor(status)

  return (
    <ModusWcBadge
      variant="outlined"
      color={color}
      size="sm"
      customClass={statusBadgeCustomClass(color)}
    >
      {STATUS_LABELS[status]}
    </ModusWcBadge>
  )
}
