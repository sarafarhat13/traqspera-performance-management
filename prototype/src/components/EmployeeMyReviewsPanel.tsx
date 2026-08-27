import { useMemo, useState } from 'react'
import {
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

const REVIEW_LIST_TABS: ITab[] = [{ label: 'To Complete' }, { label: 'Completed' }]

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
  const needsSelfEval = review.status === 'self_eval_pending'
  const needsAcknowledgement = review.status === 'acknowledgement_pending'

  return (
    <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
      <div slot="title" className="tq-section-card-title mb-2 flex w-full min-w-0 flex-col items-start gap-1">
        <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label={cycle?.name ?? 'Review'} />
        <StatusBadge status={review.status} />
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
              Acknowledge review
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

export function EmployeeMyReviewsPanel({
  reviews,
  onSelfEval,
  onAcknowledge,
  onViewDetails,
}: EmployeeMyReviewsPanelProps) {
  const [activeTab, setActiveTab] = useState(0)

  const { pending, completed } = useMemo(() => {
    const pendingRows: ReviewRow[] = []
    const completedRows: ReviewRow[] = []
    for (const row of reviews) {
      if (row.review.status === 'completed') {
        completedRows.push(row)
      } else {
        pendingRows.push(row)
      }
    }
    return { pending: pendingRows, completed: completedRows }
  }, [reviews])

  const activeRows = activeTab === 0 ? pending : completed

  return (
    <div className="flex flex-col gap-3">
      <ModusWcTabs
        size="sm"
        tabStyle="bordered"
        tabs={REVIEW_LIST_TABS}
        activeTabIndex={activeTab}
        aria-label="My performance reviews"
        onTabChange={(e: CustomEvent<{ previousTab: number; newTab: number }>) => {
          setActiveTab(e.detail.newTab)
        }}
      />

      {activeRows.length === 0 ? (
        <SectionEmptyState
          title={activeTab === 0 ? 'No Reviews to Complete' : 'No Completed Reviews'}
          description={
            activeTab === 0
              ? 'When a review is assigned to you, it will appear here.'
              : 'Finished reviews will be listed here for your records.'
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {activeRows.map((row) => (
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
    </div>
  )
}

function SectionEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[4px] border border-[#e0e1e9] bg-white p-6 shadow-sm">
      <p className="text-left text-[14px] font-bold text-[#252a2e]">{title}</p>
      <p className="mt-1 text-left text-[13px] text-[#6a6e79]">{description}</p>
    </div>
  )
}
