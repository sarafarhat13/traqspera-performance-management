import { useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcProgress,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ReviewCycle } from '../types'
import { canCompleteReviewCycle } from '../utils/cycleFinalApproval'
import { computeCycleStats } from '../utils/cycleStats'
import { formatReviewPeriod } from '../utils/status'
import {
  getCycleDisplayEndDate,
  getCycleDisplayStartDate,
} from '../utils/cycleDisplay'
import { CycleStatusBadge } from './CycleStatusBadge'
import { ReviewCycleCompleteModal } from './ReviewCycleCompleteModal'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import type { PerformanceReview } from '../types'

interface ReviewCycleCardProps {
  cycle: ReviewCycle
  reviews: PerformanceReview[]
  templateDescription?: string
  onViewDetails: () => void
  /** Shown instead of View details while the cycle is a draft. */
  onEditDraft?: () => void
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
  onEditDraft,
}: ReviewCycleCardProps) {
  const isEditableDraft = cycle.status === 'draft' && Boolean(onEditDraft)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const stats = computeCycleStats(cycle, reviews)
  const canCompleteCycle =
    cycle.status === 'active' && canCompleteReviewCycle(cycle, reviews)
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
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {isEditableDraft ? (
              <ModusWcButton
                key="edit-draft"
                variant="borderless"
                color="tertiary"
                size="sm"
                onButtonClick={onEditDraft}
              >
                <ModusWcIcon name="pencil" size="xs" decorative />
                Edit review
              </ModusWcButton>
            ) : (
              <ModusWcButton
                key="view-details"
                variant="borderless"
                color="tertiary"
                size="sm"
                onButtonClick={onViewDetails}
              >
                <ModusWcIcon name="visibility" size="xs" decorative />
                View details
              </ModusWcButton>
            )}
            {canCompleteCycle ? (
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                onButtonClick={() => setCompleteModalOpen(true)}
              >
                <ModusWcIcon name="check_circle" size="xs" decorative />
                Complete cycle
              </ModusWcButton>
            ) : null}
          </div>
        </div>

        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={`Created by: ${createdBy} • ${formatReviewPeriod(getCycleDisplayStartDate(cycle), getCycleDisplayEndDate(cycle))} • ${employeeLabel}`}
        />

        <div className="flex flex-wrap items-center gap-4">
          <StatusMetric
            icon="warning"
            label={`${stats.overdue} Overdue`}
            toneClass="text-[var(--modus-wc-color-danger,#b42318)]"
          />
          <StatusMetric
            icon="calendar"
            label={`${stats.pending} Pending`}
            toneClass="text-[var(--modus-wc-color-warning,#b45309)]"
          />
          <StatusMetric
            icon="check_circle"
            label={`${stats.completed} Complete`}
            toneClass="text-[var(--modus-wc-color-success,#0d7a5c)]"
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
      {canCompleteCycle ? (
        <ReviewCycleCompleteModal
          cycle={cycle}
          isOpen={completeModalOpen}
          onClose={() => setCompleteModalOpen(false)}
        />
      ) : null}
    </ModusWcCard>
  )
}
