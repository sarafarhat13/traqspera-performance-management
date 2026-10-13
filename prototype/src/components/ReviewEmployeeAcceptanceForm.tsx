import { useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcDate,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcTextInput,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type {
  PerformanceReview,
  ReviewAcceptanceSubmission,
  ReviewCycle,
  ReviewTemplate,
  SupportingDocumentAttachment,
} from '../types'
import { usePerformance } from '../context/PerformanceContext'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { REVIEW_ACCEPTANCE_COMMENT_MAX } from '../utils/acknowledgement'
import { readInputString } from '../utils/modusFormEvents'
import { ReviewAcceptanceSummary } from './ReviewAcceptanceSummary'
import { SupportingDocumentsSection } from './SupportingDocumentsSection'
import { cycleAllowsSupportingDocuments } from '../utils/supportingDocuments'

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
  const [comment, setComment] = useState('')
  const [signature, setSignature] = useState(employeeName)
  const [signedDate, setSignedDate] = useState(todayIsoDate)
  const [supportingDocuments, setSupportingDocuments] = useState<SupportingDocumentAttachment[]>(
    () => review.acknowledgement?.supportingDocuments ?? [],
  )
  const showSupportingDocuments = cycleAllowsSupportingDocuments(cycle)

  const commentLength = comment.length

  const canSubmit = useMemo(() => {
    return Boolean(signature.trim() && signedDate.trim())
  }, [signature, signedDate])

  const handleSubmit = () => {
    if (!canSubmit) return
    onSubmit({
      decision: 'agree',
      comment,
      signature: signature.trim(),
      signedDate: signedDate.trim(),
      supportingDocuments: showSupportingDocuments ? supportingDocuments : undefined,
    })
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
            label="After discussing this review with your manager, sign below to confirm you accept the feedback."
          />
          <ModusWcTextarea
            label="Comment"
            size="sm"
            rows={4}
            placeholder="Optional — note anything you want on record."
            value={comment}
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
          {showSupportingDocuments ? (
            <>
              <ModusWcDivider />
              <SupportingDocumentsSection
                documents={supportingDocuments}
                onDocumentsChange={setSupportingDocuments}
              />
            </>
          ) : null}
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
              disabled
              aria-label="Download PDF (not available in prototype)"
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
