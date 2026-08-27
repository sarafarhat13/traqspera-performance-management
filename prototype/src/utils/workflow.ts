import type { DemoRole, PerformanceReview, ReviewCycle, ReviewStatus, WorkflowStep, WorkflowStepType } from '../types'
import { formatDate } from './status'

export const WORKFLOW_STEP_LABELS: Record<WorkflowStepType, string> = {
  employee: 'Self Evaluation',
  manager: 'Manager Evaluation',
  acknowledgement: 'Employee Acknowledgment',
  rating_scale: 'Scale Rating',
}

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
}

export function createDefaultWorkflowSteps(): WorkflowStep[] {
  return [
    { id: 'wf-employee', type: 'employee', enabled: true, order: 0, deadline: '' },
    { id: 'wf-manager', type: 'manager', enabled: true, order: 1, deadline: '' },
    { id: 'wf-ack', type: 'acknowledgement', enabled: true, order: 2, deadline: '' },
    { id: 'wf-rating', type: 'rating_scale', enabled: true, order: 3, deadline: '' },
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

export function cycleIncludesSelfEvaluation(cycle: ReviewCycle): boolean {
  if (cycle.workflow) return includesSelfEvaluationFromWorkflow(cycle.workflow)
  return cycle.includesSelfEvaluation
}

export function getCoreWorkflowSteps(workflow: WorkflowStep[]): WorkflowStep[] {
  return [...workflow]
    .filter((step) => CORE_WORKFLOW_STEP_TYPES.includes(step.type as CoreWorkflowStepType))
    .sort((a, b) => a.order - b.order)
}

export function getRatingScaleWorkflowStep(workflow: WorkflowStep[]): WorkflowStep | undefined {
  return workflow.find((step) => step.type === 'rating_scale')
}

export function normalizeWorkflowOrder(steps: WorkflowStep[]): WorkflowStep[] {
  const core = getCoreWorkflowSteps(steps)
  const rating = steps.find((step) => step.type === 'rating_scale')
  const ordered = rating ? [...core, rating] : core
  return ordered.map((step, index) => ({ ...step, order: index }))
}

export function resetCoreWorkflowOrder(steps: WorkflowStep[]): WorkflowStep[] {
  const defaults = createDefaultWorkflowSteps()
  const defaultCore = getCoreWorkflowSteps(defaults)
  const rating = steps.find((step) => step.type === 'rating_scale')
  const nextCore = defaultCore.map((defaultStep) => {
    const existing = steps.find((step) => step.type === defaultStep.type)
    return existing ? { ...existing, order: defaultStep.order } : defaultStep
  })
  const merged = rating ? [...nextCore, { ...rating, order: nextCore.length }] : nextCore
  return normalizeWorkflowOrder(merged)
}

export function moveCoreWorkflowStepToIndex(
  steps: WorkflowStep[],
  sourceId: string,
  targetIndex: number,
): WorkflowStep[] {
  const core = getCoreWorkflowSteps(steps)
  const fromIndex = core.findIndex((step) => step.id === sourceId)
  if (fromIndex < 0 || fromIndex === targetIndex) return steps

  const nextCore = [...core]
  const [item] = nextCore.splice(fromIndex, 1)
  nextCore.splice(targetIndex, 0, item)

  const rating = steps.find((step) => step.type === 'rating_scale')
  const merged = rating ? [...nextCore, rating] : nextCore
  return normalizeWorkflowOrder(merged)
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

function isWorkflowStepComplete(step: WorkflowStep, review: PerformanceReview): boolean {
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
  context?: { role?: DemoRole; personId?: string },
): boolean {
  if (review.status === 'completed') return false

  const { role, personId } = context ?? {}

  if (role === 'employee' && personId === review.employeeId) {
    return review.status === 'self_eval_pending' || review.status === 'acknowledgement_pending'
  }

  if (role === 'manager' && personId === review.managerId) {
    return review.status === 'manager_pending'
  }

  if (role === 'hr_admin') {
    return true
  }

  return true
}
