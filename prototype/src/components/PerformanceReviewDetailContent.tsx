import { useMemo, useState } from 'react'
import { ModusWcCard, ModusWcTabs, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { formatDate, formatReviewPeriod } from '../utils/status'
import { MANAGER_OVERALL_RATING_KEY } from '../utils/workflow'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { CurrentStageDueLine } from './CurrentStageDueLine'

const TAB_LABELS = ['Overview', 'Self evaluation', 'Manager review', 'Side-by-side']

export function PerformanceReviewDetailContent({ reviewId }: { reviewId: string }) {
  const { state, getReview, getCycle, getTemplate, getPerson } = usePerformance()
  const review = getReview(reviewId)
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined

  const [activeTab, setActiveTab] = useState(0)
  const tabs = useMemo(() => TAB_LABELS.map((label) => ({ label })), [])

  if (!review || !template) {
    return (
      <ModusWcTypography hierarchy="p" size="md" label="Review details are unavailable." />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <ModusWcTabs
        tabs={tabs}
        activeTabIndex={activeTab}
        tabStyle="bordered"
        size="sm"
        onTabChange={(e: CustomEvent<{ previousTab: number; newTab: number }>) =>
          setActiveTab(e.detail.newTab)
        }
      />

      <div hidden={activeTab !== 0} aria-hidden={activeTab !== 0}>
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Overview" />
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager" />
              <ModusWcTypography hierarchy="p" size="sm" label={manager?.name ?? '—'} />
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Review period" />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                label={
                  cycle ? formatReviewPeriod(cycle.startDate, cycle.dueDate) : '—'
                }
              />
              {cycle && (
                <CurrentStageDueLine
                  cycle={cycle}
                  review={review}
                  demoRole={state.demoRole}
                  activePersonId={state.activePersonId}
                />
              )}
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Template" />
              <ModusWcTypography hierarchy="p" size="sm" label={template.name} />
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Self-evaluation" />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                label={cycle?.includesSelfEvaluation ? 'Included' : 'Not included'}
              />
            </div>
            {review.selfEval?.completedAt && (
              <div>
                <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Self-eval completed" />
                <ModusWcTypography hierarchy="p" size="sm" label={formatDate(review.selfEval.completedAt)} />
              </div>
            )}
            {review.managerReview?.completedAt && (
              <div>
                <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager review completed" />
                <ModusWcTypography hierarchy="p" size="sm" label={formatDate(review.managerReview.completedAt)} />
              </div>
            )}
          </dl>
        </ModusWcCard>
      </div>

      <div hidden={activeTab !== 1} aria-hidden={activeTab !== 1}>
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Self Evaluation" />
          {review.selfEval ? (
            <div className="flex flex-col gap-4">
              {template.questions.map((q) => (
                <div key={q.id}>
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
      </div>

      <div hidden={activeTab !== 2} aria-hidden={activeTab !== 2}>
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Manager Review" />
          {review.managerReview ? (
            <div className="flex flex-col gap-4">
              {cycle?.ratingScale &&
                review.managerReview.answers[MANAGER_OVERALL_RATING_KEY] && (
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
                <div key={q.id}>
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
      </div>

      <div hidden={activeTab !== 3} aria-hidden={activeTab !== 3}>
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Side-by-Side Comparison" />
          <div className="flex flex-col gap-6">
            {template.questions.map((q) => (
              <div key={q.id} className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-lg bg-[var(--modus-wc-color-base-100)] p-3">
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employee" />
                  <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    label={review.selfEval?.answers[q.id] ?? 'Not available'}
                  />
                </div>
                <div className="rounded-lg border border-[var(--modus-wc-color-base-200)] p-3">
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager" />
                  <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={q.label} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    label={review.managerReview?.answers[q.id] ?? 'Not available'}
                  />
                </div>
              </div>
            ))}
          </div>
        </ModusWcCard>
      </div>
    </div>
  )
}
