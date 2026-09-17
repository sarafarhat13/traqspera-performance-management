import type { Person, ReviewCycle, ReviewEmployeeGroup } from '../types'

const ASSIGNABLE_CYCLE_STATUSES: ReviewCycle['status'][] = ['active', 'draft']

export function getEmployeeIdsInReviewGroups(groups: ReviewEmployeeGroup[]): Set<string> {
  const ids = new Set<string>()
  for (const group of groups) {
    for (const memberId of group.memberIds) {
      ids.add(memberId)
    }
  }
  return ids
}

export function getEmployeeIdsInAssignableCycles(cycles: ReviewCycle[]): Set<string> {
  const ids = new Set<string>()
  for (const cycle of cycles) {
    if (!ASSIGNABLE_CYCLE_STATUSES.includes(cycle.status)) continue
    for (const employeeId of cycle.employeeIds) {
      ids.add(employeeId)
    }
  }
  return ids
}

/** Employees not in any review group and not on any active or draft review cycle. */
export function getUnassignedEmployees(
  people: Person[],
  reviewGroups: ReviewEmployeeGroup[],
  cycles: ReviewCycle[],
): Person[] {
  const inGroup = getEmployeeIdsInReviewGroups(reviewGroups)
  const inCycle = getEmployeeIdsInAssignableCycles(cycles)
  return people.filter(
    (person) =>
      person.role === 'employee' && !inGroup.has(person.id) && !inCycle.has(person.id),
  )
}
