import {
  ModusWcBadge,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle } from '../types'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { reviewOverallRatingLabel } from '../utils/workflow'

type ReviewOverallRatingProps = {
  cycle: ReviewCycle
  review: PerformanceReview
}

/** Persistent rating strip shown above review detail tabs when a submitted rating exists. */
export function ReviewOverallRatingBanner({ cycle, review }: ReviewOverallRatingProps) {
  const label = reviewOverallRatingLabel(cycle, review)
  if (!label) return null

  return (
    <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
      <div className="flex min-w-0 items-center gap-2">
        <ModusWcIcon name="star" size="sm" decorative customClass="shrink-0 text-[var(--modus-wc-color-primary)]" />
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-2">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            customClass="!m-0"
            label="Overall performance rating"
          />
          <ModusWcTypography hierarchy="p" size="sm" customClass="!m-0" label={label} />
        </div>
      </div>
    </ModusWcCard>
  )
}

export function ReviewOverallRatingHeaderBadge({ cycle, review }: ReviewOverallRatingProps) {
  const label = reviewOverallRatingLabel(cycle, review)
  if (!label) return null

  return (
    <ModusWcBadge size="sm" variant="filled" color="tertiary" customClass="max-w-full">
      Rating: {label}
    </ModusWcBadge>
  )
}

/** Manager column block for side-by-side comparison layouts. */
export function ReviewOverallRatingCompareColumn({ cycle, review }: ReviewOverallRatingProps) {
  const label = reviewOverallRatingLabel(cycle, review)
  if (!label) return null

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <div className="hidden lg:block" aria-hidden="true" />
      <div className="rounded-lg border border-[var(--modus-wc-color-base-200)] p-3">
        <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Overall performance rating" />
        <ModusWcTypography hierarchy="p" size="sm" label={label} />
      </div>
    </div>
  )
}

export function ReviewOverallRatingInline({ cycle, review }: ReviewOverallRatingProps) {
  const label = reviewOverallRatingLabel(cycle, review)
  if (!label) return null

  return (
    <ModusWcTypography
      hierarchy="p"
      size="sm"
      weight="semibold"
      customClass="!m-0"
      label={`Overall rating: ${label}`}
    />
  )
}
