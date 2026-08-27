import type { PerformanceReview, Person } from '../types'

export function isViewingSelf(
  activePersonId: string,
  selectedPersonId?: string | null,
): boolean {
  return selectedPersonId !== null && selectedPersonId !== undefined && selectedPersonId === activePersonId
}

export function isManagerOf(
  activePersonId: string,
  employeeId: string,
  people: Person[],
): boolean {
  const employee = people.find((p) => p.id === employeeId)
  return employee?.managerId === activePersonId
}

export function isReviewEmployee(activePersonId: string, review: PerformanceReview): boolean {
  return review.employeeId === activePersonId
}

export function isReviewManager(activePersonId: string, review: PerformanceReview): boolean {
  return review.managerId === activePersonId
}
