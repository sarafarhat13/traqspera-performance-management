import { useCallback, useState } from 'react'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcIcon,
  ModusWcModal,
  ModusWcRadio,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import {
  canChooseReviewReturnTarget,
  canReturnReviewToEmployee,
  type ReviewReturnTarget,
} from '../utils/reviewPushBack'
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
  const [returnTarget, setReturnTarget] = useState<ReviewReturnTarget>('employee')
  const [submitError, setSubmitError] = useState('')

  const canReturn = review && canReturnReviewToEmployee(review, cycle, viewer, state.people)
  const chooseReturnTarget = review ? canChooseReviewReturnTarget(review) : false

  const handleOpen = useCallback(() => {
    setNote('')
    setReturnTarget('employee')
    setSubmitError('')
    openReturnModal(reviewId)
  }, [reviewId])

  const handleConfirm = useCallback(() => {
    const ok = returnReviewToEmployee(reviewId, note, chooseReturnTarget ? returnTarget : 'employee')
    if (!ok) {
      setSubmitError(
        returnTarget === 'manager'
          ? 'Unable to return this review to the manager. Confirm the cycle is still active.'
          : 'Unable to return this review. Confirm the cycle is active and self-evaluation is enabled.',
      )
      return
    }
    closeReturnModal(reviewId)
    onReturned?.()
  }, [chooseReturnTarget, note, onReturned, returnReviewToEmployee, returnTarget, reviewId])

  const managerPhase =
    review?.status === 'manager_pending' || review?.status === 'parallel_review_pending'
  const managerSubmitted = Boolean(review?.managerReview?.completedAt)

  const modalDescription =
    chooseReturnTarget && returnTarget === 'manager'
      ? `Reopen manager evaluation for ${employee?.name ?? 'this employee'}. Their submitted manager review becomes editable again; employee acknowledgment is cleared.`
      : chooseReturnTarget && returnTarget === 'employee'
        ? `Send ${employee?.name ?? 'this employee'}'s review back to self-evaluation. Submitted manager feedback stays on file; employee acknowledgment is cleared.`
        : managerPhase
          ? `Send ${employee?.name ?? 'this employee'}'s review back to self-evaluation so they can complete or update missing sections. ${
              managerSubmitted
                ? 'Submitted manager feedback stays on file.'
                : 'Any in-progress manager review draft is kept.'
            }`
          : `Send ${employee?.name ?? 'this employee'}'s review back to self-evaluation so they can complete or update missing sections. Manager feedback stays on file; employee acknowledgment is cleared.`

  const confirmLabel =
    chooseReturnTarget && returnTarget === 'manager'
      ? 'Return to manager'
      : chooseReturnTarget
        ? 'Return to employee'
        : 'Return to pending'

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
        <span slot="header">
          {chooseReturnTarget ? 'Return review for updates' : 'Return review to employee'}
        </span>
        <div slot="content" className="flex flex-col gap-3">
          {chooseReturnTarget ? (
            <div className="flex flex-col gap-2">
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                weight="semibold"
                label="Send back to"
              />
              <div className="flex flex-col gap-2">
                <ModusWcRadio
                  name={`return-review-target-${reviewId}`}
                  size="sm"
                  label="Employee self-evaluation"
                  value={returnTarget === 'employee'}
                  onInputChange={() => setReturnTarget('employee')}
                />
                <ModusWcRadio
                  name={`return-review-target-${reviewId}`}
                  size="sm"
                  label="Manager evaluation"
                  value={returnTarget === 'manager'}
                  onInputChange={() => setReturnTarget('manager')}
                />
              </div>
            </div>
          ) : null}
          <ModusWcTypography hierarchy="p" size="md" label={modalDescription} />
          <ModusWcTextarea
            label={
              returnTarget === 'manager' ? 'Message to manager (optional)' : 'Message to employee (optional)'
            }
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
            {confirmLabel}
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
