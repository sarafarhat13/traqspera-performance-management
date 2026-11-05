import { useState, type ReactNode } from 'react'
import {
  ModusWcAlert,
  ModusWcCard,
  ModusWcCollapse,
  ModusWcDivider,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type {
  EmployeeReviewerAssignment,
  Person,
  RatingScaleConfig,
  ReviewEmployeeGroup,
  ReviewTemplate,
  WorkflowKickoffMode,
  WorkflowStep,
  WorkflowStepType,
} from '../types'
import { defaultReviewerAssignment, reviewerPreviewLabel } from '../utils/reviewer'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { formatLongDate } from '../utils/status'
import { PerformanceDataTable } from './PerformanceDataTable'
import { TagBadge } from './TagBadge'
import {
  canUseParallelKickoff,
  getEnabledWorkflowSteps,
  RATING_SCALE_STEP_META,
  workflowFlowStepLabel,
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
  reviewerAssignments?: Record<string, EmployeeReviewerAssignment>
}

const TEAM_MEMBER_COLUMNS = [
  { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
  { id: 'reviewer', header: 'Reviewer', accessor: 'reviewer', sortable: true },
]

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

function SummarySection({
  collapseId,
  icon,
  title,
  description,
  defaultExpanded = false,
  collapsedBadge,
  children,
}: {
  collapseId: string
  icon: string
  title: string
  description: string
  defaultExpanded?: boolean
  collapsedBadge?: ReactNode
  children: ReactNode
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  return (
    <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-launch-review__section`}>
      <ModusWcCollapse
        collapseId={collapseId}
        expanded={expanded}
        onExpandedChange={(e: CustomEvent<{ expanded: boolean }>) => setExpanded(e.detail.expanded)}
      >
        <div slot="header" className="tq-launch-review__section-header">
          <ModusWcIcon name={icon} size="sm" decorative />
          <div className="min-w-0 flex-1">
            <ModusWcTypography hierarchy="h3" size="md" weight="semibold" customClass="!m-0" label={title} />
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={description}
            />
          </div>
          {collapsedBadge ? (
            <span className="tq-launch-review__section-badge" hidden={expanded}>
              {collapsedBadge}
            </span>
          ) : null}
        </div>
        <div slot="content" className="tq-launch-review__section-body">
          {children}
        </div>
      </ModusWcCollapse>
    </ModusWcCard>
  )
}

type TimelineStep = {
  key: string
  label: string
  icon: string
  deadline?: string
}

type TimelineRow = TimelineStep & {
  bulletClass: string
  /** Steps that open at the same time within this stage (parallel kickoff). */
  parallelSteps?: TimelineStep[]
}

function TimelineDueDate({ deadline }: { deadline?: string }) {
  return (
    <div className="tq-launch-review__timeline-due">
      <ModusWcIcon name="calendar" size="xs" decorative />
      <ModusWcTypography
        hierarchy="p"
        size="xs"
        customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
        label={deadline ? `Due ${formatLongDate(deadline)}` : 'No due date set'}
      />
    </div>
  )
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
    const rows: TimelineRow[] = [
      {
        key: 'parallel-kickoff',
        label: 'Self and manager evaluations',
        icon: 'people_group',
        bulletClass: TIMELINE_BULLET_CLASS.employee,
        deadline: kickoffDeadlines.at(-1),
        parallelSteps: [
          {
            key: employee.id,
            label: workflowFlowStepLabel(workflow, employee, ratingScaleMax),
            icon: timelineStepIcon('employee'),
            deadline: employee.deadline?.trim() || undefined,
          },
          {
            key: manager.id,
            label: workflowFlowStepLabel(workflow, manager, ratingScaleMax),
            icon: timelineStepIcon('manager'),
            deadline: manager.deadline?.trim() || undefined,
          },
        ],
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
  reviewerAssignments = {},
}: LaunchCycleReviewSummaryProps) {
  const timelineRows = buildTimelineRows(workflow, workflowKickoffMode, ratingScale.max)
  const employeeCount = selectedEmployees.length
  const employeeCountLabel =
    employeeCount === 1 ? '1 employee' : `${employeeCount} employees`
  const teamMemberRows = selectedEmployees.map((person) => ({
    id: person.id,
    name: formatEmployeeNameWithCode(person.name, person.id),
    reviewer: reviewerPreviewLabel(
      person,
      reviewerAssignments[person.id] ?? defaultReviewerAssignment(),
      getPerson ?? (() => undefined),
    ),
  }))
  const readyAlertDescription = `${
    conflictsWereResolved ? 'All reviewer assignments are confirmed. ' : ''
  }${employeeCountLabel} will be notified when the review cycle begins.`
  const lastDeadline = timelineRows.at(-1)?.deadline
  const isParallelKickoff = timelineRows.some((row) => row.parallelSteps)
  const stageCount = timelineRows.length
  const stepCountLabel = isParallelKickoff
    ? `Parallel kickoff · ${stageCount === 1 ? '1 stage' : `${stageCount} stages`}`
    : `Sequential · ${stageCount === 1 ? '1 step' : `${stageCount} steps`}`
  const groupCountLabel =
    attachedGroups.length === 1 ? '1 group' : `${attachedGroups.length} groups`

  return (
    <div className="tq-launch-review flex flex-col gap-3">
      <ModusWcAlert
        variant="info"
        alertTitle="Ready to Start Review Cycle"
        alertDescription={readyAlertDescription}
      />

      <SummarySection
        collapseId="launch-review-details"
        icon="clipboard"
        title="Review Cycle Details"
        description={`${cycleName} · ${template?.name ?? 'No template selected'}`}
      >
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
      </SummarySection>

      <SummarySection
        collapseId="launch-review-timeline"
        icon="calendar"
        title="Review Process Timeline"
        description={stepCountLabel}
        collapsedBadge={
          <TagBadge
            label={lastDeadline ? `Deadline: ${formatLongDate(lastDeadline)}` : 'No deadline set'}
          />
        }
      >
        <ol className="tq-launch-review__timeline">
          {timelineRows.map((row, index) =>
            row.parallelSteps ? (
              <li
                key={row.key}
                className="tq-launch-review__timeline-row tq-launch-review__timeline-row--parallel"
              >
                <span className={`tq-launch-review__step-index ${row.bulletClass}`}>{index + 1}</span>
                <div className="tq-launch-review__timeline-main min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <ModusWcIcon name={row.icon} size="sm" decorative />
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      weight="semibold"
                      customClass="!m-0"
                      label={row.label}
                    />
                    <TagBadge label="Start together" color="primary" />
                  </div>
                  <ul
                    className="tq-launch-review__parallel-steps"
                    aria-label="Steps that run at the same time"
                  >
                    {row.parallelSteps.map((step) => (
                      <li key={step.key} className="tq-launch-review__parallel-step">
                        <div className="flex min-w-0 items-center gap-2">
                          <ModusWcIcon name={step.icon} size="sm" decorative />
                          <ModusWcTypography
                            hierarchy="p"
                            size="sm"
                            weight="semibold"
                            customClass="!m-0"
                            label={step.label}
                          />
                        </div>
                        <TimelineDueDate deadline={step.deadline} />
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ) : (
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
                  <TimelineDueDate deadline={row.deadline} />
                </div>
              </li>
            ),
          )}
        </ol>
      </SummarySection>

      {attachedGroups.length > 0 ? (
        <SummarySection
          collapseId="launch-review-groups"
          icon="people_group"
          title="Review groups"
          description={groupCountLabel}
        >
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
        </SummarySection>
      ) : null}

      <SummarySection
        collapseId="launch-review-participants"
        icon="people_group"
        title="Participants"
        description={`${employeeCountLabel} and their reviewers`}
        defaultExpanded
      >
        <PerformanceDataTable
          caption="Employees in this review cycle and their reviewers"
          columns={TEAM_MEMBER_COLUMNS}
          data={teamMemberRows}
        />
      </SummarySection>
    </div>
  )
}
