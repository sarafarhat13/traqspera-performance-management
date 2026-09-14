import type { PerformanceReview, ReviewCycle, ReviewStatus, WorkflowStep, WorkflowStepType } from '../types'
import { formatDate } from './status'

export const WORKFLOW_STEP_LABELS: Record<WorkflowStepType, string> = {
  employee: 'Self Evaluation',
  manager: 'Manager Evaluation',
  acknowledgement: 'Employee Acknowledgment',
  rating_scale: 'Scale Rating',
}

/** Steps the user may drag to reorder in the Launch Cycle wizard. */
export const REORDERABLE_WORKFLOW_STEP_TYPES = ['employee', 'manager'] as const
export type ReorderableWorkflowStepType = (typeof REORDERABLE_WORKFLOW_STEP_TYPES)[number]

/** Always pinned after reorderable steps: rating_scale penultimate, acknowledgement last. */
export const FIXED_TAIL_WORKFLOW_STEP_TYPES = ['rating_scale', 'acknowledgement'] as const
export type FixedTailWorkflowStepType = (typeof FIXED_TAIL_WORKFLOW_STEP_TYPES)[number]

/** @deprecated Use REORDERABLE_WORKFLOW_STEP_TYPES for ordering; kept for display metadata. */
export const CORE_WORKFLOW_STEP_TYPES = ['employee', 'manager', 'acknowledgement'] as const
export type CoreWorkflowStepType = (typeof CORE_WORKFLOW_STEP_TYPES)[number]

export const WORKFLOW_STEP_META: Record<
  CoreWorkflowStepType,
  {
    title: string
    description: string
    dueDateLabel: string
    icon: string
    flowBulletClass: string
  }
> = {
  employee: {
    title: 'Self Evaluation',
    description: 'Employees complete their own performance assessment before manager review',
    dueDateLabel: 'Due Date for Self Evaluation',
    icon: 'person',
    flowBulletClass: 'tq-workflow-flow__bullet--primary',
  },
  manager: {
    title: 'Manager Evaluation',
    description: 'Managers provide their assessment and feedback on employee performance',
    dueDateLabel: 'Due Date for Manager Evaluation',
    icon: 'people_group',
    flowBulletClass: 'tq-workflow-flow__bullet--warning',
  },
  acknowledgement: {
    title: 'Employee Acknowledgment (Always included)',
    description:
      'Employees acknowledge receipt and review of their completed performance evaluation',
    dueDateLabel: 'Due Date for Employee Acknowledgment',
    icon: 'check_circle',
    flowBulletClass: 'tq-workflow-flow__bullet--success',
  },
}

export const RATING_SCALE_STEP_META = {
  title: 'Scale Rating',
  description: 'Include 5-point performance rating scale (1-Unsatisfactory to 5-Outstanding)',
  icon: 'bar_graph',
  flowBulletClass: 'tq-workflow-flow__bullet--primary',
}

export function createDefaultWorkflowSteps(): WorkflowStep[] {
  return [
    { id: 'wf-employee', type: 'employee', enabled: true, order: 0, deadline: '' },
    { id: 'wf-manager', type: 'manager', enabled: true, order: 1, deadline: '' },
    { id: 'wf-rating', type: 'rating_scale', enabled: true, order: 2, deadline: '' },
    { id: 'wf-ack', type: 'acknowledgement', enabled: true, order: 3, deadline: '' },
  ]
}

export function workflowFromLegacy(includesSelfEvaluation: boolean): WorkflowStep[] {
  const steps = createDefaultWorkflowSteps()
  if (!includesSelfEvaluation) {
    const employee = steps.find((s) => s.type === 'employee')
    if (employee) employee.enabled = false
  }
  return steps
}

export function getEnabledWorkflowSteps(workflow: WorkflowStep[]): WorkflowStep[] {
  return [...workflow].filter((s) => s.enabled).sort((a, b) => a.order - b.order)
}

export function includesSelfEvaluationFromWorkflow(workflow: WorkflowStep[]): boolean {
  return workflow.some((s) => s.enabled && s.type === 'employee')
}

