import type { PerformanceReview } from '../types'

/** Employees may read manager feedback only during acceptance or after the review is completed. */
export function employeeCanViewManagerReviewContent(
  review: PerformanceReview,
  viewerPersonId: string,
): boolean {
  if (review.employeeId !== viewerPersonId) return true
  return review.status === 'acknowledgement_pending' || review.status === 'completed'
}
