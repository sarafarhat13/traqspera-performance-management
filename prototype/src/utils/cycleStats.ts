import type { PerformanceReview, ReviewCycle } from '../types'

export interface CycleStats {
  totalEmployees: number
  completed: number
  pending: number
  overdue: number
  percentComplete: number
}

function isOverdueReview(review: PerformanceReview, dueDate: string, now: Date): boolean {
  if (review.status === 'completed') return false
  const due = new Date(dueDate)
  due.setHours(23, 59, 59, 999)
  return due < now
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
  let overdue = 0

  for (const review of cycleReviews) {
    if (review.status === 'completed') {
      completed += 1
      continue
    }
    if (isOverdueReview(review, cycle.dueDate, now)) {
      overdue += 1
    } else {
      pending += 1
    }
  }

  const tracked = cycleReviews.length
  const percentComplete =
    tracked > 0 ? Math.round((completed / tracked) * 100) : 0

  return {
    totalEmployees,
    completed,
    pending,
    overdue,
    percentComplete,
  }
}
