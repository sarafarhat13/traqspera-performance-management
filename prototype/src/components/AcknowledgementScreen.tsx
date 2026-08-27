import {
  ModusWcButton,
  ModusWcCard,
  ModusWcCheckbox,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { useState } from 'react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputChecked } from '../utils/modusFormEvents'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'

export function AcknowledgementScreen() {
  const {
    state,
    acknowledgeReview,
    setView,
    setEmployeeDetailsTab,
    selectPerson,
    getReview,
    getCycle,
    getPerson,
  } = usePerformance()
  const review = state.selectedReviewId ? getReview(state.selectedReviewId) : undefined
  const cycle = review ? getCycle(review.cycleId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined
  const [confirmed, setConfirmed] = useState(false)

  if (!review) {
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
        title="Review acknowledgement"
        subtitle={`Discuss your ${cycle?.name ?? 'review'} with ${manager?.name ?? 'your manager'}, then sign off below.`}
        onBack={handleBack}
        backAriaLabel="Back to my reviews"
      />

      <div
        className={`flex flex-col gap-4 ${isTablet ? 'max-w-2xl mx-auto w-full' : 'max-w-md mx-auto w-full'}`}
      >
      <ModusWcCard bordered padding="comfortable" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography
          slot="title"
          hierarchy="h4"
          size="md"
          weight="semibold"
          label="Sign-Off"
        />
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
          <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={handleBack}>
            Cancel
          </ModusWcButton>
          <ModusWcButton
            variant="filled"
            color="primary"
            size="md"
            disabled={!confirmed}
            onButtonClick={() => acknowledgeReview(review.id)}
          >
            <ModusWcIcon name="check_circle" size="sm" decorative />
            Complete acknowledgement
          </ModusWcButton>
        </div>
      </ModusWcCard>
      </div>
    </TraqsperaPageBody>
  )
}
