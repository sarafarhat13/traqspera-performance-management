import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { ReviewStatus } from '../types'
import { STATUS_LABELS, statusBadgeColor } from '../utils/status'

export function StatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <ModusWcBadge variant="filled" color={statusBadgeColor(status)} size="sm">
      {STATUS_LABELS[status]}
    </ModusWcBadge>
  )
}
