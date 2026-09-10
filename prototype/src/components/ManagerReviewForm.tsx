import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import { formatDate } from '../utils/status'
import {
  cycleIncludesRatingScale,
  MANAGER_OVERALL_RATING_KEY,
} from '../utils/workflow'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PerformanceRatingScaleField } from './PerformanceRatingScaleField'

const AUTO_SAVE_MS = 800

function readStoredRating(answers?: Record<string, string>): number {
  const raw = answers?.[MANAGER_OVERALL_RATING_KEY]
  if (!raw) return 0
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : 0
}

function answersEqual(left: Record<string, string>, right: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] ?? '') !== (right[key] ?? '')) return false
  }
  return true
}

export function ManagerReviewForm() {
  const {
    state,
    saveManagerReview,
    saveManagerReviewDraft,
    setView,
    getReview,
    getCycle,
    getTemplate,
    getPerson,
  } = usePerformance()
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

  const [draftDirty, setDraftDirty] = useState(false)
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const lastPersistedRef = useRef<Record<string, string>>({})

  const buildPayload = useCallback(() => {
    const payload = { ...answers }
    if (includesRatingScale && overallRating > 0) {
      payload[MANAGER_OVERALL_RATING_KEY] = String(overallRating)
    }
    return payload
  }, [answers, includesRatingScale, overallRating])

  const persistDraft = useCallback(() => {
    if (!review) return
    const payload = buildPayload()
    if (answersEqual(payload, lastPersistedRef.current)) return

    setDraftSaveState('saving')
    saveManagerReviewDraft(review.id, payload)
    lastPersistedRef.current = payload
    setDraftDirty(false)
    setDraftSaveState('saved')
  }, [buildPayload, review, saveManagerReviewDraft])

  useEffect(() => {
    if (!review || !draftDirty) return

    const timer = window.setTimeout(() => {
      persistDraft()
    }, AUTO_SAVE_MS)

    return () => window.clearTimeout(timer)
  }, [answers, overallRating, draftDirty, persistDraft, review])

  useEffect(() => {
    if (!review || !template) return
    const seed: Record<string, string> = {}
    template.questions.forEach((q) => {
      seed[q.id] = review.managerReview?.answers?.[q.id] ?? ''
    })
    if (includesRatingScale) {
      const rating = readStoredRating(review.managerReview?.answers)
      if (rating > 0) {
        seed[MANAGER_OVERALL_RATING_KEY] = String(rating)
      }
    }
    lastPersistedRef.current = seed
    setDraftDirty(false)
    setDraftSaveState('idle')
  }, [review?.id, template, includesRatingScale])

  if (!review || !template) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="Select a team review to continue." />
      </TraqsperaPageBody>
    )
  }

  const canSubmit = !includesRatingScale || overallRating > 0
  const lastSavedAt = review.managerReview?.savedAt

  const markDirty = () => {
    setDraftDirty(true)
    setDraftSaveState('idle')
  }

  const handleCancel = () => {
    if (draftDirty) {
      persistDraft()
    }
    setView('manager_dashboard')
  }

  const handleSaveDraft = () => {
    persistDraft()
  }

  const handleSubmit = () => {
    saveManagerReview(review.id, buildPayload())
  }

  const draftStatusLabel =
    draftSaveState === 'saving'
      ? 'Saving draft…'
      : draftSaveState === 'saved' && lastSavedAt
        ? `Draft saved ${formatDate(lastSavedAt)}`
        : lastSavedAt && hasDraftContent(buildPayload())
          ? `Draft saved ${formatDate(lastSavedAt)}`
          : 'Changes save automatically while you work.'

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title={`Review — ${employee?.name ?? ''}`}
        subtitle={cycle?.name ?? ''}
        onBack={handleCancel}
        backAriaLabel="Back to team reviews"
      />

      <div className="flex flex-col gap-3">
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="!m-0 mb-4 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={draftStatusLabel}
            aria-live="polite"
          />

          <div className="flex flex-col gap-6">
            {includesRatingScale && ratingScale && (
              <PerformanceRatingScaleField
                ratingScale={ratingScale}
                value={overallRating}
                onChange={(value) => {
                  markDirty()
                  setOverallRating(value)
                }}
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
                    onInputChange={(e) => {
                      markDirty()
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: readInputString(e as CustomEvent),
                      }))
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div slot="footer" className="tq-card-footer-actions tq-manager-review-footer">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              customClass="tq-manager-review-footer__cancel"
              onButtonClick={handleCancel}
            >
              Cancel
            </ModusWcButton>
            <div className="tq-manager-review-footer__primary-pair">
              <ModusWcButton
                variant="outlined"
                color="tertiary"
                size="sm"
                disabled={draftSaveState === 'saving'}
                onButtonClick={handleSaveDraft}
              >
                Save draft
              </ModusWcButton>
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                disabled={!canSubmit}
                onButtonClick={handleSubmit}
              >
                <ModusWcIcon name="send" size="xs" decorative />
                Submit review
              </ModusWcButton>
            </div>
          </div>
        </ModusWcCard>
      </div>
    </TraqsperaPageBody>
  )
}

function hasDraftContent(answers: Record<string, string>): boolean {
  return Object.values(answers).some((value) => value.trim().length > 0)
}
