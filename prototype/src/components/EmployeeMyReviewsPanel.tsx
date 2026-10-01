import { useMemo } from 'react'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle, ReviewTemplate } from '../types'
import { ReviewScheduleLines } from './ReviewScheduleLines'
import { StatusBadge } from './StatusBadge'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { needsEmployeeSelfEval } from '../utils/workflow'

type ReviewRow = {
  review: PerformanceReview
  cycle?: ReviewCycle
  template?: ReviewTemplate
}

type EmployeeMyReviewsPanelProps = {
  reviews: ReviewRow[]
  onSelfEval: (reviewId: string) => void
  onAcknowledge: (reviewId: string) => void
  onViewDetails: (reviewId: string) => void
}

function ReviewCard({
  row,
  onSelfEval,
  onAcknowledge,
  onViewDetails,
}: {
  row: ReviewRow
  onSelfEval: (reviewId: string) => void
  onAcknowledge: (reviewId: string) => void
  onViewDetails: (reviewId: string) => void
}) {
  const { review, cycle, template } = row
  const needsSelfEval = cycle ? needsEmployeeSelfEval(cycle, review) : review.status === 'self_eval_pending'
  const needsAcknowledgement = review.status === 'acknowledgement_pending'

  return (
    <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
      <div
        slot="title"
        className="tq-review-card-title tq-section-card-title mb-2 flex w-full min-w-0 items-center justify-between gap-2"
      >
        <ModusWcTypography
          hierarchy="h4"
          size="md"
          weight="semibold"
          customClass="min-w-0 flex-1"
          label={cycle?.name ?? 'Review'}
        />
        <span className="shrink-0">
          <StatusBadge status={review.status} cycle={cycle} review={review} />
        </span>
      </div>
      <div className="flex flex-col gap-2">
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={template?.name ?? ''}
        />
        {cycle && <ReviewScheduleLines cycle={cycle} review={review} />}
        <div className="mt-1 flex flex-wrap gap-2">
          {needsSelfEval && (
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              onButtonClick={() => onSelfEval(review.id)}
            >
              <ModusWcIcon name="pencil" size="xs" decorative />
              Complete self-evaluation
            </ModusWcButton>
          )}
          {needsAcknowledgement && (
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              onButtonClick={() => onAcknowledge(review.id)}
            >
              <ModusWcIcon name="check_circle" size="xs" decorative />
              Accept review
            </ModusWcButton>
          )}
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            onButtonClick={() => onViewDetails(review.id)}
          >
            View details
          </ModusWcButton>
        </div>
      </div>
    </ModusWcCard>
  )
}

function ReviewSection({
  title,
  description,
  rows,
  emptyLabel,
  onSelfEval,
  onAcknowledge,
  onViewDetails,
}: {
  title: string
  description?: string
  rows: ReviewRow[]
  emptyLabel: string
  onSelfEval: (reviewId: string) => void
  onAcknowledge: (reviewId: string) => void
  onViewDetails: (reviewId: string) => void
}) {
  return (
    <section className="flex flex-col gap-2" aria-labelledby={`${title.replace(/\s+/g, '-')}-heading`}>
      <div>
        <ModusWcTypography
          id={`${title.replace(/\s+/g, '-')}-heading`}
          hierarchy="h4"
          size="md"
          weight="semibold"
          label={title}
        />
        {description ? (
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={description}
          />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography hierarchy="p" size="sm" label={emptyLabel} />
        </ModusWcCard>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <ReviewCard
              key={row.review.id}
              row={row}
              onSelfEval={onSelfEval}
              onAcknowledge={onAcknowledge}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function sortRowsByDueDate(rows: ReviewRow[]): ReviewRow[] {
  return [...rows].sort((a, b) => {
    const aDue = a.cycle?.dueDate ?? ''
    const bDue = b.cycle?.dueDate ?? ''
    return bDue.localeCompare(aDue)
  })
}

export function EmployeeMyReviewsPanel({
  reviews,
  onSelfEval,
  onAcknowledge,
  onViewDetails,
}: EmployeeMyReviewsPanelProps) {
  const { awaitingAcknowledgment, notStarted, completed, inProgress } = useMemo(() => {
    const awaitingAcknowledgmentRows: ReviewRow[] = []
    const notStartedRows: ReviewRow[] = []
    const completedRows: ReviewRow[] = []
    const inProgressRows: ReviewRow[] = []

    for (const row of reviews) {
      switch (row.review.status) {
        case 'completed':
          completedRows.push(row)
          break
        case 'acknowledgement_pending':
          awaitingAcknowledgmentRows.push(row)
          break
        case 'not_started':
          notStartedRows.push(row)
          break
        default:
          inProgressRows.push(row)
      }
    }

    return {
      awaitingAcknowledgment: sortRowsByDueDate(awaitingAcknowledgmentRows),
      notStarted: sortRowsByDueDate(notStartedRows),
      completed: sortRowsByDueDate(completedRows),
      inProgress: sortRowsByDueDate(inProgressRows),
    }
  }, [reviews])

  if (reviews.length === 0) {
    return (
      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography hierarchy="p" size="md" label="No performance reviews are assigned to you yet." />
      </ModusWcCard>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {awaitingAcknowledgment.length > 0 && (
        <ModusWcAlert
          variant="info"
          alertTitle="Review acceptance"
          alertDescription="These reviews are ready for your acceptance. Read the summary, choose agree or disagree, and sign."
        />
      )}

      <ReviewSection
        title="Awaiting acknowledgment"
        description="Manager feedback is complete — record your acceptance to finish the review."
        rows={awaitingAcknowledgment}
        emptyLabel="No reviews are waiting for your acceptance."
        onSelfEval={onSelfEval}
        onAcknowledge={onAcknowledge}
        onViewDetails={onViewDetails}
      />

      <ReviewSection
        title="Not started"
        description="Reviews that have not been started yet."
        rows={notStarted}
        emptyLabel="You have no reviews in the not started state."
        onSelfEval={onSelfEval}
        onAcknowledge={onAcknowledge}
        onViewDetails={onViewDetails}
      />

      {inProgress.length > 0 && (
        <ReviewSection
          title="In progress"
          description="Self-evaluation or manager review is still underway."
          rows={inProgress}
          emptyLabel=""
          onSelfEval={onSelfEval}
          onAcknowledge={onAcknowledge}
          onViewDetails={onViewDetails}
        />
      )}

      <ReviewSection
        title="Completed"
        description="Finished reviews, including signed acceptances."
        rows={completed}
        emptyLabel="No completed reviews yet."
        onSelfEval={onSelfEval}
        onAcknowledge={onAcknowledge}
        onViewDetails={onViewDetails}
      />
    </div>
  )
}
