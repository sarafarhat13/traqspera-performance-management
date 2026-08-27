import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcProgress,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ReviewCycle } from '../types'
import { computeCycleStats } from '../utils/cycleStats'
import { formatReviewPeriod } from '../utils/status'
import { CycleStatusBadge } from './CycleStatusBadge'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import type { PerformanceReview } from '../types'

interface ReviewCycleCardProps {
  cycle: ReviewCycle
  reviews: PerformanceReview[]
  templateDescription?: string
  onViewDetails: () => void
}

function StatusMetric({
  icon,
  label,
  toneClass,
}: {
  icon: string
  label: string
  toneClass: string
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${toneClass}`}>
      <ModusWcIcon name={icon} size="sm" decorative />
      {label}
    </span>
  )
}

export function ReviewCycleCard({
  cycle,
  reviews,
  templateDescription,
  onViewDetails,
}: ReviewCycleCardProps) {
  const stats = computeCycleStats(cycle, reviews)
  const description =
    cycle.description?.trim() ||
    templateDescription?.trim() ||
    'Performance review cycle'
  const createdBy = cycle.createdBy ?? 'HR Admin'
  const employeeLabel =
    stats.totalEmployees === 1 ? '1 employee' : `${stats.totalEmployees} employees`

  return (
    <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ModusWcTypography
                hierarchy="h4"
                size="md"
                weight="semibold"
                label={cycle.name}
              />
              <CycleStatusBadge status={cycle.status} />
            </div>
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="!mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={description}
            />
          </div>
          <div className="shrink-0">
            <ModusWcButton
              variant="borderless"
              color="tertiary"
              size="sm"
              onButtonClick={onViewDetails}
            >
              <ModusWcIcon name="visibility" size="xs" decorative />
              View details
            </ModusWcButton>
          </div>
        </div>

        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={`Created by: ${createdBy} • ${formatReviewPeriod(cycle.startDate, cycle.dueDate)} • ${employeeLabel}`}
        />

        <div className="flex flex-wrap items-center gap-4">
          <StatusMetric
            icon="check_circle"
            label={`${stats.completed} Completed`}
            toneClass="text-[var(--modus-wc-color-success,#0d7a5c)]"
          />
          <StatusMetric
            icon="calendar"
            label={`${stats.pending} Pending`}
            toneClass="text-[var(--modus-wc-color-warning,#b45309)]"
          />
          <StatusMetric
            icon="error"
            label={`${stats.overdue} Overdue`}
            toneClass="text-[var(--modus-wc-color-danger,#c81922)]"
          />
        </div>

        <div className="flex flex-col gap-1">
          <ModusWcProgress
            value={stats.percentComplete}
            max={100}
            aria-label={`${cycle.name} completion progress`}
            customClass="w-full"
          />
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`${stats.percentComplete}% complete`}
          />
        </div>
      </div>
    </ModusWcCard>
  )
}
