import type {
  EmployeeReviewerAssignment,
  Person,
  PerformanceReview,
  ReviewerRoleType,
} from '../types'

export const REVIEWER_TYPE_OPTIONS: { label: string; value: ReviewerRoleType }[] = [
  { label: 'Crew Manager', value: 'crew_manager' },
  { label: 'Supervisor', value: 'supervisor' },
  { label: 'Custom (select manager)', value: 'custom' },
]

export function buildManagerOptions(people: Person[]): { label: string; value: string }[] {
  return people
    .filter((person) => person.role === 'manager')
    .map((person) => ({ label: person.name, value: person.id }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

export function defaultReviewerAssignment(): EmployeeReviewerAssignment {
  return { type: 'crew_manager' }
}

export function reviewerPreviewLabel(
  person: Person,
  assignment: EmployeeReviewerAssignment,
  getPerson: (id: string) => Person | undefined,
): string {
  switch (assignment.type) {
    case 'crew_manager': {
      const manager = person.managerId ? getPerson(person.managerId) : undefined
      return manager ? `Crew Manager — ${manager.name}` : 'Crew Manager'
    }
    case 'supervisor': {
      const supervisor = person.supervisorId ? getPerson(person.supervisorId) : undefined
      return supervisor ? `Supervisor — ${supervisor.name}` : 'Supervisor'
    }
    case 'custom': {
      const manager = assignment.customManagerId
        ? getPerson(assignment.customManagerId)
        : undefined
      return manager ? `Custom — ${manager.name}` : 'Custom (select manager)'
    }
    default:
      return 'Crew Manager'
  }
}

export function reviewReviewerDisplayName(
  review: PerformanceReview,
  getPerson: (id: string) => Person | undefined,
): string {
  const manager = getPerson(review.managerId)
  if (review.reviewerType === 'custom') {
    return manager ? `Custom — ${manager.name}` : review.customReviewerName?.trim() ?? '—'
  }
  if (review.reviewerType === 'supervisor') {
    return manager ? `Supervisor — ${manager.name}` : 'Supervisor'
  }
  if (review.reviewerType === 'crew_manager') {
    return manager ? `Crew Manager — ${manager.name}` : '—'
  }
  return manager?.name ?? '—'
}

export function isReviewerAssignmentValid(assignment: EmployeeReviewerAssignment): boolean {
  if (assignment.type !== 'custom') return true
  return (assignment.customManagerId?.trim() ?? '').length > 0
}
