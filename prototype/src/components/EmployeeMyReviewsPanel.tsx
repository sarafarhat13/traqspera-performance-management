import { useMemo, useState } from 'react'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTabs,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ITab } from '@trimble-oss/moduswebcomponents'
import type { PerformanceReview, ReviewCycle, ReviewTemplate } from '../types'
import { ReviewScheduleLines } from './ReviewScheduleLines'
import { StatusBadge } from './StatusBadge'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { isReviewManager } from '../utils/viewerContext'
import { ReturnedToEmployeeNotice } from './ReturnReviewToEmployeeAction'
import { needsEmployeeSelfEval, reviewOverallRatingLabel } from '../utils/workflow'

type ReviewsAudience = 'self' | 'stakeholder'

type ReviewRow = {
  review: PerformanceReview
  cycle?: ReviewCycle
  template?: ReviewTemplate
}

type EmployeeMyReviewsPanelProps = {
  reviews: ReviewRow[]
  audience?: ReviewsAudience
  activePersonId?: string
  emptyReviewsLabel?: string
  onSelfEval: (reviewId: string) => void
  onAcknowledge: (reviewId: string) => void
  onViewDetails: (reviewId: string) => void
  onManagerReview?: (reviewId: string) => void
}

function ReviewCard({
  row,
  audience,
  activePersonId,
  onSelfEval,
  onAcknowledge,
  onViewDetails,
  onManagerReview,
}: {
  row: ReviewRow
  audience: ReviewsAudience
  activePersonId?: string
  onSelfEval: (reviewId: string) => void
  onAcknowledge: (reviewId: string) => void
  onViewDetails: (reviewId: string) => void
  onManagerReview?: (reviewId: string) => void
}) {
  const { review, cycle, template } = row
  const needsSelfEval = cycle ? needsEmployeeSelfEval(cycle, review) : review.status === 'self_eval_pending'
  const needsAcknowledgement = review.status === 'acknowledgement_pending'
  const overallRatingLabel = cycle ? reviewOverallRatingLabel(cycle, review) : null
  const showEmployeeActions = audience === 'self'
  const showManagerReview =
    audience === 'stakeholder' &&
    activePersonId &&
    onManagerReview &&
    isReviewManager(activePersonId, review) &&
    review.status === 'manager_pending'

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
        {showEmployeeActions && review.returnedToEmployee ? (
          <ReturnedToEmployeeNotice reviewId={review.id} />
        ) : null}
        {overallRatingLabel && (
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            label={`Overall rating: ${overallRatingLabel}`}
          />
        )}
        <div className="mt-1 flex flex-wrap gap-2">
          {showEmployeeActions && needsSelfEval && (
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
          {showEmployeeActions && needsAcknowledgement && (
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
          {showManagerReview ? (
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              onButtonClick={() => onManagerReview?.(review.id)}
            >
              <ModusWcIcon name="pencil" size="xs" decorative />
              Complete review
            </ModusWcButton>
          ) : null}
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

function ReviewList({
  rows,
  emptyLabel,
  audience,
  activePersonId,
  onSelfEval,
  onAcknowledge,
  onViewDetails,
  onManagerReview,
}: {
  rows: ReviewRow[]
  emptyLabel: string
  audience: ReviewsAudience
  activePersonId?: string
  onSelfEval: (reviewId: string) => void
  onAcknowledge: (reviewId: string) => void
  onViewDetails: (reviewId: string) => void
  onManagerReview?: (reviewId: string) => void
}) {
  if (rows.length === 0) {
    return (
      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography hierarchy="p" size="sm" label={emptyLabel} />
      </ModusWcCard>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <ReviewCard
          key={row.review.id}
          row={row}
          audience={audience}
          activePersonId={activePersonId}
          onSelfEval={onSelfEval}
          onAcknowledge={onAcknowledge}
          onViewDetails={onViewDetails}
          onManagerReview={onManagerReview}
        />
      ))}
    </div>
  )
}

function sortRowsByDueDate(rows: ReviewRow[]): ReviewRow[] {
  return [...rows].sort((a, b) => {
    const aDue = a.cycle?.dueDate ?? ''
    const bDue = b.cycle?.dueDate ?? ''
    return bDue.localeCompare(aDue)
  })
}

function todoSortPriority(row: ReviewRow): number {
  const needsSelfEval = row.cycle
    ? needsEmployeeSelfEval(row.cycle, row.review)
    : row.review.status === 'self_eval_pending'
  if (needsSelfEval) return 0
  if (row.review.status === 'acknowledgement_pending') return 1
  if (row.review.status === 'not_started') return 2
  return 3
}

function sortTodoRows(rows: ReviewRow[]): ReviewRow[] {
  return [...rows].sort((a, b) => {
    const priority = todoSortPriority(a) - todoSortPriority(b)
    if (priority !== 0) return priority
    const aDue = a.cycle?.dueDate ?? ''
    const bDue = b.cycle?.dueDate ?? ''
    return bDue.localeCompare(aDue)
  })
}

function partitionReviews(reviews: ReviewRow[]) {
  const todo: ReviewRow[] = []
  const completed: ReviewRow[] = []

  for (const row of reviews) {
    if (row.review.status === 'completed') {
      completed.push(row)
    } else {
      todo.push(row)
    }
  }

  return {
    todo: sortTodoRows(todo),
    completed: sortRowsByDueDate(completed),
  }
}

function DemoReviewsViewControls({
  demoEmptyView,
  onDemoEmptyViewChange,
}: {
  demoEmptyView: boolean
  onDemoEmptyViewChange: (next: boolean) => void
}) {
  return (
    <div
      className="tq-employee-reviews-demo-bar flex flex-col gap-2 rounded-lg border border-[var(--modus-wc-color-base-200)] bg-[var(--modus-wc-color-base-100)] p-3"
    >
      {demoEmptyView ? (
        <ModusWcAlert
          variant="info"
          alertTitle="Empty view (demo)"
          alertDescription="Review cards are hidden. Use Show reviews to restore your list."
        />
      ) : null}
      <div className="flex flex-wrap justify-center gap-2">
        <ModusWcButton
          variant={demoEmptyView ? 'outlined' : 'filled'}
          color={demoEmptyView ? 'tertiary' : 'primary'}
          size="sm"
          aria-label="Show reviews with data"
          onButtonClick={() => onDemoEmptyViewChange(false)}
        >
          Show reviews
        </ModusWcButton>
        <ModusWcButton
          variant={demoEmptyView ? 'filled' : 'outlined'}
          color={demoEmptyView ? 'primary' : 'tertiary'}
          size="sm"
          aria-label="Show empty To do and Completed lists for demo"
          onButtonClick={() => onDemoEmptyViewChange(true)}
        >
          Empty view (demo)
        </ModusWcButton>
      </div>
    </div>
  )
}

export function EmployeeMyReviewsPanel({
  reviews,
  audience = 'self',
  activePersonId,
  emptyReviewsLabel = 'No performance reviews are assigned yet.',
  onSelfEval,
  onAcknowledge,
  onViewDetails,
  onManagerReview,
}: EmployeeMyReviewsPanelProps) {
  const [activeTabIndex, setActiveTabIndex] = useState(0)
  const [demoEmptyView, setDemoEmptyView] = useState(false)

  const hasReviewData = reviews.length > 0
  const displayReviews = demoEmptyView && hasReviewData ? [] : reviews

  const { todo, completed } = useMemo(() => partitionReviews(displayReviews), [displayReviews])

  const hasSelfEvalDue = todo.some((row) =>
    row.cycle ? needsEmployeeSelfEval(row.cycle, row.review) : row.review.status === 'self_eval_pending',
  )
  const hasAcknowledgementDue = todo.some((row) => row.review.status === 'acknowledgement_pending')

  const tabs: ITab[] = useMemo(
    () => [
      { label: todo.length > 0 ? `To do (${todo.length})` : 'To do' },
      { label: completed.length > 0 ? `Completed (${completed.length})` : 'Completed' },
    ],
    [todo.length, completed.length],
  )

  const todoEmptyLabel =
    hasReviewData || !emptyReviewsLabel
      ? 'No open reviews. Switch to Completed to see finished reviews.'
      : emptyReviewsLabel

  return (
    <div className="flex flex-col gap-3">
      <div className="tq-employee-reviews-tabs min-w-0">
        <ModusWcTabs
          tabs={tabs}
          activeTabIndex={activeTabIndex}
          tabStyle="boxed"
          size="sm"
          customClass="tq-employee-reviews-tabs__strip"
          aria-label="Performance reviews"
          onTabChange={(e: CustomEvent<{ previousTab: number; newTab: number }>) =>
            setActiveTabIndex(e.detail.newTab)
          }
        />
      </div>

      <div hidden={activeTabIndex !== 0} aria-hidden={activeTabIndex !== 0} className="flex flex-col gap-3">
        {audience === 'self' && hasSelfEvalDue ? (
          <ModusWcAlert
            variant="warning"
            alertTitle="Self-evaluation due"
            alertDescription="Complete your self-evaluation so your manager can continue the review."
          />
        ) : null}
        {audience === 'self' && hasAcknowledgementDue ? (
          <ModusWcAlert
            variant="info"
            alertTitle="Review acceptance"
            alertDescription="These reviews are ready for your acceptance. Read the summary, choose agree or disagree, and sign."
          />
        ) : null}
        <ReviewList
          rows={todo}
          emptyLabel={todoEmptyLabel}
          audience={audience}
          activePersonId={activePersonId}
          onSelfEval={onSelfEval}
          onAcknowledge={onAcknowledge}
          onViewDetails={onViewDetails}
          onManagerReview={onManagerReview}
        />
      </div>

      <div hidden={activeTabIndex !== 1} aria-hidden={activeTabIndex !== 1} className="flex flex-col gap-3">
        <ReviewList
          rows={completed}
          emptyLabel="No completed reviews yet."
          audience={audience}
          activePersonId={activePersonId}
          onSelfEval={onSelfEval}
          onAcknowledge={onAcknowledge}
          onViewDetails={onViewDetails}
          onManagerReview={onManagerReview}
        />
      </div>

      {hasReviewData ? (
        <DemoReviewsViewControls
          demoEmptyView={demoEmptyView}
          onDemoEmptyViewChange={setDemoEmptyView}
        />
      ) : null}
    </div>
  )
}
