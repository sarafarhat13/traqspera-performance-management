import {
  ModusWcCard,
  ModusWcChip,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { EmployeeReviewerAssignment, Person } from '../types'
import {
  assignmentOptionLabel,
  sourceLabel,
  type ParticipantConflict,
  type ParticipantSource,
} from '../utils/participantSelection'
import type { ReviewEmployeeGroup } from '../types'

type ParticipantConflictPanelProps = {
  conflicts: ParticipantConflict[]
  getPerson: (id: string) => Person | undefined
  getGroup: (id: string) => ReviewEmployeeGroup | undefined
  onResolve: (employeeId: string, assignment: EmployeeReviewerAssignment) => void
}

export function ParticipantConflictPanel({
  conflicts,
  getPerson,
  getGroup,
  onResolve,
}: ParticipantConflictPanelProps) {
  if (conflicts.length === 0) return null

  return (
    <ModusWcCard bordered={false} padding="compact" customClass="border border-[var(--modus-wc-color-base-200)]">
      <ModusWcTypography
        hierarchy="h4"
        size="md"
        weight="semibold"
        label={`Reviewer conflicts (${conflicts.length})`}
      />
      <ModusWcTypography
        hierarchy="p"
        size="sm"
        customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
        label="These employees were added more than once with different reviewers. Choose one reviewer for each person."
      />
      <ul className="mt-3 flex list-none flex-col gap-4 p-0">
        {conflicts.map((conflict) => {
          const person = getPerson(conflict.employeeId)
          const headingId = `conflict-${conflict.employeeId}`
          return (
            <li key={conflict.employeeId} className="flex flex-col gap-2">
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                weight="semibold"
                customClass="!m-0"
                label={person?.name ?? conflict.employeeId}
              />
              {person ? (
                <ModusWcTypography
                  hierarchy="p"
                  size="xs"
                  customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={person.department}
                />
              ) : null}
              <div className="flex flex-wrap gap-2" role="list">
                {conflict.sources.map((source: ParticipantSource, index) => (
                  <ModusWcChip
                    key={`${conflict.employeeId}-src-${index}`}
                    label={sourceLabel(source, getGroup)}
                    size="sm"
                    variant="filled"
                  />
                ))}
              </div>
              <div
                role="radiogroup"
                aria-labelledby={headingId}
                className="flex flex-col gap-2"
              >
                <span id={headingId} className="sr-only">
                  Reviewer for {person?.name ?? conflict.employeeId}
                </span>
                {conflict.distinctAssignments.map((assignment) => {
                  const optionId = `${conflict.employeeId}-${assignment.type}-${assignment.customManagerId ?? ''}`
                  const label = assignmentOptionLabel(assignment, person, getPerson)
                  return (
                    <label
                      key={optionId}
                      htmlFor={optionId}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="radio"
                        id={optionId}
                        name={`reviewer-conflict-${conflict.employeeId}`}
                        onChange={() => onResolve(conflict.employeeId, assignment)}
                      />
                      <ModusWcTypography hierarchy="p" size="sm" customClass="!m-0" label={label} />
                    </label>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </ModusWcCard>
  )
}
