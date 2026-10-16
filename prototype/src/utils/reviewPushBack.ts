import type { PerformanceReview, Person, ReviewCycle, ReviewStatus } from '../types'
import {
  cycleIncludesSelfEvaluation,
  cycleUsesParallelKickoff,
} from './workflow'
import { isManagerOf } from './viewerContext'

const RETURNABLE_STATUSES: ReviewStatus[] = [
  'completed',
  'acknowledgement_pending',
  'manager_pending',
  'parallel_review_pending',
]

/** Employee already submitted self-eval; review is with the manager (or parallel kickoff). */
function isManagerPhaseReturn(review: PerformanceReview): boolean {
  return review.status === 'manager_pending' || review.status === 'parallel_review_pending'
}

/** Status to use when sending a review back for employee self-evaluation rework. */
export function statusForEmployeeRework(cycle: ReviewCycle): ReviewStatus | null {
  if (!cycleIncludesSelfEvaluation(cycle)) return null
  if (cycleUsesParallelKickoff(cycle)) return 'parallel_review_pending'
  return 'self_eval_pending'
}

export function canReturnReviewToEmployee(
  review: PerformanceReview,
  cycle: ReviewCycle | undefined,
  viewer: Person | undefined,
  people: Person[],
): boolean {
  if (!cycle || !viewer) return false
  if (cycle.status !== 'active') return false
  if (!RETURNABLE_STATUSES.includes(review.status)) return false
  if (isManagerPhaseReturn(review) && !review.selfEval?.completedAt) return false
  if (!statusForEmployeeRework(cycle)) return false

  if (viewer.role === 'hr_admin') return true
  if (viewer.role !== 'manager') return false

  return (
    review.managerId === viewer.id ||
    isManagerOf(viewer.id, review.employeeId, people)
  )
}
