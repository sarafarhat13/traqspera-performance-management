import { useMemo } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { ReviewScheduleLines } from './ReviewScheduleLines'
import { StatusBadge } from './StatusBadge'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'

export function EmployeeDashboard() {
  const { state, setView, selectReview, getCycle, getTemplate, setLayoutMode } = usePerformance()
  const employeeId = state.activePersonId

  const myReviews = useMemo(
    () => state.reviews.filter((r) => r.employeeId === employeeId),
    [state.reviews, employeeId],
  )

  const primaryAction = myReviews.find((r) => r.status === 'self_eval_pending')
  const ackAction = myReviews.find((r) => r.status === 'acknowledgement_pending')

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="My reviews"
        actions={
          <div className="flex gap-2">
            <ModusWcButton
              variant={state.layoutMode === 'desktop' ? 'filled' : 'outlined'}
              color={state.layoutMode === 'desktop' ? 'primary' : 'tertiary'}
              size="sm"
              onButtonClick={() => setLayoutMode('desktop')}
            >
              Desktop
            </ModusWcButton>
            <ModusWcButton
              variant={state.layoutMode === 'mobile' ? 'filled' : 'outlined'}
              color={state.layoutMode === 'mobile' ? 'primary' : 'tertiary'}
              size="sm"
              onButtonClick={() => setLayoutMode('mobile')}
            >
              Mobile
            </ModusWcButton>
          </div>
        }
      />

      <div className={`flex flex-col gap-3 ${state.layoutMode === 'mobile' ? 'max-w-md mx-auto' : ''}`}>

      {(primaryAction || ackAction) && (
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Action Required" />
          {primaryAction && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <ModusWcTypography hierarchy="p" size="sm" label="Complete your self-evaluation." />
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                onButtonClick={() => {
                  selectReview(primaryAction.id)
                  setView('self_eval')
                }}
              >
                <ModusWcIcon name="pencil" size="xs" decorative />
                Start self-evaluation
              </ModusWcButton>
            </div>
          )}
          {ackAction && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
              <ModusWcTypography hierarchy="p" size="sm" label="Acknowledge your completed review." />
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                onButtonClick={() => {
                  selectReview(ackAction.id)
                  setView('acknowledgement')
                }}
              >
                <ModusWcIcon name="check_circle" size="xs" decorative />
                Acknowledge
              </ModusWcButton>
            </div>
          )}
        </ModusWcCard>
      )}

      <div className="flex flex-col gap-3">
        {myReviews.map((review) => {
          const cycle = getCycle(review.cycleId)
          const template = cycle ? getTemplate(cycle.templateId) : undefined
          return (
            <ModusWcCard key={review.id} bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
              <div
                slot="title"
                className="tq-review-card-title mb-2 flex w-full min-w-0 items-center justify-between gap-2"
              >
                <ModusWcTypography
                  hierarchy="h4"
                  size="md"
                  weight="semibold"
                  customClass="min-w-0 flex-1"
                  label={cycle?.name ?? 'Review'}
                />
                <span className="shrink-0">
                  <StatusBadge status={review.status} />
                </span>
              </div>
              <div className="flex flex-col gap-2">
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={template?.name ?? ''}
                />
                {cycle && <ReviewScheduleLines cycle={cycle} review={review} />}
                <ModusWcButton
                  variant="outlined"
                  color="tertiary"
                  size="sm"
                  onButtonClick={() => {
                    selectReview(review.id)
                    if (review.status === 'self_eval_pending') setView('self_eval')
                    else if (review.status === 'acknowledgement_pending') setView('acknowledgement')
                    else setView('review_details')
                  }}
                >
                  View details
                </ModusWcButton>
              </div>
            </ModusWcCard>
          )
        })}
      </div>
      </div>
    </TraqsperaPageBody>
  )
}