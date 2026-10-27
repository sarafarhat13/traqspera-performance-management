import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle } from '../types'
import {
  computeCycleWorkflowStageCounts,
  getCycleWorkflowStageCards,
  WORKFLOW_REVIEW_STAGE_LABELS,
  type CycleWorkflowStageCard,
} from '../utils/workflow'

export type CycleWorkflowStageFilter = CycleWorkflowStageCard | 'all'

type CycleWorkflowStageCardsProps = {
  cycle: ReviewCycle
  reviews: PerformanceReview[]
  activeStage?: CycleWorkflowStageFilter
  onStageChange?: (stage: CycleWorkflowStageFilter) => void
}

const STAGE_CARD_META: Record<
  CycleWorkflowStageCard,
  { valueTone: 'primary' | 'warning' | 'danger' | 'success'; metricLabel: string }
> = {
  employee_review: { valueTone: 'warning', metricLabel: 'in employee review' },
  manager_review: { valueTone: 'warning', metricLabel: 'in manager review' },
  employee_acknowledgment: { valueTone: 'success', metricLabel: 'awaiting acknowledgment' },
  complete: { valueTone: 'success', metricLabel: 'reviews completed' },
}

export function CycleWorkflowStageCards({
  cycle,
  reviews,
  activeStage = 'all',
  onStageChange,
}: CycleWorkflowStageCardsProps) {
  const stageCards = getCycleWorkflowStageCards(cycle)
  const counts = computeCycleWorkflowStageCounts(cycle, reviews)
  const interactive = Boolean(onStageChange)

  return (
    <div
      className="tq-cycle-stage-cards"
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? 'Filter employees by workflow stage' : undefined}
    >
      {stageCards.map((stage) => {
        const meta = STAGE_CARD_META[stage]
        const value = counts[stage]
        const selected = interactive && activeStage === stage
        const stageLabel = WORKFLOW_REVIEW_STAGE_LABELS[stage]

        const cardClass = [
          'tq-dashboard-kpi-card',
          'tq-cycle-stage-card',
          interactive ? 'tq-dashboard-kpi-card--interactive' : '',
          selected ? 'tq-cycle-stage-card--active' : '',
        ]
          .filter(Boolean)
          .join(' ')

        const inner = (
          <>
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              weight="semibold"
              customClass="!m-0 min-w-0 text-left"
              label={stageLabel}
            />
            <div className="tq-cycle-stage-card__metric">
              <span
                className={`tq-cycle-stage-card__value tq-dashboard-kpi-card__value--${meta.valueTone}`}
                aria-hidden="true"
              >
                {value}
              </span>
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                customClass="!m-0 min-w-0 text-left text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={meta.metricLabel}
              />
            </div>
          </>
        )

        if (!interactive) {
          return (
            <article key={stage} className={cardClass}>
              {inner}
            </article>
          )
        }

        return (
          <button
            key={stage}
            type="button"
            className={cardClass}
            aria-pressed={selected}
            aria-label={`${stageLabel}, ${value} ${meta.metricLabel}`}
            onClick={() => onStageChange?.(selected ? 'all' : stage)}
          >
            {inner}
          </button>
        )
      })}
    </div>
  )
}
