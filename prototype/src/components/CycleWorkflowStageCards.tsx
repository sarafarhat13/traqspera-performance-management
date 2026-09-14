import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle } from '../types'
import {
  computeCycleWorkflowStageCounts,
  getCycleWorkflowStageCards,
  WORKFLOW_REVIEW_STAGE_LABELS,
  type WorkflowReviewStage,
} from '../utils/workflow'

type CycleWorkflowStageCardsProps = {
  cycle: ReviewCycle
  reviews: PerformanceReview[]
}

const STAGE_CARD_META: Record<
  WorkflowReviewStage,
  { valueTone: 'primary' | 'warning' | 'danger' | 'success'; metricLabel: string }
> = {
  not_started: { valueTone: 'primary', metricLabel: 'employees not started' },
  employee_review: { valueTone: 'warning', metricLabel: 'in employee review' },
  manager_review: { valueTone: 'warning', metricLabel: 'in manager review' },
  employee_acknowledgment: { valueTone: 'success', metricLabel: 'awaiting acknowledgment' },
}

export function CycleWorkflowStageCards({ cycle, reviews }: CycleWorkflowStageCardsProps) {
  const stageCards = getCycleWorkflowStageCards(cycle)
  const counts = computeCycleWorkflowStageCounts(cycle, reviews)

  return (
    <div className="tq-cycle-stage-cards">
      {stageCards.map((stage) => {
        const meta = STAGE_CARD_META[stage]
        const value = counts[stage]

        return (
          <article key={stage} className="tq-dashboard-kpi-card tq-cycle-stage-card">
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              weight="semibold"
              customClass="!m-0 min-w-0"
              label={WORKFLOW_REVIEW_STAGE_LABELS[stage]}
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
                customClass="!m-0 min-w-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={meta.metricLabel}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}
