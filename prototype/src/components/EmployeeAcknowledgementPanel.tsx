import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { ReviewEmployeeAcceptanceForm } from './ReviewEmployeeAcceptanceForm'
import { PageBackButton } from './PageBackButton'

type EmployeeAcknowledgementPanelProps = {
  reviewId: string
  onBack: () => void
  onSubmitted?: () => void
}

export function EmployeeAcknowledgementPanel({
  reviewId,
  onBack,
  onSubmitted,
}: EmployeeAcknowledgementPanelProps) {
  const { submitReviewAcceptance, getReview, getCycle, getTemplate, getPerson } = usePerformance()
  const review = getReview(reviewId)
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined
  const employee = review ? getPerson(review.employeeId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined

  if (!review || !cycle || !template) {
    return <ModusWcTypography hierarchy="p" size="md" label="This review is no longer available." />
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <PageBackButton onBack={onBack} ariaLabel="Back to my reviews" />
        <div className="min-w-0">
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Review acceptance" />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`Discuss your ${cycle.name} with ${manager?.name ?? 'your manager'}, then record your response below.`}
          />
        </div>
      </div>

      <ReviewEmployeeAcceptanceForm
        review={review}
        cycle={cycle}
        template={template}
        employeeName={employee?.name ?? 'Employee'}
        managerName={manager?.name ?? 'Manager'}
        onCancel={onBack}
        compactActions
        onSubmit={(submission) => {
          submitReviewAcceptance(review.id, submission)
          onSubmitted?.()
        }}
      />
    </div>
  )
}
