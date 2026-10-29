import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { SupportingDocumentAttachment } from '../types'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import { formatDate } from '../utils/status'
import {
  cycleIncludesRatingScale,
  MANAGER_OVERALL_RATING_KEY,
  statusAfterManagerPhaseComplete,
} from '../utils/workflow'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { seedQuestionAnswerKeys } from '../utils/questionReview'
import { PerformanceRatingScaleField } from './PerformanceRatingScaleField'
import { SupportingDocumentsSection } from './SupportingDocumentsSection'
import { managerReviewAllowsSupportingDocuments } from '../utils/supportingDocuments'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { ReturnReviewToEmployeeAction } from './ReturnReviewToEmployeeAction'
const AUTO_SAVE_MS = 800
const MANAGER_ACK_SENT_MODAL_ID = 'manager-ack-sent-modal'

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

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    seedQuestionAnswerKeys(template?.questions ?? [], review?.managerReview?.answers),
  )

  const [overallRating, setOverallRating] = useState(() =>
    readStoredRating(review?.managerReview?.answers),
  )

  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocumentAttachment[]>(
    () => review?.managerReview?.supportingDocuments ?? [],
  )
  const showSupportingDocuments = managerReviewAllowsSupportingDocuments(cycle)

  const [draftDirty, setDraftDirty] = useState(false)
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [ackSentModalOpen, setAckSentModalOpen] = useState(false)
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
    saveManagerReviewDraft(
      review.id,
      payload,
      showSupportingDocuments ? supportingDocuments : undefined,
    )
    lastPersistedRef.current = payload
    setDraftDirty(false)
    setDraftSaveState('saved')
  }, [buildPayload, review, saveManagerReviewDraft, showSupportingDocuments, supportingDocuments])

  useEffect(() => {
    if (!review || !draftDirty) return

    const timer = window.setTimeout(() => {
      persistDraft()
    }, AUTO_SAVE_MS)

    return () => window.clearTimeout(timer)
  }, [answers, overallRating, supportingDocuments, draftDirty, persistDraft, review])

  useEffect(() => {
    if (!review || !template) return
    const seed = seedQuestionAnswerKeys(template.questions, review.managerReview?.answers)
    if (includesRatingScale) {
      const rating = readStoredRating(review.managerReview?.answers)
      if (rating > 0) {
        seed[MANAGER_OVERALL_RATING_KEY] = String(rating)
      }
    }
    lastPersistedRef.current = seed
    setAnswers(seed)
    setSupportingDocuments(review.managerReview?.supportingDocuments ?? [])
    setDraftDirty(false)
    setDraftSaveState('idle')
  }, [review?.id, template, includesRatingScale, review?.managerReview?.supportingDocuments])

  useEffect(() => {
    const dialog = document.getElementById(MANAGER_ACK_SENT_MODAL_ID) as HTMLDialogElement | null
    if (ackSentModalOpen) {
      dialog?.showModal()
      return
    }
    dialog?.close()
  }, [ackSentModalOpen])

  if (!review || !template) {
    return (
      <TraqsperaPageBody>
        <ModusWcTypography hierarchy="p" size="md" label="Select a team review to continue." />
      </TraqsperaPageBody>
    )
  }

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
    const completedAt = new Date().toISOString()
    const payload = buildPayload()
    const nextReview = {
      ...review,
      managerReview: {
        answers: payload,
        completedAt,
        savedAt: completedAt,
        supportingDocuments:
          showSupportingDocuments && supportingDocuments.length > 0
            ? supportingDocuments
            : undefined,
      },
    }
    const nextStatus = cycle
      ? statusAfterManagerPhaseComplete(cycle, nextReview)
      : 'completed'
    const showAckSentModal = nextStatus === 'acknowledgement_pending'

    saveManagerReview(
      review.id,
      payload,
      showSupportingDocuments ? supportingDocuments : undefined,
      { navigate: !showAckSentModal },
    )
    if (showAckSentModal) {
      setAckSentModalOpen(true)
    }
  }

  const closeAckSentModal = () => {
    setAckSentModalOpen(false)
    setView('manager_dashboard')
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
        title={`Review — ${
          employee ? formatEmployeeNameWithCode(employee.name, employee.id) : ''
        }`}
        subtitle={cycle?.name ?? ''}
        onBack={handleCancel}
        backAriaLabel="Back to team reviews"
        actions={
          <ReturnReviewToEmployeeAction
            reviewId={review.id}
            onReturned={() => setView('manager_dashboard')}
          />
        }
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
                <div className="flex flex-col gap-2 rounded-lg bg-[var(--modus-wc-color-base-100)] p-3">
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employee response" />
                  <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    label={review.selfEval?.answers?.[q.id] ?? 'Not submitted'}
                  />
                </div>
                <div className="flex flex-col gap-2">
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
            {showSupportingDocuments ? (
              <>
                <ModusWcDivider />
                <SupportingDocumentsSection
                  documents={supportingDocuments}
                  onDocumentsChange={(next) => {
                    markDirty()
                    setSupportingDocuments(next)
                  }}
                />
              </>
            ) : null}
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
                onButtonClick={handleSubmit}
              >
                <ModusWcIcon name="send" size="xs" decorative />
                Submit review
              </ModusWcButton>
            </div>
          </div>
        </ModusWcCard>
      </div>

      <ModusWcModal
        modalId={MANAGER_ACK_SENT_MODAL_ID}
        backdrop="default"
        position="center"
        showClose
        aria-label="Employee acknowledgment sent"
      >
        <span slot="header">Review submitted</span>
        <div slot="content">
          <ModusWcTypography
            hierarchy="p"
            size="md"
            label={`Employee acknowledgment has been sent to ${employee?.name ?? 'the employee'}. They will be notified to accept the review.`}
          />
        </div>
        <div slot="footer" className="flex w-full justify-end">
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={closeAckSentModal}>
            OK
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </TraqsperaPageBody>
  )
}

function hasDraftContent(answers: Record<string, string>): boolean {
  return Object.values(answers).some((value) => value.trim().length > 0)
}
