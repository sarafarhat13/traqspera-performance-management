import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle, ReviewStatus } from '../types'
import {
  REVIEW_DISPLAY_STATUS_LABELS,
  reviewDisplayStatusBadgeColor,
  reviewDisplayStatusFromReviewStatus,
  statusBadgeCustomClass,
} from '../utils/status'
import { getReviewDisplayStatus } from '../utils/workflow'

type StatusBadgeProps = {
  status: ReviewStatus
  cycle?: ReviewCycle
  review?: PerformanceReview
}

export function StatusBadge({ status, cycle, review }: StatusBadgeProps) {
  const displayStatus =
    cycle && review ? getReviewDisplayStatus(cycle, review) : reviewDisplayStatusFromReviewStatus(status)
  const color = reviewDisplayStatusBadgeColor(displayStatus)

  return (
    <ModusWcBadge
      variant="outlined"
      color={color}
      size="sm"
      customClass={statusBadgeCustomClass(color)}
    >
      {REVIEW_DISPLAY_STATUS_LABELS[displayStatus]}
    </ModusWcBadge>
  )
}
