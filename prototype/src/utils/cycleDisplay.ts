import type { ReviewCycle, WorkflowStep } from '../types'
import {
  getEnabledWorkflowSteps,
  stepDeadlineOrCycleEnd,
  workflowFromLegacy,
} from './workflow'

/** ISO date (YYYY-MM-DD) when the cycle was published (launched). */
export function getCycleDisplayStartDate(cycle: ReviewCycle): string {
  if (cycle.publishedAt) return cycle.publishedAt
  if (cycle.status === 'active' || cycle.status === 'completed') {
    return cycle.startDate
  }
  return ''
}

/** Due date for the last enabled step in the workflow flow order. */
export function getCycleDisplayEndDate(cycle: ReviewCycle): string {
  const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  const enabled = getEnabledWorkflowSteps(workflow)
  const last = enabled.at(-1)
  return stepDeadlineOrCycleEnd(cycle, last)
}

/** Persisted cycle end date from workflow (last step deadline, else fallback). */
export function computeCycleDueDateFromWorkflow(
  workflow: WorkflowStep[],
  fallback: string,
): string {
  const enabled = getEnabledWorkflowSteps(workflow)
  const last = enabled.at(-1)
  const fromLast = last?.deadline?.trim()
  if (fromLast) return fromLast
  return fallback
}
