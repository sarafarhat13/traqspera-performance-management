import { useState } from 'react'
import {
  ModusWcCard,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PageBackButton } from './PageBackButton'
import { SelfEvaluationFooter } from './SelfEvaluationFooter'

type EmployeeSelfEvalPanelProps = {
  reviewId: string
  onBack: () => void
  onSubmitted?: () => void
}

export function EmployeeSelfEvalPanel({ reviewId, onBack, onSubmitted }: EmployeeSelfEvalPanelProps) {
  const { state, saveSelfEval, getReview, getCycle, getTemplate } = usePerformance()
  const review = getReview(reviewId)
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
      <ModusWcTypography hierarchy="p" size="md" label="This review is no longer available." />
    )
  }

  const handleSubmit = () => {
    saveSelfEval(review.id, answers)
    onSubmitted?.()
  }

  return (
    <div
      className={`tq-self-eval-page${state.layoutMode === 'mobile' ? ' tq-self-eval-page--inset' : ''}`}
    >
      <div className="tq-self-eval-page__main flex flex-col gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <PageBackButton onBack={onBack} ariaLabel="Back to my reviews" />
          <div className="min-w-0">
            <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Self-Evaluation" />
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={template.description}
            />
          </div>
        </div>

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
                  rows={state.layoutMode === 'mobile' ? 4 : 3}
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

      <SelfEvaluationFooter onSaveForLater={onBack} onSubmit={handleSubmit} />
    </div>
  )
}
