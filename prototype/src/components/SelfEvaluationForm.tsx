import { useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'

function returnToEmployeePerformance(
  setView: ReturnType<typeof usePerformance>['setView'],
  setEmployeeDetailsTab: ReturnType<typeof usePerformance>['setEmployeeDetailsTab'],
  selectPerson: ReturnType<typeof usePerformance>['selectPerson'],
  activePersonId: string,
) {
  selectPerson(activePersonId)
  setEmployeeDetailsTab('performance')
  setView('employee_details')
}

export function SelfEvaluationForm() {
  const { state, saveSelfEval, setView, setEmployeeDetailsTab, selectPerson, getReview, getCycle, getTemplate } =
    usePerformance()
  const reviewId = state.selectedReviewId
  const review = reviewId ? getReview(reviewId) : undefined
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    if (review?.selfEval?.answers) return { ...review.selfEval.answers }
    const seed: Record<string, string> = {}
    template?.questions.forEach((q) => {
      seed[q.id] = ''
    })
    return seed
  })

  if (!review || !template) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="Select a review from your dashboard." />
      </TraqsperaPageBody>
    )
  }

  const isMobile = state.layoutMode === 'mobile'

  const handleSubmit = () => {
    saveSelfEval(review.id, answers)
  }

  const handleBack = () => {
    if (state.demoRole === 'employee') {
      returnToEmployeePerformance(setView, setEmployeeDetailsTab, selectPerson, state.activePersonId)
      return
    }
    setView('manager_dashboard')
  }

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Self-evaluation"
        subtitle={template.description}
        onBack={handleBack}
        backAriaLabel="Back"
      />

      <div className={`flex flex-col gap-3 ${isMobile ? 'max-w-md mx-auto w-full' : ''}`}>
      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <div className="flex flex-col gap-4">
          {template.questions.map((q, index) => (
            <div key={q.id} className="flex flex-col gap-1">
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                weight="semibold"
                label={`${index + 1}. ${q.label}${q.required ? ' *' : ''}`}
              />
              <ModusWcTextarea
                rows={isMobile ? 4 : 3}
                value={answers[q.id] ?? ''}
                aria-label={q.label}
                onInputChange={(e) =>
                  setAnswers((prev) => ({ ...prev, [q.id]: readInputString(e as CustomEvent) }))
                }
              />
            </div>
          ))}
        </div>
        <div slot="footer" className="flex justify-end gap-2 pt-4">
          <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={handleBack}>
            Save for later
          </ModusWcButton>
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={handleSubmit}>
            <ModusWcIcon name="send" size="xs" decorative />
            Submit
          </ModusWcButton>
        </div>
      </ModusWcCard>
      </div>
    </TraqsperaPageBody>
  )
}
