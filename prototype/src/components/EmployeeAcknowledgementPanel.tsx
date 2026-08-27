import { useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcCheckbox,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputChecked } from '../utils/modusFormEvents'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
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
  const { acknowledgeReview, getReview, getCycle, getPerson } = usePerformance()
  const review = getReview(reviewId)
  const cycle = review ? getCycle(review.cycleId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined
  const [confirmed, setConfirmed] = useState(false)

  if (!review) {
    return <ModusWcTypography hierarchy="p" size="md" label="This review is no longer available." />
  }

  const handleSubmit = () => {
    acknowledgeReview(review.id)
    onSubmitted?.()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex min-w-0 items-start gap-3">
        <PageBackButton onBack={onBack} ariaLabel="Back to my reviews" />
        <div className="min-w-0">
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Review Acknowledgement" />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`Discuss your ${cycle?.name ?? 'review'} with ${manager?.name ?? 'your manager'}, then sign off below.`}
          />
        </div>
      </div>

      <ModusWcCard bordered padding="comfortable" customClass={TRAQ_CARD_CLASS}>
        <div slot="title" className="tq-section-card-title flex w-full min-w-0 items-start">
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Sign-Off" />
        </div>
        <div className="flex flex-col gap-4">
          <ModusWcTypography
            hierarchy="p"
            size="md"
            label="I have met with my manager, discussed this performance review, and acknowledge the feedback recorded."
          />
          <ModusWcCheckbox
            label="I acknowledge this review"
            value={confirmed}
            onInputChange={(e) => setConfirmed(readInputChecked(e as CustomEvent))}
          />
        </div>
        <div slot="footer" className="flex justify-end gap-2 pt-4">
          <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={onBack}>
            Cancel
          </ModusWcButton>
          <ModusWcButton
            variant="filled"
            color="primary"
            size="sm"
            disabled={!confirmed}
            onButtonClick={handleSubmit}
          >
            <ModusWcIcon name="check_circle" size="xs" decorative />
            Complete acknowledgement
          </ModusWcButton>
        </div>
      </ModusWcCard>
    </div>
  )
}
