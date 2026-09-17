import type { PerformanceReview, Person, ReviewCycle } from '../types'
import { getCycleReviews } from './cycleStats'

export function finalApproverCandidatePeople(people: Person[]): Person[] {
  return people
    .filter((person) => person.role === 'hr_admin' || person.role === 'manager')
    .sort((a, b) => a.name.localeCompare(b.name))
}

export function cycleParticipantReviewsComplete(
  cycle: ReviewCycle,
  reviews: PerformanceReview[],
): boolean {
  const cycleReviews = getCycleReviews(cycle.id, reviews)
  if (cycleReviews.length === 0) return false
  return cycleReviews.every((review) => review.status === 'completed')
}

export function canCompleteReviewCycle(
  cycle: ReviewCycle,
  reviews: PerformanceReview[],
): boolean {
  if (cycle.status !== 'active') return false
  if (!cycle.finalApproverId) return false
  return cycleParticipantReviewsComplete(cycle, reviews)
}
