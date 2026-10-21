import type {
  EmployeeReviewerAssignment,
  Person,
  PerformanceReview,
  ReviewerRoleType,
} from '../types'

/** Reviewer types offered in launch-cycle and review-group UI (excludes legacy `crew_manager`). */
export const REVIEWER_TYPE_OPTIONS: { label: string; value: ReviewerRoleType }[] = [
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
  return { type: 'supervisor' }
}

export function resolveEffectiveSupervisorId(
  person: Person | undefined,
  assignment: EmployeeReviewerAssignment,
): string | undefined {
  if (assignment.type !== 'supervisor') return undefined
  const override = assignment.supervisorId?.trim()
  if (override) return override
  const fromRecord = person?.supervisorId?.trim()
  return fromRecord || undefined
}

export function isSupervisorAssignmentMissing(
  person: Person | undefined,
  assignment: EmployeeReviewerAssignment,
): boolean {
  if (assignment.type !== 'supervisor') return false
  return !resolveEffectiveSupervisorId(person, assignment)
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
      const supervisorId = resolveEffectiveSupervisorId(person, assignment)
      const supervisor = supervisorId ? getPerson(supervisorId) : undefined
      return supervisor ? `Supervisor — ${supervisor.name}` : 'Supervisor (not assigned)'
    }
    case 'custom': {
      const manager = assignment.customManagerId
        ? getPerson(assignment.customManagerId)
        : undefined
      return manager ? `Custom — ${manager.name}` : 'Custom (select manager)'
    }
    default:
      return 'Supervisor'
  }
}

export function reviewerTypeLabel(reviewerType?: ReviewerRoleType): string {
  if (!reviewerType) return '—'
  return REVIEWER_TYPE_OPTIONS.find((option) => option.value === reviewerType)?.label ?? '—'
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

export function isReviewerAssignmentValid(
  assignment: EmployeeReviewerAssignment,
  person?: Person,
): boolean {
  if (assignment.type === 'custom') {
    return (assignment.customManagerId?.trim() ?? '').length > 0
  }
  if (assignment.type === 'supervisor') {
    return !isSupervisorAssignmentMissing(person, assignment)
  }
  return true
}
