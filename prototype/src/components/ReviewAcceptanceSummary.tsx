import { ModusWcCard, ModusWcDivider, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle, ReviewTemplate } from '../types'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { formatDate } from '../utils/status'
import { cycleIncludesSelfEvaluation, reviewOverallRatingLabel } from '../utils/workflow'
import { ReviewOverallRatingCompareColumn } from './ReviewOverallRating'

type ReviewAcceptanceSummaryProps = {
  review: PerformanceReview
  cycle: ReviewCycle
  template: ReviewTemplate
  employeeName: string
  managerName: string
  printMode?: boolean
}

export function ReviewAcceptanceSummary({
  review,
  cycle,
  template,
  employeeName,
  managerName,
  printMode = false,
}: ReviewAcceptanceSummaryProps) {
  const includesSelfEval = cycleIncludesSelfEvaluation(cycle)
  const overallRatingLabel = reviewOverallRatingLabel(cycle, review)

  return (
    <div className="flex flex-col gap-3">
      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Review summary" />
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employee" />
            <ModusWcTypography hierarchy="p" size="sm" label={employeeName} />
          </div>
          <div>
            <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager" />
            <ModusWcTypography hierarchy="p" size="sm" label={managerName} />
          </div>
          <div>
            <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Cycle" />
            <ModusWcTypography hierarchy="p" size="sm" label={cycle.name} />
          </div>
          <div>
            <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Template" />
            <ModusWcTypography hierarchy="p" size="sm" label={template.name} />
          </div>
          {overallRatingLabel && (
            <div className="sm:col-span-2">
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Overall performance rating" />
              <ModusWcTypography hierarchy="p" size="sm" label={overallRatingLabel} />
            </div>
          )}
        </dl>
      </ModusWcCard>

      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography
          slot="title"
          hierarchy="h4"
          size="md"
          weight="semibold"
          label="Side-by-side comparison"
        />
        <div className="flex flex-col gap-4">
          <div className="hidden gap-3 border-b border-[var(--modus-wc-color-base-200)] pb-2 sm:grid sm:grid-cols-2">
            <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employee (self evaluation)" />
            <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager review" />
          </div>
          {includesSelfEval && review.selfEval?.completedAt && (
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={`Self-evaluation submitted ${formatDate(review.selfEval.completedAt)}`}
            />
          )}
          {review.managerReview?.completedAt && (
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={`Manager review submitted ${formatDate(review.managerReview.completedAt)}`}
            />
          )}
          <ReviewOverallRatingCompareColumn cycle={cycle} review={review} />
          <div className="flex flex-col gap-6">
            {template.questions.map((q) => (
              <div key={q.id} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-lg bg-[var(--modus-wc-color-base-100)] p-3">
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employee" />
                  <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    label={
                      includesSelfEval
                        ? review.selfEval?.answers[q.id] ?? 'Not available'
                        : 'Self-evaluation not included in this cycle.'
                    }
                  />
                </div>
                <div className="rounded-lg border border-[var(--modus-wc-color-base-200)] p-3">
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager" />
                  <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    label={
                      review.managerReview?.answers[q.id] ??
                      (review.managerReview?.completedAt ? '—' : 'Not available')
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          {!review.managerReview?.completedAt && (
            <ModusWcTypography hierarchy="p" size="sm" label="Manager review not completed." />
          )}
        </div>
      </ModusWcCard>

      {printMode && review.acknowledgement?.completedAt && (
        <>
          <ModusWcDivider />
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Employee acceptance" />
            <dl className="grid gap-2">
              <div>
                <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Decision" />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  label={review.acknowledgement.decision === 'disagree' ? 'Disagree' : 'Agree'}
                />
              </div>
              {review.acknowledgement.comment && (
                <div>
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Comment" />
                  <ModusWcTypography hierarchy="p" size="sm" label={review.acknowledgement.comment} />
                </div>
              )}
              <div>
                <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Signature" />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  label={`${review.acknowledgement.signature ?? '—'} · ${review.acknowledgement.signedDate ?? '—'}`}
                />
              </div>
            </dl>
          </ModusWcCard>
        </>
      )}
    </div>
  )
}
