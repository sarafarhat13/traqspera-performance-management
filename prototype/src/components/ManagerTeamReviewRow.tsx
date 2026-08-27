import {
  ModusWcAvatar,
  ModusWcButton,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, Person, ReviewCycle } from '../types'
import { formatDate } from '../utils/status'
import { getCurrentStageDeadline } from '../utils/workflow'
import { ManagerReviewStatusBadge } from './ManagerReviewStatusBadge'

function employeeInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

type ManagerTeamReviewRowProps = {
  review: PerformanceReview
  employee?: Person
  cycle?: ReviewCycle
  templateName: string
  onStartReview?: () => void
  onDetails: () => void
}

export function ManagerTeamReviewRow({
  review,
  employee,
  cycle,
  templateName,
  onStartReview,
  onDetails,
}: ManagerTeamReviewRowProps) {
  const dueDate = cycle ? getCurrentStageDeadline(cycle, review) : undefined
  const selfEvalCompletedAt = review.selfEval?.completedAt
  const completedAt = review.acknowledgement?.completedAt ?? review.managerReview?.completedAt

  return (
    <div className="tq-manager-review-row">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ModusWcAvatar
          imgSrc={employee ? `https://i.pravatar.cc/96?u=${encodeURIComponent(employee.id)}` : undefined}
          initials={employeeInitials(employee?.name ?? 'EE')}
          size="md"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ModusWcTypography
              hierarchy="p"
              size="md"
              weight="semibold"
              customClass="!m-0"
              label={employee?.name ?? 'Employee'}
            />
            <ManagerReviewStatusBadge status={review.status} />
          </div>
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`${employee?.title ?? 'Employee'} • ${templateName}`}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {dueDate && (
              <div className="flex items-center gap-1">
                <ModusWcIcon name="calendar" size="xs" decorative />
                <ModusWcTypography
                  hierarchy="p"
                  size="xs"
                  customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={`Due: ${formatDate(dueDate)}`}
                />
              </div>
            )}
            {selfEvalCompletedAt && (
              <div className="flex items-center gap-1">
                <ModusWcIcon name="check_circle" size="xs" decorative />
                <ModusWcTypography
                  hierarchy="p"
                  size="xs"
                  customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={`Self-eval completed: ${formatDate(selfEvalCompletedAt)}`}
                />
              </div>
            )}
            {review.status === 'completed' && completedAt && (
              <div className="flex items-center gap-1">
                <ModusWcIcon name="check_circle" size="xs" decorative />
                <ModusWcTypography
                  hierarchy="p"
                  size="xs"
                  customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={`Completed: ${formatDate(completedAt)}`}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {onStartReview && (
          <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={onStartReview}>
            <ModusWcIcon name="pencil" size="xs" decorative />
            Start Review
          </ModusWcButton>
        )}
        <ModusWcButton variant="borderless" color="tertiary" size="sm" onButtonClick={onDetails}>
          Details
        </ModusWcButton>
      </div>
    </div>
  )
}