export function initialStatusFromWorkflow(workflow: WorkflowStep[]): ReviewStatus {
  const first = getEnabledWorkflowSteps(workflow)[0]
  if (!first) return 'not_started'
  switch (first.type) {
    case 'employee':
      return 'self_eval_pending'
    case 'manager':
    case 'rating_scale':
      return 'manager_pending'
    case 'acknowledgement':
      return 'acknowledgement_pending'
    default:
      return 'not_started'
  }
}

export function cycleIncludesAcknowledgement(cycle: ReviewCycle): boolean {
  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  return workflow.some((s) => s.enabled && s.type === 'acknowledgement')
}

export function cycleIncludesRatingScale(cycle: ReviewCycle): boolean {
  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  return workflow.some((s) => s.enabled && s.type === 'rating_scale')
}

/** Stored in managerReview.answers when the cycle includes a rating scale step. */
export const MANAGER_OVERALL_RATING_KEY = '__overall_rating'

export function hasManagerReviewDraft(review: PerformanceReview): boolean {
  if (review.managerReview?.completedAt) return false
  const answers = review.managerReview?.answers
  if (!answers) return false
  return Object.values(answers).some((value) => value.trim().length > 0)
}

export function cycleIncludesSelfEvaluation(cycle: ReviewCycle): boolean {
  if (cycle.workflow) return includesSelfEvaluationFromWorkflow(cycle.workflow)
  return cycle.includesSelfEvaluation
}

export function getReorderableWorkflowSteps(workflow: WorkflowStep[]): WorkflowStep[] {
  return [...workflow]
    .filter((step) =>
      REORDERABLE_WORKFLOW_STEP_TYPES.includes(step.type as ReorderableWorkflowStepType),
    )
    .sort((a, b) => a.order - b.order)
}

/** @deprecated Use getReorderableWorkflowSteps for ordering. */
export function getCoreWorkflowSteps(workflow: WorkflowStep[]): WorkflowStep[] {
  return getReorderableWorkflowSteps(workflow)
}

export function getRatingScaleWorkflowStep(workflow: WorkflowStep[]): WorkflowStep | undefined {
  return workflow.find((step) => step.type === 'rating_scale')
}

export function getAcknowledgementWorkflowStep(workflow: WorkflowStep[]): WorkflowStep | undefined {
  return workflow.find((step) => step.type === 'acknowledgement')
}

function getFixedTailWorkflowSteps(steps: WorkflowStep[]): WorkflowStep[] {
  const defaults = createDefaultWorkflowSteps()
  return FIXED_TAIL_WORKFLOW_STEP_TYPES.map((type) => {
    const existing = steps.find((step) => step.type === type)
    const fallback = defaults.find((step) => step.type === type)!
    if (type === 'acknowledgement') {
      return { ...(existing ?? fallback), enabled: true }
    }
    return existing ?? fallback
  })
}

function applyWorkflowOrder(reorderable: WorkflowStep[], tail: WorkflowStep[]): WorkflowStep[] {
  const ordered = [...reorderable, ...tail]
  return ordered.map((step, index) => ({ ...step, order: index }))
}

export function normalizeWorkflowOrder(steps: WorkflowStep[]): WorkflowStep[] {
  const reorderable = getReorderableWorkflowSteps(steps)
  const tail = getFixedTailWorkflowSteps(steps)
  return applyWorkflowOrder(reorderable, tail)
}

export function resetCoreWorkflowOrder(steps: WorkflowStep[]): WorkflowStep[] {
  const defaults = createDefaultWorkflowSteps()
  const defaultReorderable = getReorderableWorkflowSteps(defaults)
  const nextReorderable = defaultReorderable.map((defaultStep) => {
    const existing = steps.find((step) => step.type === defaultStep.type)
    return existing ? { ...existing, order: defaultStep.order } : defaultStep
  })
  const tail = getFixedTailWorkflowSteps(steps)
  return normalizeWorkflowOrder([...nextReorderable, ...tail])
}

export function moveCoreWorkflowStepToIndex(
  steps: WorkflowStep[],
  sourceId: string,
  targetIndex: number,
): WorkflowStep[] {
  const reorderable = getReorderableWorkflowSteps(steps)
  const sourceStep = reorderable.find((step) => step.id === sourceId)
  if (!sourceStep) return normalizeWorkflowOrder(steps)

  const fromIndex = reorderable.findIndex((step) => step.id === sourceId)
  if (fromIndex < 0 || fromIndex === targetIndex) return steps

  const nextReorderable = [...reorderable]
  const [item] = nextReorderable.splice(fromIndex, 1)
  nextReorderable.splice(targetIndex, 0, item)

  const tail = getFixedTailWorkflowSteps(steps)
  return applyWorkflowOrder(nextReorderable, tail)
}

