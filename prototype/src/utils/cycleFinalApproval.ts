import type { PerformanceReview, ReviewCycle } from '../types'
import { getCycleReviews } from './cycleStats'

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
  return cycleParticipantReviewsComplete(cycle, reviews)
}
