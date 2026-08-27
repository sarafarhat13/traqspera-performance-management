import { useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import {
  cycleIncludesRatingScale,
  MANAGER_OVERALL_RATING_KEY,
} from '../utils/workflow'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PerformanceRatingScaleField } from './PerformanceRatingScaleField'

function readStoredRating(answers?: Record<string, string>): number {
  const raw = answers?.[MANAGER_OVERALL_RATING_KEY]
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

export function ManagerReviewForm() {
  const { state, saveManagerReview, setView, getReview, getCycle, getTemplate, getPerson } =
    usePerformance()
  const review = state.selectedReviewId ? getReview(state.selectedReviewId) : undefined
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined
  const employee = review ? getPerson(review.employeeId) : undefined
  const includesRatingScale = cycle ? cycleIncludesRatingScale(cycle) : false
  const ratingScale = cycle?.ratingScale

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const seed: Record<string, string> = {}
    template?.questions.forEach((q) => {
      seed[q.id] = review?.managerReview?.answers?.[q.id] ?? ''
    })
    return seed
  })

  const [overallRating, setOverallRating] = useState(() =>
    readStoredRating(review?.managerReview?.answers),
  )

  if (!review || !template) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="Select a team review to continue." />
      </TraqsperaPageBody>
    )
  }

  const canSubmit = !includesRatingScale || overallRating > 0

  const handleSubmit = () => {
    const payload = { ...answers }
    if (includesRatingScale) {
      payload[MANAGER_OVERALL_RATING_KEY] = String(overallRating)
    }
    saveManagerReview(review.id, payload)
  }

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title={`Review — ${employee?.name ?? ''}`}
        subtitle={cycle?.name ?? ''}
        onBack={() => setView('manager_dashboard')}
        backAriaLabel="Back to team reviews"
      />

      <div className="flex flex-col gap-3">
      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <div className="flex flex-col gap-6">
          {includesRatingScale && ratingScale && (
            <PerformanceRatingScaleField
              ratingScale={ratingScale}
              value={overallRating}
              onChange={setOverallRating}
            />
          )}

          {template.questions.map((q, index) => (
            <div key={q.id} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-1 rounded-lg bg-[var(--modus-wc-color-base-100)] p-3">
                <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employee response" />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  label={review.selfEval?.answers?.[q.id] ?? 'Not submitted'}
                />
              </div>
              <div className="flex flex-col gap-1">
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  weight="semibold"
                  label={`${index + 1}. Manager feedback${q.required ? ' *' : ''}`}
                />
                <ModusWcTextarea
                  rows={3}
                  value={answers[q.id] ?? ''}
                  aria-label={`Manager feedback for ${q.label}`}
                  onInputChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [q.id]: readInputString(e as CustomEvent) }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <div slot="footer" className="tq-card-footer-actions">
          <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={() => setView('manager_dashboard')}>
            Cancel
          </ModusWcButton>
          <ModusWcButton
            variant="filled"
            color="primary"
            size="sm"
            disabled={!canSubmit}
            onButtonClick={handleSubmit}
          >
            <ModusWcIcon name="save" size="xs" decorative />
            Submit review
          </ModusWcButton>
        </div>
      </ModusWcCard>
      </div>
    </TraqsperaPageBody>
  )
}