export function reorderWorkflowStep(steps: WorkflowStep[], id: string, direction: 'up' | 'down'): WorkflowStep[] {
  const sorted = [...steps].sort((a, b) => a.order - b.order)
  const index = sorted.findIndex((s) => s.id === id)
  if (index < 0) return steps
  const swapIndex = direction === 'up' ? index - 1 : index + 1
  if (swapIndex < 0 || swapIndex >= sorted.length) return steps
  const next = [...sorted]
  const a = next[index]
  const b = next[swapIndex]
  next[index] = { ...b, order: a.order }
  next[swapIndex] = { ...a, order: b.order }
  return next.map((s, i) => ({ ...s, order: i }))
}

export type WorkflowStepState = 'complete' | 'current' | 'pending'

export type WorkflowReviewStage =
  | 'not_started'
  | 'employee_review'
  | 'manager_review'
  | 'employee_acknowledgment'

export const WORKFLOW_REVIEW_STAGE_LABELS: Record<WorkflowReviewStage | 'complete', string> = {
  not_started: 'Not started',
  employee_review: 'Employee review',
  manager_review: 'Manager Review',
  employee_acknowledgment: 'Employee Acknowledgment',
  complete: 'Complete',
}

export function workflowReviewStageBadgeColor(
  stage: WorkflowReviewStage | 'complete',
): 'primary' | 'warning' | 'success' | 'tertiary' | 'secondary' {
  switch (stage) {
    case 'complete':
      return 'success'
    case 'employee_review':
    case 'employee_acknowledgment':
      return 'warning'
    case 'manager_review':
      return 'primary'
    case 'not_started':
      return 'tertiary'
    default:
      return 'secondary'
  }
}

const WORKFLOW_STEP_STATUS_LABELS: Partial<Record<WorkflowStepType, string>> = {
  employee: WORKFLOW_REVIEW_STAGE_LABELS.employee_review,
  manager: WORKFLOW_REVIEW_STAGE_LABELS.manager_review,
  rating_scale: WORKFLOW_REVIEW_STAGE_LABELS.manager_review,
  acknowledgement: WORKFLOW_REVIEW_STAGE_LABELS.employee_acknowledgment,
}

export function getWorkflowStepCardStatusLabel(
  stepType: WorkflowStepType,
  state: WorkflowStepState,
): string {
  if (state === 'complete') return WORKFLOW_REVIEW_STAGE_LABELS.complete
  if (state === 'pending') return WORKFLOW_REVIEW_STAGE_LABELS.not_started
  return WORKFLOW_STEP_STATUS_LABELS[stepType] ?? WORKFLOW_REVIEW_STAGE_LABELS.not_started
}

export function getReviewWorkflowStage(
  cycle: ReviewCycle,
  review: PerformanceReview,
): WorkflowReviewStage | 'complete' {
  switch (review.status) {
    case 'not_started':
      return 'not_started'
    case 'self_eval_pending':
      return 'employee_review'
    case 'manager_pending':
      return 'manager_review'
    case 'acknowledgement_pending':
      return 'employee_acknowledgment'
    case 'completed':
      return 'complete'
    default: {
      const step = getCurrentWorkflowStep(cycle, review)
      if (!step) return 'complete'
      switch (step.type) {
        case 'employee':
          return 'employee_review'
        case 'manager':
        case 'rating_scale':
          return 'manager_review'
        case 'acknowledgement':
          return 'employee_acknowledgment'
        default:
          return 'not_started'
      }
    }
  }
}

export function getCycleWorkflowStageCards(cycle: ReviewCycle): WorkflowReviewStage[] {
  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  const enabled = getEnabledWorkflowSteps(workflow)
  const cards: WorkflowReviewStage[] = ['not_started']

  if (enabled.some((step) => step.type === 'employee')) {
    cards.push('employee_review')
  }
  if (enabled.some((step) => step.type === 'manager' || step.type === 'rating_scale')) {
    cards.push('manager_review')
  }
  if (enabled.some((step) => step.type === 'acknowledgement')) {
    cards.push('employee_acknowledgment')
  }

  return cards
}

