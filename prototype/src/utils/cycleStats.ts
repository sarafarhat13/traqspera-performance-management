import type { PerformanceReview, ReviewCycle } from '../types'
import { getReviewDisplayStatus } from './workflow'

export interface CycleStats {
  totalEmployees: number
  completed: number
  pending: number
  notStarted: number
  overdue: number
  percentComplete: number
}

export function getCycleReviews(
  cycleId: string,
  reviews: PerformanceReview[],
): PerformanceReview[] {
  return reviews.filter((review) => review.cycleId === cycleId)
}

export function computeCycleStats(
  cycle: ReviewCycle,
  reviews: PerformanceReview[],
  now = new Date(),
): CycleStats {
  const cycleReviews = getCycleReviews(cycle.id, reviews)
  const totalEmployees = cycle.employeeIds.length
  let completed = 0
  let pending = 0
  let notStarted = 0
  let overdue = 0

  for (const review of cycleReviews) {
    const display = getReviewDisplayStatus(cycle, review, now)
    if (display === 'complete') {
      completed += 1
      continue
    }
    if (display === 'not_started') {
      notStarted += 1
    } else {
      pending += 1
    }
    if (display === 'overdue') overdue += 1
  }

  const tracked = cycleReviews.length
  const percentComplete =
    tracked > 0 ? Math.round((completed / tracked) * 100) : 0

  return {
    totalEmployees,
    completed,
    pending,
    notStarted,
    overdue,
    percentComplete,
  }
}
