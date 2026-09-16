import type { ReviewCycle } from '../types'

/** Review cycles in `active` status that include this employee as a participant. */
export function getActiveCyclesForEmployee(
  employeeId: string,
  cycles: ReviewCycle[],
): ReviewCycle[] {
  return cycles.filter(
    (cycle) => cycle.status === 'active' && cycle.employeeIds.includes(employeeId),
  )
}
