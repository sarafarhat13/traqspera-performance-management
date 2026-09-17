import { useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcDate,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ReviewCycle } from '../types'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function reviewCycleCompleteModalId(cycleId: string): string {
  return `review-cycle-complete-${cycleId}`
}

export function ReviewCycleCompleteModal({
  cycle,
  isOpen,
  onClose,
}: {
  cycle: ReviewCycle
  isOpen: boolean
  onClose: () => void
}) {
  const { closeReviewCycle, getPerson } = usePerformance()
  const modalId = reviewCycleCompleteModalId(cycle.id)

  const [draftCompletionSignature, setDraftCompletionSignature] = useState('')
  const [draftCompletionDate, setDraftCompletionDate] = useState(todayIsoDate)

  const finalApproverPerson = cycle.finalApproverId
    ? getPerson(cycle.finalApproverId)
    : undefined

  const canSubmitCompletion =
    draftCompletionSignature.trim().length > 0 && draftCompletionDate.trim().length > 0

  useEffect(() => {
    if (!isOpen) return
    setDraftCompletionSignature(finalApproverPerson?.name ?? '')
    setDraftCompletionDate(todayIsoDate())
  }, [isOpen, finalApproverPerson?.name])

  useEffect(() => {
    const dialog = document.getElementById(modalId) as HTMLDialogElement | null
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [modalId, onClose])

  useEffect(() => {
    const dialog = document.getElementById(modalId) as HTMLDialogElement | null
    if (isOpen) dialog?.showModal()
    else dialog?.close()
  }, [isOpen, modalId])

  const confirmCloseCycle = () => {
    if (!canSubmitCompletion) return
    const ok = closeReviewCycle(cycle.id, {
      signature: draftCompletionSignature.trim(),
      signedDate: draftCompletionDate.trim(),
    })
    if (ok) onClose()
  }

  const finalApproverLabel = useMemo(
    () => (finalApproverPerson ? `Final approver: ${finalApproverPerson.name}` : null),
    [finalApproverPerson],
  )

  return (
    <ModusWcModal
      modalId={modalId}
      backdrop="default"
      position="center"
      showClose
      aria-label="Complete review cycle"
    >
      <span slot="header">Complete cycle</span>
      <div slot="content" className="flex flex-col gap-3">
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          label={`Confirm final approval for ${cycle.name}. This marks the cycle as finished and cannot be undone in this prototype.`}
        />
        {finalApproverLabel ? (
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={finalApproverLabel}
          />
        ) : null}
        <ModusWcTextInput
          label="Signature"
          size="sm"
          required
          placeholder="Type full name to sign"
          value={draftCompletionSignature}
          onInputChange={(e) => setDraftCompletionSignature(readInputString(e as CustomEvent))}
        />
        <ModusWcDate
          label="Date"
          size="sm"
          required
          value={draftCompletionDate}
          onInputChange={(e) => setDraftCompletionDate(readInputString(e as CustomEvent))}
        />
      </div>
      <div slot="footer" className="flex justify-end gap-2">
        <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={onClose}>
          Cancel
        </ModusWcButton>
        <ModusWcButton
          variant="filled"
          color="primary"
          size="sm"
          disabled={!canSubmitCompletion}
          onButtonClick={confirmCloseCycle}
        >
          <ModusWcIcon name="check_circle" size="xs" decorative />
          Complete cycle
        </ModusWcButton>
      </div>
    </ModusWcModal>
  )
}