export function computeCycleWorkflowStageCounts(
  cycle: ReviewCycle,
  reviews: PerformanceReview[],
): Record<WorkflowReviewStage, number> {
  const counts: Record<WorkflowReviewStage, number> = {
    not_started: 0,
    employee_review: 0,
    manager_review: 0,
    employee_acknowledgment: 0,
  }

  for (const review of reviews) {
    if (review.cycleId !== cycle.id) continue
    const stage = getReviewWorkflowStage(cycle, review)
    if (stage === 'complete') continue
    counts[stage] += 1
  }

  return counts
}

export function workflowStepDisplayLabel(
  type: WorkflowStepType,
  ratingScaleMax = 5,
): string {
  switch (type) {
    case 'employee':
      return WORKFLOW_STEP_LABELS.employee
    case 'manager':
      return WORKFLOW_STEP_LABELS.manager
    case 'acknowledgement':
      return WORKFLOW_STEP_LABELS.acknowledgement
    case 'rating_scale':
      return `${ratingScaleMax}-Point Scale Rating`
    default:
      return 'Scale Rating'
  }
}

export function workflowStepIcon(type: WorkflowStepType): string {
  if (type === 'rating_scale') return RATING_SCALE_STEP_META.icon
  return WORKFLOW_STEP_META[type as CoreWorkflowStepType].icon
}

export function isWorkflowStepComplete(step: WorkflowStep, review: PerformanceReview): boolean {
  switch (step.type) {
    case 'employee':
      return Boolean(review.selfEval?.completedAt)
    case 'manager':
      return Boolean(review.managerReview?.completedAt)
    case 'acknowledgement':
      return Boolean(review.acknowledgement?.acknowledged)
    case 'rating_scale':
      return Boolean(review.managerReview?.completedAt)
    default:
      return false
  }
}

export function getWorkflowStepStates(
  cycle: ReviewCycle,
  review: PerformanceReview,
): { step: WorkflowStep; state: WorkflowStepState }[] {
  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  const enabled = getEnabledWorkflowSteps(workflow)
  const current = getCurrentWorkflowStep(cycle, review)

  return enabled.map((step) => {
    if (review.status === 'completed' || isWorkflowStepComplete(step, review)) {
      return { step, state: 'complete' as const }
    }
    if (current?.id === step.id) {
      return { step, state: 'current' as const }
    }
    return { step, state: 'pending' as const }
  })
}

/** First enabled workflow step that is not yet complete for this review. */
export function getCurrentWorkflowStep(
  cycle: ReviewCycle,
  review: PerformanceReview,
): WorkflowStep | undefined {
  if (review.status === 'completed') return undefined

  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  const enabled = getEnabledWorkflowSteps(workflow)

  for (const step of enabled) {
    if (!isWorkflowStepComplete(step, review)) return step
  }
  return undefined
}

/** Due date for the review's current workflow stage (step deadline, or cycle end date). */
export function getCurrentStageDeadline(
  cycle: ReviewCycle,
  review: PerformanceReview,
): string | undefined {
  const step = getCurrentWorkflowStep(cycle, review)
  if (!step) return undefined
  const deadline = step.deadline?.trim()
  return deadline || cycle.dueDate
}

/** Human-readable label for the current stage due date, e.g. "Manager review due Nov 30, 2025". */
export function formatCurrentStageDue(cycle: ReviewCycle, review: PerformanceReview): string | null {
  const step = getCurrentWorkflowStep(cycle, review)
  if (!step) return null
  const deadline = getCurrentStageDeadline(cycle, review)
  if (!deadline) return null
  return `${WORKFLOW_STEP_LABELS[step.type]} due ${formatDate(deadline)}`
}

/** Whether the current viewer should take action on this review's open stage. */
export function isReviewActionRequired(
  review: PerformanceReview,
  context?: { personId?: string },
): boolean {
  if (review.status === 'completed') return false

  const { personId } = context ?? {}
  if (!personId) return false

  if (personId === review.employeeId) {
    return review.status === 'self_eval_pending' || review.status === 'acknowledgement_pending'
  }

  if (personId === review.managerId) {
    return review.status === 'manager_pending'
  }

  return false
}
