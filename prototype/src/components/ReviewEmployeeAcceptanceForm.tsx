import { useEffect, useMemo, useState } from 'react'
import type { ISelectOption } from '@trimble-oss/moduswebcomponents'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcDate,
  ModusWcIcon,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewAcceptanceSubmission, ReviewCycle, ReviewTemplate } from '../types'
import { usePerformance } from '../context/PerformanceContext'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { REVIEW_ACCEPTANCE_COMMENT_MAX } from '../utils/acknowledgement'
import { readInputString } from '../utils/modusFormEvents'
import { ReviewAcceptanceSummary } from './ReviewAcceptanceSummary'

const DECISION_OPTIONS: ISelectOption[] = [
  { label: 'Select your response', value: '' },
  { label: 'I agree with this review', value: 'agree' },
  { label: 'I disagree with this review', value: 'disagree' },
]

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

type ReviewEmployeeAcceptanceFormProps = {
  review: PerformanceReview
  cycle: ReviewCycle
  template: ReviewTemplate
  employeeName: string
  managerName: string
  onCancel: () => void
  onSubmit: (submission: ReviewAcceptanceSubmission) => void
  compactActions?: boolean
}

export function ReviewEmployeeAcceptanceForm({
  review,
  cycle,
  template,
  employeeName,
  managerName,
  onCancel,
  onSubmit,
  compactActions = false,
}: ReviewEmployeeAcceptanceFormProps) {
  const { state } = usePerformance()
  const stackFooter = state.layoutMode === 'mobile'
  const [narrowViewport, setNarrowViewport] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    const sync = () => setNarrowViewport(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const fullWidthButtons = stackFooter || narrowViewport
  const [decision, setDecision] = useState<'agree' | 'disagree' | ''>('')
  const [comment, setComment] = useState('')
  const [signature, setSignature] = useState(employeeName)
  const [signedDate, setSignedDate] = useState(todayIsoDate)

  const commentLength = comment.length
  const disagreeSelected = decision === 'disagree'

  const canSubmit = useMemo(() => {
    if (decision !== 'agree' && decision !== 'disagree') return false
    if (!signature.trim() || !signedDate.trim()) return false
    if (disagreeSelected && !comment.trim()) return false
    return true
  }, [decision, signature, signedDate, disagreeSelected, comment])

  const handleSubmit = () => {
    if (!canSubmit || decision === '') return
    onSubmit({
      decision,
      comment,
      signature: signature.trim(),
      signedDate: signedDate.trim(),
    })
  }

  const handlePrintDownload = () => {
    window.print()
  }

  const primarySize = compactActions ? 'sm' : 'md'
  const iconSize = compactActions ? 'xs' : 'sm'

  return (
    <div
      className={`review-acceptance-screen flex flex-col gap-4${fullWidthButtons ? ' review-acceptance-screen--stack-footer' : ''}`}
    >
      <ReviewAcceptanceSummary
        review={review}
        cycle={cycle}
        template={template}
        employeeName={employeeName}
        managerName={managerName}
      />

      <ModusWcCard bordered padding="comfortable" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Your acceptance" />
        <div className="flex flex-col gap-4">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            label="After discussing this review with your manager, record whether you agree with the feedback, add any comments, and sign below."
          />
          <ModusWcSelect
            label="Response"
            size="sm"
            required
            value={decision}
            options={DECISION_OPTIONS}
            onInputChange={(e) => {
              const value = readInputString(e as CustomEvent)
              setDecision(value === 'agree' || value === 'disagree' ? value : '')
            }}
          />
          {disagreeSelected && (
            <ModusWcAlert
              variant="warning"
              alertTitle="HR follow-up required"
              alertDescription="Disagreeing flags this review for HR. Add a comment explaining your concerns before submitting."
            />
          )}
          <ModusWcTextarea
            label="Comment"
            size="sm"
            rows={4}
            placeholder={
              disagreeSelected
                ? 'Required when you disagree — share what you discussed with your manager.'
                : 'Optional — note anything you want on record.'
            }
            value={comment}
            required={disagreeSelected}
            onInputChange={(e) => {
              const next = readInputString(e as CustomEvent).slice(0, REVIEW_ACCEPTANCE_COMMENT_MAX)
              setComment(next)
            }}
          />
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`${commentLength} / ${REVIEW_ACCEPTANCE_COMMENT_MAX} characters`}
          />
          <ModusWcTextInput
            label="Signature"
            size="sm"
            required
            placeholder="Type full name to sign"
            value={signature}
            onInputChange={(e) => setSignature(readInputString(e as CustomEvent))}
          />
          <ModusWcDate
            label="Date"
            size="sm"
            required
            value={signedDate}
            onInputChange={(e) => setSignedDate(readInputString(e as CustomEvent))}
          />
        </div>
        <div
          slot="footer"
          className={`tq-card-footer-actions tq-review-acceptance-footer${fullWidthButtons ? ' tq-review-acceptance-footer--stack' : ''}`}
        >
          <div className="tq-review-acceptance-footer__actions">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              fullWidth={fullWidthButtons}
              customClass="tq-review-acceptance-footer__btn"
              onButtonClick={handlePrintDownload}
            >
              <ModusWcIcon name="download" size="xs" decorative />
              Download PDF
            </ModusWcButton>
            <div className="tq-review-acceptance-footer__commit-row">
              <ModusWcButton
                variant="outlined"
                color="tertiary"
                size="sm"
                fullWidth={fullWidthButtons}
                customClass="tq-review-acceptance-footer__btn"
                onButtonClick={onCancel}
              >
                Cancel
              </ModusWcButton>
              <ModusWcButton
                variant="filled"
                color="primary"
                size={primarySize}
                fullWidth={fullWidthButtons}
                customClass="tq-review-acceptance-footer__btn"
                disabled={!canSubmit}
                onButtonClick={handleSubmit}
              >
                <ModusWcIcon name="check_circle" size={iconSize} decorative />
                Submit acceptance
              </ModusWcButton>
            </div>
          </div>
        </div>
      </ModusWcCard>

      <div className="review-acceptance-print-target" aria-hidden="true">
        <ModusWcTypography hierarchy="h1" size="2xl" weight="bold" label="Performance review acceptance" />
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={`${cycle.name} · ${employeeName}`}
        />
        <ReviewAcceptanceSummary
          review={review}
          cycle={cycle}
          template={template}
          employeeName={employeeName}
          managerName={managerName}
          printMode
        />
      </div>
    </div>
  )
}
