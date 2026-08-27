import { ModusWcIcon, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle } from '../types'
import { formatCurrentStageDue, isReviewActionRequired } from '../utils/workflow'

type CurrentStageDueLineProps = {
  cycle: ReviewCycle
  review: PerformanceReview
  activePersonId?: string
  size?: 'sm' | 'xs'
  iconSize?: 'xs' | 'sm'
}

/** Current workflow stage due date, with a warning icon when the viewer must act. */
export function CurrentStageDueLine({
  cycle,
  review,
  activePersonId,
  size = 'sm',
  iconSize = 'xs',
}: CurrentStageDueLineProps) {
  const stageDue = formatCurrentStageDue(cycle, review)
  if (!stageDue) return null

  const actionRequired = isReviewActionRequired(review, { personId: activePersonId })
  const toneClass = actionRequired
    ? 'text-[var(--modus-wc-color-warning)]'
    : 'text-[var(--modus-wc-color-base-content-low-contrast)]'

  return (
    <div className="flex min-w-0 items-start gap-1.5">
      {actionRequired && (
        <ModusWcIcon
          name="warning"
          size={iconSize}
          decorative={false}
          aria-label="Action required"
          customClass={`shrink-0 ${toneClass}`}
        />
      )}
      <ModusWcTypography
        hierarchy="p"
        size={size}
        weight={actionRequired ? 'semibold' : undefined}
        customClass={`min-w-0 !m-0 ${toneClass}`}
        label={stageDue}
      />
    </div>
  )
}
