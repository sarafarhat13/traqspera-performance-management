import { useState } from 'react'
import {
  ModusWcCard,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import { isReviewEmployee } from '../utils/viewerContext'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { seedQuestionAnswerKeys } from '../utils/questionReview'
import { ReviewQuestionMeta, ReviewQuestionScoringInputs } from './ReviewQuestionScoring'
import { SelfEvaluationFooter } from './SelfEvaluationFooter'

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

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    seedQuestionAnswerKeys(template?.questions ?? [], review?.selfEval?.answers),
  )

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
    if (isReviewEmployee(state.activePersonId, review)) {
      returnToEmployeePerformance(setView, setEmployeeDetailsTab, selectPerson, state.activePersonId)
      return
    }
    setView('manager_dashboard')
  }

  return (
    <TraqsperaPageBody>
      <div className={`tq-self-eval-page tq-self-eval-page--viewport${isMobile ? ' tq-self-eval-page--narrow' : ''}`}>
        <div className="tq-self-eval-page__main flex flex-col gap-3">
          <TraqsperaPageHeader
            title="Self-evaluation"
            subtitle={template.description}
            onBack={handleBack}
            backAriaLabel="Back"
          />

          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <div className="flex flex-col gap-4">
              {template.questions.map((q, index) => (
                <div key={q.id} className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      weight="semibold"
                      label={`${index + 1}. ${q.label}${q.required ? ' *' : ''}`}
                    />
                    <ReviewQuestionMeta question={q} answers={answers} />
                  </div>
                  <ReviewQuestionScoringInputs
                    question={q}
                    ratingScale={cycle?.ratingScale}
                    answers={answers}
                    onAnswersChange={setAnswers}
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
          </ModusWcCard>
        </div>

        <SelfEvaluationFooter onSaveForLater={handleBack} onSubmit={handleSubmit} />
      </div>
    </TraqsperaPageBody>
  )
}
