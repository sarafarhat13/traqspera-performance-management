import {
  ModusWcAvatar,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { StatusBadge } from './StatusBadge'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { PerformanceReviewDetailContent } from './PerformanceReviewDetailContent'
import { PageBackButton } from './PageBackButton'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { PrototypeReviewDownloadButton } from './PrototypeReviewDownloadButton'
import { ReturnReviewToEmployeeAction } from './ReturnReviewToEmployeeAction'
import { ReviewOverallRatingHeaderBadge } from './ReviewOverallRating'

export function PerformanceReviewDetails() {
  const { state, setView, setEmployeeDetailsTab, selectPerson, getReview, getCycle, getPerson } = usePerformance()
  const review = state.selectedReviewId ? getReview(state.selectedReviewId) : undefined
  const cycle = review ? getCycle(review.cycleId) : undefined
  const employee = review ? getPerson(review.employeeId) : undefined

  if (!review) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="Select a review to view details." />
      </TraqsperaPageBody>
    )
  }

  const handleBack = () => {
    if (state.selectedPersonId && state.selectedPersonId !== state.activePersonId) {
      setView('employee_details')
      return
    }
    if (state.selectedCycleId) {
      setView('cycle_details')
      return
    }
    if (review.employeeId === state.activePersonId) {
      selectPerson(state.activePersonId)
      setEmployeeDetailsTab('performance')
      setView('employee_details')
      return
    }
    setView('manager_dashboard')
  }

  return (
    <TraqsperaPageBody>
      <div className="mb-3 flex flex-wrap items-start gap-3">
        <PageBackButton onBack={handleBack} ariaLabel="Back" />
        <ModusWcAvatar initials={employee?.name?.slice(0, 2) ?? 'EE'} size="lg" />
        <div className="mb-1 flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <TraqsperaPageHeader
              title={
                employee
                  ? formatEmployeeNameWithCode(employee.name, employee.id)
                  : 'Employee'
              }
              subtitle={cycle?.name ?? ''}
            />
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {cycle && <ReviewOverallRatingHeaderBadge cycle={cycle} review={review} />}
            <StatusBadge status={review.status} cycle={cycle} review={review} />
            <ReturnReviewToEmployeeAction reviewId={review.id} />
            {review.status === 'completed' && <PrototypeReviewDownloadButton />}
          </div>
        </div>
      </div>

      <PerformanceReviewDetailContent reviewId={review.id} />
    </TraqsperaPageBody>
  )
}
