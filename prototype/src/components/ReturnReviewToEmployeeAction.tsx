import { useCallback, useState } from 'react'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import { canReturnReviewToEmployee } from '../utils/reviewPushBack'
import { formatDate } from '../utils/status'

function returnReviewModalId(reviewId: string): string {
  return `return-review-to-employee-modal-${reviewId}`
}

function openReturnModal(reviewId: string) {
  (document.getElementById(returnReviewModalId(reviewId)) as HTMLDialogElement | null)?.showModal()
}

function closeReturnModal(reviewId: string) {
  (document.getElementById(returnReviewModalId(reviewId)) as HTMLDialogElement | null)?.close()
}

type ReturnReviewToEmployeeActionProps = {
  reviewId: string
  /** e.g. leave manager review form after a successful return */
  onReturned?: () => void
}

export function ReturnReviewToEmployeeAction({
  reviewId,
  onReturned,
}: ReturnReviewToEmployeeActionProps) {
  const { state, getReview, getCycle, getPerson, returnReviewToEmployee } = usePerformance()
  const review = getReview(reviewId)
  const cycle = review ? getCycle(review.cycleId) : undefined
  const viewer = getPerson(state.activePersonId)
  const employee = review ? getPerson(review.employeeId) : undefined

  const [note, setNote] = useState('')
  const [submitError, setSubmitError] = useState('')

  const canReturn = review && canReturnReviewToEmployee(review, cycle, viewer, state.people)

  const handleOpen = useCallback(() => {
    setNote('')
    setSubmitError('')
    openReturnModal(reviewId)
  }, [reviewId])

  const handleConfirm = useCallback(() => {
    const ok = returnReviewToEmployee(reviewId, note)
    if (!ok) {
      setSubmitError('Unable to return this review. Confirm the cycle is active and self-evaluation is enabled.')
      return
    }
    closeReturnModal(reviewId)
    onReturned?.()
  }, [note, onReturned, returnReviewToEmployee, reviewId])

  const managerPhase =
    review?.status === 'manager_pending' || review?.status === 'parallel_review_pending'
  const managerSubmitted = Boolean(review?.managerReview?.completedAt)
  const modalDescription = managerPhase
    ? `Send ${employee?.name ?? 'this employee'}'s review back to self-evaluation so they can complete or update missing sections. ${
        managerSubmitted
          ? 'Submitted manager feedback stays on file.'
          : 'Any in-progress manager review draft is kept.'
      }`
    : `Send ${employee?.name ?? 'this employee'}'s review back to self-evaluation so they can complete or update missing sections. Manager feedback stays on file; employee acknowledgment is cleared.`

  if (!canReturn || !review || !employee) return null

  return (
    <>
      <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={handleOpen}>
        <ModusWcIcon name="refresh" size="xs" decorative />
        Return to employee
      </ModusWcButton>

      <ModusWcModal
        modalId={returnReviewModalId(reviewId)}
        backdrop="default"
        position="center"
        showClose
        aria-label="Return review to employee"
      >
        <span slot="header">Return review to employee</span>
        <div slot="content" className="flex flex-col gap-3">
          <ModusWcTypography hierarchy="p" size="md" label={modalDescription} />
          <ModusWcTextarea
            label="Message to employee (optional)"
            size="sm"
            value={note}
            onInputChange={(e) => setNote(readInputString(e as CustomEvent))}
            placeholder="Describe what needs to be added or corrected."
          />
          {submitError ? (
            <ModusWcAlert variant="error" alertTitle="Could not return review" alertDescription={submitError} />
          ) : null}
        </div>
        <div slot="footer" className="flex w-full flex-wrap justify-end gap-2">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            onButtonClick={() => closeReturnModal(reviewId)}
          >
            Cancel
          </ModusWcButton>
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={handleConfirm}>
            <ModusWcIcon name="refresh" size="xs" decorative />
            Return to pending
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </>
  )
}

type ReturnedToEmployeeNoticeProps = {
  reviewId: string
}

/** Shown to the employee when a manager or HR returned their review for updates. */
export function ReturnedToEmployeeNotice({ reviewId }: ReturnedToEmployeeNoticeProps) {
  const { state, getReview, getPerson } = usePerformance()
  const review = getReview(reviewId)
  const returned = review?.returnedToEmployee
  if (!returned || review.employeeId !== state.activePersonId) return null

  const returnedBy = getPerson(returned.returnedByPersonId)
  const byLabel = returnedBy?.name ?? 'Your reviewer'

  const description = returned.note
    ? returned.note
    : 'Please complete or update your self-evaluation, then submit again.'

  return (
    <ModusWcAlert
      variant="warning"
      alertTitle={`Returned for updates on ${formatDate(returned.returnedAt)} by ${byLabel}`}
      alertDescription={description}
    />
  )
}
