import { useMemo } from 'react'
import {
  ModusWcButton,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { EmployeeMyReviewsPanel } from './EmployeeMyReviewsPanel'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { isLaunchedReviewCycle } from '../utils/status'

export function EmployeeDashboard() {
  const { state, setView, selectReview, getCycle, getTemplate, setLayoutMode } = usePerformance()
  const employeeId = state.activePersonId

  const employeeReviews = useMemo(
    () =>
      state.reviews
        .filter(
          (review) =>
            review.employeeId === employeeId && isLaunchedReviewCycle(getCycle(review.cycleId)),
        )
        .map((review) => {
          const cycle = getCycle(review.cycleId)
          return {
            review,
            cycle,
            template: cycle ? getTemplate(cycle.templateId) : undefined,
          }
        }),
    [state.reviews, employeeId, getCycle, getTemplate],
  )

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

      <div
        className={`flex flex-col gap-3 ${state.layoutMode === 'mobile' ? 'max-w-md mx-auto' : ''}`}
      >
        {employeeReviews.length === 0 ? (
          <ModusWcTypography hierarchy="p" size="md" label="No performance reviews are assigned to you yet." />
        ) : (
          <EmployeeMyReviewsPanel
            reviews={employeeReviews}
            onSelfEval={(reviewId) => {
              selectReview(reviewId)
              setView('self_eval')
            }}
            onAcknowledge={(reviewId) => {
              selectReview(reviewId)
              setView('acknowledgement')
            }}
            onViewDetails={(reviewId) => {
              selectReview(reviewId)
              setView('review_details')
            }}
          />
        )}
      </div>
    </TraqsperaPageBody>
  )
}
