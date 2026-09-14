import type { Person } from '../types'

/** Default demo manager when the signed-in user has no direct reports (e.g. HR admin). */
export const DEMO_MANAGER_PERSON_ID = 'mgr-1'

export function countDirectReports(people: Person[], managerId: string): number {
  return people.filter((person) => person.managerId === managerId).length
}

/** Person id whose team roster and reviews should drive the manager dashboard. */
export function resolveManagerDashboardPersonId(
  people: Person[],
  activePersonId: string,
): string {
  if (countDirectReports(people, activePersonId) > 0) {
    return activePersonId
  }

  let bestId = DEMO_MANAGER_PERSON_ID
  let bestCount = countDirectReports(people, bestId)

  for (const person of people) {
    if (person.role !== 'manager') continue
    const count = countDirectReports(people, person.id)
    if (count > bestCount) {
      bestId = person.id
      bestCount = count
    }
  }

  return bestId
}
