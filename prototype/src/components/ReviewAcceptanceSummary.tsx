import { ModusWcCard, ModusWcDivider, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle, ReviewTemplate } from '../types'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { formatDate } from '../utils/status'
import { MANAGER_OVERALL_RATING_KEY } from '../utils/workflow'
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
        </dl>
      </ModusWcCard>

      {cycle.includesSelfEvaluation && (
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Self evaluation" />
          {review.selfEval?.completedAt ? (
            <div className="flex flex-col gap-4">
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={`Submitted ${formatDate(review.selfEval.completedAt)}`}
              />
              {template.questions.map((q) => (
                <div key={q.id} className="flex flex-col gap-1">
                  <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                    label={review.selfEval?.answers[q.id] ?? '—'}
                  />
                </div>
              ))}
            </div>
          ) : (
            <ModusWcTypography hierarchy="p" size="sm" label="Self-evaluation not submitted." />
          )}
        </ModusWcCard>
      )}

      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Manager review" />
        {review.managerReview?.completedAt ? (
          <div className="flex flex-col gap-4">
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={`Submitted ${formatDate(review.managerReview.completedAt)}`}
            />
            {cycle.ratingScale && review.managerReview.answers[MANAGER_OVERALL_RATING_KEY] && (
              <div>
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  weight="semibold"
                  label="Overall performance rating"
                />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={(() => {
                    const rating = Number(review.managerReview?.answers[MANAGER_OVERALL_RATING_KEY])
                    const label = cycle.ratingScale?.labels[rating - (cycle.ratingScale?.min ?? 1)]
                    return label ? `${rating} — ${label}` : String(rating)
                  })()}
                />
              </div>
            )}
            {template.questions.map((q) => (
              <div key={q.id} className="flex flex-col gap-1">
                <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={review.managerReview?.answers[q.id] ?? '—'}
                />
              </div>
            ))}
          </div>
        ) : (
          <ModusWcTypography hierarchy="p" size="sm" label="Manager review not completed." />
        )}
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
