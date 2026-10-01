import { useMemo, useState } from 'react'
import { ModusWcCard, ModusWcTabs, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { formatDate, formatReviewPeriod } from '../utils/status'
import { employeeCanViewManagerReviewContent } from '../utils/reviewAccess'
import { MANAGER_OVERALL_RATING_KEY } from '../utils/workflow'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { CurrentStageDueLine } from './CurrentStageDueLine'
import { ReviewWorkflowStepCards } from './ReviewWorkflowStepCards'

const TAB_OVERVIEW = 0
const TAB_SELF = 1
const TAB_MANAGER = 2
const TAB_COMPARE = 3

export function PerformanceReviewDetailContent({ reviewId }: { reviewId: string }) {
  const { state, getReview, getCycle, getTemplate, getPerson } = usePerformance()
  const review = getReview(reviewId)
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined
  const canViewManager = review
    ? employeeCanViewManagerReviewContent(review, state.activePersonId)
    : true

  const [activeTab, setActiveTab] = useState(0)
  const isMobile = state.layoutMode === 'mobile'

  const tabs = useMemo(() => {
    const labels = isMobile
      ? (['Overview', 'Self eval'] as string[])
      : (['Overview', 'Self evaluation'] as string[])
    if (canViewManager) {
      labels.push(isMobile ? 'Manager' : 'Manager review', isMobile ? 'Compare' : 'Side-by-side')
    }
    return labels.map((label) => ({ label }))
  }, [isMobile, canViewManager])

  const tabIndex = useMemo(() => {
    if (canViewManager) {
      return {
        overview: TAB_OVERVIEW,
        self: TAB_SELF,
        manager: TAB_MANAGER,
        compare: TAB_COMPARE,
      }
    }
    return { overview: 0, self: 1, manager: -1, compare: -1 }
  }, [canViewManager])

  if (!review || !template) {
    return (
      <ModusWcTypography hierarchy="p" size="md" label="Review details are unavailable." />
    )
  }

  const managerHiddenMessage = (
    <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
      <ModusWcTypography
        slot="title"
        hierarchy="h4"
        size="md"
        weight="semibold"
        label="Manager review"
      />
      <ModusWcTypography
        hierarchy="p"
        size="sm"
        label="Manager feedback will be available when your review is ready for acceptance."
      />
    </ModusWcCard>
  )

  return (
    <div className="flex flex-col gap-3">
      {cycle && (
        <div className="flex flex-col gap-2">
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Statuses" />
          <ReviewWorkflowStepCards cycle={cycle} review={review} stacked={isMobile} />
        </div>
      )}

      {!canViewManager && managerHiddenMessage}

      <div className="tq-review-detail-tabs">
        <ModusWcTabs
          tabs={tabs}
          activeTabIndex={Math.min(activeTab, tabs.length - 1)}
          tabStyle="bordered"
          size="sm"
          customClass="tq-review-detail-tabs__strip"
          aria-label="Review detail sections"
          onTabChange={(e: CustomEvent<{ previousTab: number; newTab: number }>) =>
            setActiveTab(e.detail.newTab)
          }
        />
      </div>

      <div hidden={activeTab !== tabIndex.overview} aria-hidden={activeTab !== tabIndex.overview}>
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
            {canViewManager && review.managerReview?.completedAt && (
              <div>
                <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager review completed" />
                <ModusWcTypography hierarchy="p" size="sm" label={formatDate(review.managerReview.completedAt)} />
              </div>
            )}
          </dl>
        </ModusWcCard>
      </div>

      <div hidden={activeTab !== tabIndex.self} aria-hidden={activeTab !== tabIndex.self}>
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Self Evaluation" />
          {review.selfEval ? (
            <div className="flex flex-col gap-4">
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
      </div>

      {canViewManager && (
        <>
          <div hidden={activeTab !== tabIndex.manager} aria-hidden={activeTab !== tabIndex.manager}>
            <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
              <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Manager Review" />
              {review.managerReview?.completedAt ? (
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
              ) : review.managerReview?.savedAt ? (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  label="Manager review is in progress. Feedback has been saved as a draft but not submitted yet."
                />
              ) : (
                <ModusWcTypography hierarchy="p" size="sm" label="Manager review not completed." />
              )}
            </ModusWcCard>
          </div>

          <div hidden={activeTab !== tabIndex.compare} aria-hidden={activeTab !== tabIndex.compare}>
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
        </>
      )}

    </div>
  )
}
