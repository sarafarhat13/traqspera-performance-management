import type { EmployeeReviewerAssignment, Person, ReviewEmployeeGroup } from '../types'
import { defaultReviewerAssignment } from './reviewer'

export type ParticipantSource =
  | { kind: 'individual'; assignment: EmployeeReviewerAssignment }
  | { kind: 'group'; groupId: string; assignment: EmployeeReviewerAssignment }

export type ProvenanceMap = Record<string, ParticipantSource[]>

export function assignmentKey(assignment: EmployeeReviewerAssignment): string {
  if (assignment.type === 'custom') {
    return `custom:${assignment.customManagerId ?? ''}`
  }
  return assignment.type
}

export function assignmentsEqual(
  a: EmployeeReviewerAssignment,
  b: EmployeeReviewerAssignment,
): boolean {
  return assignmentKey(a) === assignmentKey(b)
}

export function mergeParticipantIds(...idLists: string[][]): string[] {
  return [...new Set(idLists.flat())]
}

export function computeParticipantIdsFromProvenance(provenance: ProvenanceMap): string[] {
  return Object.keys(provenance)
}

export function buildProvenanceFromState(options: {
  individualEmployeeIds: Set<string>
  individualAssignments: Record<string, EmployeeReviewerAssignment>
  attachedGroupIds: string[]
  getGroup: (id: string) => ReviewEmployeeGroup | undefined
}): ProvenanceMap {
  const { individualEmployeeIds, individualAssignments, attachedGroupIds, getGroup } = options
  const map: ProvenanceMap = {}

  const addSource = (employeeId: string, source: ParticipantSource) => {
    if (!map[employeeId]) map[employeeId] = []
    const exists = map[employeeId].some((s) => {
      if (s.kind !== source.kind) return false
      if (s.kind === 'individual' && source.kind === 'individual') return true
      if (s.kind === 'group' && source.kind === 'group') return s.groupId === source.groupId
      return false
    })
    if (!exists) map[employeeId].push(source)
  }

  attachedGroupIds.forEach((groupId) => {
    const group = getGroup(groupId)
    if (!group) return
    group.memberIds.forEach((employeeId) => {
      addSource(employeeId, {
        kind: 'group',
        groupId,
        assignment: group.defaultReviewerAssignment,
      })
    })
  })

  individualEmployeeIds.forEach((employeeId) => {
    addSource(employeeId, {
      kind: 'individual',
      assignment: individualAssignments[employeeId] ?? defaultReviewerAssignment(),
    })
  })

  return map
}

export type ParticipantConflict = {
  employeeId: string
  sources: ParticipantSource[]
  distinctAssignments: EmployeeReviewerAssignment[]
}

export function detectConflicts(
  provenance: ProvenanceMap,
  resolvedAssignments: Record<string, EmployeeReviewerAssignment>,
): ParticipantConflict[] {
  const conflicts: ParticipantConflict[] = []

  Object.entries(provenance).forEach(([employeeId, sources]) => {
    const assignmentSet = new Map<string, EmployeeReviewerAssignment>()
    sources.forEach((source) => {
      assignmentSet.set(assignmentKey(source.assignment), source.assignment)
    })
    const distinct = [...assignmentSet.values()]
    if (distinct.length <= 1) return

    const resolved = resolvedAssignments[employeeId]
    if (resolved && distinct.some((a) => assignmentsEqual(a, resolved))) {
      return
    }

    conflicts.push({
      employeeId,
      sources,
      distinctAssignments: distinct,
    })
  })

  return conflicts
}

export function applyDefaultAssignmentsFromProvenance(
  provenance: ProvenanceMap,
  existing: Record<string, EmployeeReviewerAssignment>,
): Record<string, EmployeeReviewerAssignment> {
  let changed = false
  const next = { ...existing }
  Object.entries(provenance).forEach(([employeeId, sources]) => {
    const keys = new Set(sources.map((s) => assignmentKey(s.assignment)))
    if (keys.size === 1 && !next[employeeId]) {
      next[employeeId] = sources[0].assignment
      changed = true
    }
  })
  return changed ? next : existing
}

export function sourceLabel(
  source: ParticipantSource,
  getGroup: (id: string) => ReviewEmployeeGroup | undefined,
): string {
  if (source.kind === 'individual') return 'Individual selection'
  const group = getGroup(source.groupId)
  return group ? `Group: ${group.name}` : 'Group'
}

export function assignmentOptionLabel(
  assignment: EmployeeReviewerAssignment,
  person: Person | undefined,
  getPerson: (id: string) => Person | undefined,
): string {
  if (!person) return assignment.type
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

export function recomputeAfterRemoveGroup(options: {
  removedGroupId: string
  attachedGroupIds: string[]
  individualEmployeeIds: Set<string>
  getGroup: (id: string) => ReviewEmployeeGroup | undefined
  individualAssignments: Record<string, EmployeeReviewerAssignment>
}): {
  attachedGroupIds: string[]
  participantIds: string[]
  provenance: ProvenanceMap
} {
  const attachedGroupIds = options.attachedGroupIds.filter((id) => id !== options.removedGroupId)
  const provenance = buildProvenanceFromState({
    individualEmployeeIds: options.individualEmployeeIds,
    individualAssignments: options.individualAssignments,
    attachedGroupIds,
    getGroup: options.getGroup,
  })
  return {
    attachedGroupIds,
    provenance,
    participantIds: computeParticipantIdsFromProvenance(provenance),
  }
}
