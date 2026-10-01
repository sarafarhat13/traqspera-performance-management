import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { ReviewEmployeeAcceptanceForm } from './ReviewEmployeeAcceptanceForm'

export function AcknowledgementScreen() {
  const {
    state,
    submitReviewAcceptance,
    setView,
    setEmployeeDetailsTab,
    selectPerson,
    getReview,
    getCycle,
    getTemplate,
    getPerson,
  } = usePerformance()
  const review = state.selectedReviewId ? getReview(state.selectedReviewId) : undefined
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined
  const employee = review ? getPerson(review.employeeId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined

  if (!review || !cycle || !template) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="No review selected." />
      </TraqsperaPageBody>
    )
  }

  const isTablet = state.layoutMode !== 'mobile'

  const handleBack = () => {
    selectPerson(state.activePersonId)
    setEmployeeDetailsTab('performance')
    setView('employee_details')
  }

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Review acceptance"
        subtitle={`Discuss your ${cycle.name} with ${manager?.name ?? 'your manager'}, then record your response below.`}
        onBack={handleBack}
        backAriaLabel="Back to my reviews"
      />

      <div
        className={`flex flex-col gap-4 ${isTablet ? 'max-w-3xl mx-auto w-full' : 'max-w-md mx-auto w-full'}`}
      >
        <ReviewEmployeeAcceptanceForm
          review={review}
          cycle={cycle}
          template={template}
          employeeName={employee?.name ?? 'Employee'}
          managerName={manager?.name ?? 'Manager'}
          onCancel={handleBack}
          onSubmit={(submission) => submitReviewAcceptance(review.id, submission)}
        />
      </div>
    </TraqsperaPageBody>
  )
}
