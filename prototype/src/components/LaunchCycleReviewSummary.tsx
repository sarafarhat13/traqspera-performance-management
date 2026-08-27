import {
  ModusWcAvatar,
  ModusWcBadge,
  ModusWcCard,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { Person, RatingScaleConfig, ReviewTemplate, WorkflowStep, WorkflowStepType } from '../types'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { formatLongDate } from '../utils/status'
import {
  getEnabledWorkflowSteps,
  RATING_SCALE_STEP_META,
  WORKFLOW_STEP_META,
  type CoreWorkflowStepType,
} from '../utils/workflow'

type LaunchCycleReviewSummaryProps = {
  cycleName: string
  template?: ReviewTemplate
  workflow: WorkflowStep[]
  ratingScale: RatingScaleConfig
  selectedEmployees: Person[]
}

const TIMELINE_BULLET_CLASS: Record<CoreWorkflowStepType, string> = {
  employee: 'tq-launch-review__step-index--primary',
  manager: 'tq-launch-review__step-index--warning',
  acknowledgement: 'tq-launch-review__step-index--success',
}

function timelineStepLabel(type: WorkflowStepType): string {
  switch (type) {
    case 'employee':
      return 'Employee Self-Evaluation'
    case 'manager':
      return 'Manager Evaluation'
    case 'acknowledgement':
      return 'Employee Acknowledgment'
    default:
      return 'Scale Rating'
  }
}

function employeeInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function SummaryCardHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="tq-launch-review__card-header">
      <ModusWcIcon name={icon} size="sm" decorative />
      <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label={title} />
    </div>
  )
}

export function LaunchCycleReviewSummary({
  cycleName,
  template,
  workflow,
  ratingScale,
  selectedEmployees,
}: LaunchCycleReviewSummaryProps) {
  const timelineSteps = getEnabledWorkflowSteps(workflow).filter((step) => step.type !== 'rating_scale')
  const ratingEnabled = workflow.some((step) => step.enabled && step.type === 'rating_scale')
  const employeeCount = selectedEmployees.length
  const employeeCountLabel =
    employeeCount === 1 ? '1 employee' : `${employeeCount} employees`

  const configurationItems: { icon: string; label: string }[] = []
  if (workflow.some((step) => step.enabled && step.type === 'employee')) {
    configurationItems.push({ icon: WORKFLOW_STEP_META.employee.icon, label: 'Self Evaluation' })
  }
  if (workflow.some((step) => step.enabled && step.type === 'manager')) {
    configurationItems.push({ icon: WORKFLOW_STEP_META.manager.icon, label: 'Manager Evaluation' })
  }
  if (ratingEnabled) {
    configurationItems.push({
      icon: RATING_SCALE_STEP_META.icon,
      label: `${ratingScale.max}-Point Scale Rating`,
    })
  }

  return (
    <div className="tq-launch-review flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <SummaryCardHeader icon="description" title="Review Cycle Details" />
          <div className="flex flex-col gap-3">
            <div>
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                weight="semibold"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Cycle Name"
              />
              <ModusWcTypography hierarchy="p" size="md" weight="semibold" label={cycleName} />
            </div>
            <ModusWcDivider />
            <div>
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                weight="semibold"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Review Template"
              />
              <ModusWcTypography
                hierarchy="p"
                size="md"
                weight="semibold"
                label={template?.name ?? '—'}
              />
              {template?.description?.trim() && (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={template.description}
                />
              )}
            </div>
          </div>
        </ModusWcCard>

        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <SummaryCardHeader icon="settings" title="Review Configuration" />
          <ul className="tq-launch-review__config-list">
            {configurationItems.map((item) => (
              <li key={item.label} className="tq-launch-review__config-item">
                <ModusWcIcon
                  name="check_circle"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-success)] shrink-0"
                  decorative
                />
                <ModusWcIcon name={item.icon} size="sm" decorative />
                <ModusWcTypography hierarchy="p" size="sm" label={item.label} />
              </li>
            ))}
          </ul>
        </ModusWcCard>
      </div>

      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <SummaryCardHeader icon="calendar" title="Review Process Timeline" />
        <ol className="tq-launch-review__timeline">
          {timelineSteps.map((step, index) => {
            const coreType = step.type as CoreWorkflowStepType
            const meta = WORKFLOW_STEP_META[coreType]
            const bulletClass = TIMELINE_BULLET_CLASS[coreType]
            return (
              <li key={step.id} className="tq-launch-review__timeline-row">
                <span className={`tq-launch-review__step-index ${bulletClass}`}>{index + 1}</span>
                <div className="tq-launch-review__timeline-main min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <ModusWcIcon name={meta.icon} size="sm" decorative />
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      weight="semibold"
                      label={timelineStepLabel(step.type)}
                    />
                  </div>
                </div>
                {step.deadline && (
                  <div className="tq-launch-review__timeline-due shrink-0">
                    <ModusWcIcon name="calendar" size="xs" decorative />
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                      label={`Due: ${formatLongDate(step.deadline)}`}
                    />
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </ModusWcCard>

      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <div className="tq-launch-review__card-header tq-launch-review__card-header--split">
          <div className="flex min-w-0 items-center gap-2">
            <ModusWcIcon name="people_group" size="sm" decorative />
            <ModusWcTypography
              hierarchy="h4"
              size="md"
              weight="semibold"
              label="Selected Team Members"
            />
          </div>
          <ModusWcBadge variant="filled" color="secondary" size="sm">
            {employeeCountLabel}
          </ModusWcBadge>
        </div>
        <div className="flex flex-col gap-3">
          <div>
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              weight="semibold"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label="Departments"
            />
            <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label="Individual Selection" />
          </div>
          <ModusWcDivider />
          <div>
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              weight="semibold"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label="Team Members"
            />
            <ul className="tq-launch-review__member-list">
              {selectedEmployees.map((person) => (
                <li key={person.id} className="tq-launch-review__member-row">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <ModusWcAvatar
                      imgSrc={`https://i.pravatar.cc/96?u=${encodeURIComponent(person.id)}`}
                      initials={employeeInitials(person.name)}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={person.name} />
                      <ModusWcTypography
                        hierarchy="p"
                        size="xs"
                        customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={person.title}
                      />
                    </div>
                  </div>
                  <ModusWcBadge variant="filled" color="secondary" size="sm">
                    {person.department}
                  </ModusWcBadge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ModusWcCard>

      <div className="tq-launch-review__ready-banner" role="status">
        <ModusWcIcon
          name="check_circle"
          size="sm"
          customClass="text-[var(--modus-wc-color-primary)] shrink-0"
          decorative
        />
        <div className="min-w-0 text-center">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            customClass="text-[var(--modus-wc-color-primary)]"
            label="Ready to Start Review Cycle"
          />
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={`${employeeCountLabel} will be notified when the review cycle begins`}
          />
        </div>
      </div>
    </div>
  )
}
