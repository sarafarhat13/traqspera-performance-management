import { useEffect, useMemo, useState } from 'react'
import { ModusWcCard, ModusWcTabs, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { employeeCanViewManagerReviewContent } from '../utils/reviewAccess'
import { reviewOverallRatingLabel } from '../utils/workflow'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { ReviewEmployeeAcceptanceForm } from './ReviewEmployeeAcceptanceForm'
import {
  ReviewOverallRatingBanner,
  ReviewOverallRatingCompareColumn,
} from './ReviewOverallRating'
import { ReturnedToEmployeeNotice } from './ReturnReviewToEmployeeAction'
import { ReviewWorkflowStepCards } from './ReviewWorkflowStepCards'

const TAB_SELF = 0
const TAB_MANAGER = 1
const TAB_COMPARE = 2

type PerformanceReviewDetailContentProps = {
  reviewId: string
  onAcceptanceCancel?: () => void
}

export function PerformanceReviewDetailContent({
  reviewId,
  onAcceptanceCancel,
}: PerformanceReviewDetailContentProps) {
  const { state, getReview, getCycle, getTemplate, getPerson, submitReviewAcceptance } =
    usePerformance()
  const review = getReview(reviewId)
  const cycle = review ? getCycle(review.cycleId) : undefined
  const template = cycle ? getTemplate(cycle.templateId) : undefined
  const manager = review ? getPerson(review.managerId) : undefined
  const canViewManager = review
    ? employeeCanViewManagerReviewContent(review, state.activePersonId)
    : true

  const [activeTab, setActiveTab] = useState(TAB_SELF)
  const isMobile = state.layoutMode === 'mobile'
  const managerName = manager?.name ?? 'Manager'

  useEffect(() => {
    setActiveTab(canViewManager ? TAB_COMPARE : TAB_SELF)
  }, [reviewId, canViewManager])

  const tabs = useMemo(() => {
    const selfLabel = isMobile ? 'Self eval' : 'Self evaluation'
    const managerLabel = isMobile ? 'Manager' : 'Manager review'
    const compareLabel = isMobile ? 'Compare' : 'Side-by-side'
    const labels = canViewManager
      ? [selfLabel, managerLabel, compareLabel]
      : [selfLabel]
    return labels.map((label) => ({ label }))
  }, [canViewManager, isMobile])

  const tabIndex = useMemo(() => {
    if (canViewManager) {
      return {
        self: TAB_SELF,
        manager: TAB_MANAGER,
        compare: TAB_COMPARE,
      }
    }
    return { self: TAB_SELF, manager: -1, compare: -1 }
  }, [canViewManager])

  if (!review || !template) {
    return (
      <ModusWcTypography hierarchy="p" size="md" label="Review details are unavailable." />
    )
  }

  const employee = getPerson(review.employeeId)
  const showAcceptanceForm =
    review.status === 'acknowledgement_pending' &&
    review.employeeId === state.activePersonId &&
    Boolean(cycle)

  const overallRatingLabel = cycle ? reviewOverallRatingLabel(cycle, review) : null

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
      <ReturnedToEmployeeNotice reviewId={reviewId} />
      {cycle && (
        <div className="flex flex-col gap-2">
          <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Statuses" />
          <ReviewWorkflowStepCards cycle={cycle} review={review} stacked={isMobile} />
        </div>
      )}

      {!canViewManager && managerHiddenMessage}

      {canViewManager && cycle && <ReviewOverallRatingBanner cycle={cycle} review={review} />}

      {showAcceptanceForm && cycle && (
        <ReviewEmployeeAcceptanceForm
          review={review}
          cycle={cycle}
          template={template}
          employeeName={employee?.name ?? 'Employee'}
          managerName={manager?.name ?? 'Manager'}
          compactActions
          onCancel={() => onAcceptanceCancel?.()}
          onSubmit={(submission) => submitReviewAcceptance(review.id, submission)}
        />
      )}

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
              <ModusWcTypography
                slot="title"
                hierarchy="h4"
                size="md"
                weight="semibold"
                label="Manager review"
              />
              <div className="flex flex-col gap-4">
                <div>
                  <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Manager" />
                  <ModusWcTypography hierarchy="p" size="sm" label={managerName} />
                </div>
              {review.managerReview?.completedAt ? (
                <>
                  {overallRatingLabel && (
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
                        label={overallRatingLabel}
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
                </>
              ) : review.managerReview?.savedAt ? (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  label="Manager review is in progress. Feedback has been saved as a draft but not submitted yet."
                />
              ) : (
                <ModusWcTypography hierarchy="p" size="sm" label="Manager review not completed." />
              )}
              </div>
            </ModusWcCard>
          </div>

          <div hidden={activeTab !== tabIndex.compare} aria-hidden={activeTab !== tabIndex.compare}>
            <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
              <ModusWcTypography slot="title" hierarchy="h4" size="md" weight="semibold" label="Side-by-Side Comparison" />
              <div className="flex flex-col gap-6">
                {cycle && <ReviewOverallRatingCompareColumn cycle={cycle} review={review} />}
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
