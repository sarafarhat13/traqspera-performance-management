import {
  ModusWcAlert,
  ModusWcAvatar,
  ModusWcCard,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type {
  Person,
  RatingScaleConfig,
  ReviewEmployeeGroup,
  ReviewTemplate,
  WorkflowKickoffMode,
  WorkflowStep,
  WorkflowStepType,
} from '../types'
import { reviewerPreviewLabel } from '../utils/reviewer'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { formatLongDate } from '../utils/status'
import { TagBadge } from './TagBadge'
import {
  canUseParallelKickoff,
  getEnabledWorkflowSteps,
  RATING_SCALE_STEP_META,
  workflowFlowStepLabel,
  workflowIncludesManagerRatingScale,
  WORKFLOW_STEP_META,
  type CoreWorkflowStepType,
} from '../utils/workflow'

type LaunchCycleReviewSummaryProps = {
  cycleName: string
  /** Message included in participant launch email */
  cycleDescription?: string
  template?: ReviewTemplate
  workflow: WorkflowStep[]
  workflowKickoffMode: WorkflowKickoffMode
  ratingScale: RatingScaleConfig
  selectedEmployees: Person[]
  attachedGroups?: ReviewEmployeeGroup[]
  conflictsWereResolved?: boolean
  getPerson?: (id: string) => Person | undefined
}

const TIMELINE_BULLET_CLASS: Record<WorkflowStepType, string> = {
  employee: 'tq-launch-review__step-index--primary',
  manager: 'tq-launch-review__step-index--warning',
  rating_scale: 'tq-launch-review__step-index--primary',
  acknowledgement: 'tq-launch-review__step-index--success',
}

function timelineStepIcon(type: WorkflowStepType): string {
  if (type === 'rating_scale') return RATING_SCALE_STEP_META.icon
  return WORKFLOW_STEP_META[type as CoreWorkflowStepType].icon
}

function timelineStepLabel(type: WorkflowStepType, ratingScaleMax: number): string {
  switch (type) {
    case 'employee':
      return 'Employee Self-Evaluation'
    case 'manager':
      return 'Manager Evaluation'
    case 'acknowledgement':
      return 'Employee Acknowledgment'
    case 'rating_scale':
      return `${ratingScaleMax}-Point Scale Rating`
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

type TimelineRow = {
  key: string
  label: string
  icon: string
  bulletClass: string
  deadline?: string
}

function buildTimelineRows(
  workflow: WorkflowStep[],
  kickoffMode: WorkflowKickoffMode,
  ratingScaleMax: number,
): TimelineRow[] {
  const enabled = getEnabledWorkflowSteps(workflow)
  const employee = enabled.find((step) => step.type === 'employee')
  const manager = enabled.find((step) => step.type === 'manager')
  const tail = enabled.filter((step) => step.type !== 'employee' && step.type !== 'manager')
  const useParallel =
    kickoffMode === 'parallel' && canUseParallelKickoff(workflow) && employee && manager

  if (useParallel) {
    const kickoffDeadlines = [employee.deadline, manager.deadline]
      .map((d) => d?.trim())
      .filter((d): d is string => Boolean(d))
      .sort()
    const managerTimelineLabel = workflowIncludesManagerRatingScale(workflow)
      ? `${timelineStepLabel('manager', ratingScaleMax)} (optional rating)`
      : timelineStepLabel('manager', ratingScaleMax)
    const rows: TimelineRow[] = [
      {
        key: 'parallel-kickoff',
        label: `${timelineStepLabel('employee', ratingScaleMax)} + ${managerTimelineLabel} (at the same time)`,
        icon: 'people_group',
        bulletClass: TIMELINE_BULLET_CLASS.employee,
        deadline: kickoffDeadlines.at(-1),
      },
    ]
    for (const step of tail) {
      if (step.type === 'rating_scale') continue
      rows.push({
        key: step.id,
        label: workflowFlowStepLabel(workflow, step, ratingScaleMax),
        icon: timelineStepIcon(step.type),
        bulletClass: TIMELINE_BULLET_CLASS[step.type],
        deadline: step.deadline?.trim() || undefined,
      })
    }
    return rows
  }

  return enabled
    .filter((step) => step.type !== 'rating_scale')
    .map((step) => ({
      key: step.id,
      label: workflowFlowStepLabel(workflow, step, ratingScaleMax),
      icon: timelineStepIcon(step.type),
      bulletClass: TIMELINE_BULLET_CLASS[step.type],
      deadline: step.deadline?.trim() || undefined,
    }))
}

export function LaunchCycleReviewSummary({
  cycleName,
  cycleDescription = '',
  template,
  workflow,
  workflowKickoffMode,
  ratingScale,
  selectedEmployees,
  attachedGroups = [],
  conflictsWereResolved = false,
  getPerson,
}: LaunchCycleReviewSummaryProps) {
  const timelineRows = buildTimelineRows(workflow, workflowKickoffMode, ratingScale.max)
  const employeeCount = selectedEmployees.length
  const employeeCountLabel =
    employeeCount === 1 ? '1 employee' : `${employeeCount} employees`
  const readyAlertDescription = `${
    conflictsWereResolved ? 'All reviewer assignments are confirmed. ' : ''
  }${employeeCountLabel} will be notified when the review cycle begins.`

  return (
    <div className="tq-launch-review flex flex-col gap-3">
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
          {cycleDescription.trim() ? (
            <>
              <ModusWcDivider />
              <div>
                <ModusWcTypography
                  hierarchy="p"
                  size="xs"
                  weight="semibold"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label="Participant email message"
                />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!mt-1 whitespace-pre-wrap text-[var(--modus-wc-color-base-content)]"
                  label={cycleDescription.trim()}
                />
              </div>
            </>
          ) : null}
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
        <SummaryCardHeader icon="calendar" title="Review Process Timeline" />
        <ol className="tq-launch-review__timeline">
          {timelineRows.map((row, index) => (
            <li key={row.key} className="tq-launch-review__timeline-row">
              <span className={`tq-launch-review__step-index ${row.bulletClass}`}>{index + 1}</span>
              <div className="tq-launch-review__timeline-main min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <ModusWcIcon name={row.icon} size="sm" decorative />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    weight="semibold"
                    label={row.label}
                  />
                </div>
              </div>
              {row.deadline && (
                <div className="tq-launch-review__timeline-due shrink-0">
                  <ModusWcIcon name="calendar" size="xs" decorative />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                    label={`Due: ${formatLongDate(row.deadline)}`}
                  />
                </div>
              )}
            </li>
          ))}
        </ol>
      </ModusWcCard>

      {attachedGroups.length > 0 ? (
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <SummaryCardHeader icon="people_group" title="Review groups" />
          <ul className="tq-launch-review__member-list">
            {attachedGroups.map((group) => {
              const previewPerson =
                (group.memberIds[0] && getPerson?.(group.memberIds[0])) ??
                selectedEmployees[0]
              const reviewerLabel = previewPerson
                ? reviewerPreviewLabel(
                    previewPerson,
                    group.defaultReviewerAssignment,
                    getPerson ?? (() => undefined),
                  )
                : '—'
              return (
                <li key={group.id} className="tq-launch-review__member-row">
                  <div className="min-w-0 flex-1">
                    <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={group.name} />
                    <ModusWcTypography
                      hierarchy="p"
                      size="xs"
                      customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                      label={`${group.memberIds.length} employees · ${reviewerLabel}`}
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        </ModusWcCard>
      ) : null}

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
          <TagBadge label={employeeCountLabel} />
        </div>
        <div className="flex flex-col gap-3">
          <ModusWcAlert
            variant="info"
            alertTitle="Ready to Start Review Cycle"
            alertDescription={readyAlertDescription}
          />
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
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        weight="semibold"
                        label={formatEmployeeNameWithCode(person.name, person.id)}
                      />
                      <ModusWcTypography
                        hierarchy="p"
                        size="xs"
                        customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={person.title}
                      />
                    </div>
                  </div>
                  <TagBadge label={person.department} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </ModusWcCard>
    </div>
  )
}
