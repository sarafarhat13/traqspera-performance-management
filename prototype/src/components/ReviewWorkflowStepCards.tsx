import {
  ModusWcBadge,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle } from '../types'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { formatDate } from '../utils/status'
import {
  getWorkflowStepCardStatusLabel,
  getWorkflowStepStates,
  workflowStepDisplayLabel,
  workflowStepIcon,
  type WorkflowStepState,
} from '../utils/workflow'

type ReviewWorkflowStepCardsProps = {
  cycle: ReviewCycle
  review: PerformanceReview
  /** Stack step cards vertically (mobile shell / narrow column). */
  stacked?: boolean
}

function stepStateBadgeColor(state: WorkflowStepState): 'success' | 'primary' | 'tertiary' {
  switch (state) {
    case 'complete':
      return 'success'
    case 'current':
      return 'primary'
    case 'pending':
      return 'tertiary'
    default:
      return 'tertiary'
  }
}

function stepCardClass(state: WorkflowStepState): string {
  switch (state) {
    case 'complete':
      return 'tq-review-step-card--complete'
    case 'current':
      return 'tq-review-step-card--current'
    case 'pending':
      return 'tq-review-step-card--pending'
    default:
      return ''
  }
}

export function ReviewWorkflowStepCards({
  cycle,
  review,
  stacked = false,
}: ReviewWorkflowStepCardsProps) {
  const ratingScaleMax = cycle.ratingScale?.max ?? 5
  const steps = getWorkflowStepStates(cycle, review)

  if (steps.length === 0) {
    return null
  }

  const cardsClassName = [
    'tq-review-step-cards',
    stacked ? 'tq-review-step-cards--stacked' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="tq-review-step-cards-host min-w-0 w-full">
      <div className={cardsClassName}>
        {steps.map(({ step, state }, index) => {
          const deadline = step.deadline?.trim() || cycle.dueDate
          const label = workflowStepDisplayLabel(step.type, ratingScaleMax)

          return (
            <div key={step.id} className="tq-review-step-cards__item">
              <ModusWcCard
                bordered={state === 'current'}
                padding="compact"
                customClass={`${TRAQ_CARD_CLASS} tq-review-step-card ${stepCardClass(state)}`}
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="tq-review-step-card__index" aria-hidden="true">
                      {index + 1}
                    </span>
                    <ModusWcIcon name={workflowStepIcon(step.type)} size="xs" decorative />
                    <ModusWcTypography
                      hierarchy="p"
                      size="xs"
                      weight="semibold"
                      customClass="min-w-0 flex-1"
                      label={label}
                    />
                  </div>
                  <ModusWcBadge
                    size="sm"
                    variant="filled"
                    color={stepStateBadgeColor(state)}
                    customClass="self-start"
                  >
                    {getWorkflowStepCardStatusLabel(step.type, state)}
                  </ModusWcBadge>
                  {deadline && (
                    <div className="flex min-w-0 items-center gap-1">
                      <ModusWcIcon name="calendar" size="xs" decorative />
                      <ModusWcTypography
                        hierarchy="p"
                        size="xs"
                        customClass="min-w-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={`Due ${formatDate(deadline)}`}
                      />
                    </div>
                  )}
                </div>
              </ModusWcCard>
            </div>
          )
        })}
      </div>
    </div>
  )
}
