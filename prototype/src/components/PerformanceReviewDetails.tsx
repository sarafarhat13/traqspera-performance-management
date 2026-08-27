import {
  ModusWcAvatar,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { StatusBadge } from './StatusBadge'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { PerformanceReviewDetailContent } from './PerformanceReviewDetailContent'
import { PageBackButton } from './PageBackButton'

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
    if (state.selectedPersonId && (state.demoRole === 'hr_admin' || state.demoRole === 'manager')) {
      setView('employee_details')
      return
    }
    if (state.demoRole === 'hr_admin') {
      setView(state.selectedCycleId ? 'cycle_details' : 'hr_dashboard')
      return
    }
    if (state.demoRole === 'employee') {
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
        <div className="min-w-0 flex-1">
          <TraqsperaPageHeader title={employee?.name ?? 'Employee'} subtitle={cycle?.name ?? ''} />
          <StatusBadge status={review.status} />
        </div>
      </div>

      <PerformanceReviewDetailContent reviewId={review.id} />
    </TraqsperaPageBody>
  )
}
