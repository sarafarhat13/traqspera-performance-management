import { useCallback, useMemo, type KeyboardEvent } from 'react'
import { ModusWcCard, ModusWcIcon, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { Person, ReviewCycle, ReviewEmployeeGroup } from '../types'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { getUnassignedEmployees } from '../utils/unassignedEmployees'

type UnassignedEmployeesPanelProps = {
  people: Person[]
  reviewGroups: ReviewEmployeeGroup[]
  cycles: ReviewCycle[]
  onOpen: () => void
}

export function UnassignedEmployeesPanel({
  people,
  reviewGroups,
  cycles,
  onOpen,
}: UnassignedEmployeesPanelProps) {
  const unassigned = useMemo(
    () => getUnassignedEmployees(people, reviewGroups, cycles),
    [people, reviewGroups, cycles],
  )
  const count = unassigned.length
  const valueTone = count > 0 ? 'warning' : 'success'

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onOpen()
      }
    },
    [onOpen],
  )

  return (
    <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
      <div slot="title" className="flex w-full min-w-0 items-center justify-start gap-2 mb-4">
        <ModusWcIcon name="warning" decorative />
        <ModusWcTypography
          hierarchy="h4"
          size="md"
          weight="semibold"
          label="Unassigned employees"
        />
      </div>

      <article
        role="button"
        tabIndex={0}
        className="tq-dashboard-kpi-card tq-dashboard-kpi-card--interactive w-full text-left"
        onClick={onOpen}
        onKeyDown={handleKeyDown}
        aria-label={`${count} unassigned employees. Open list to assign groups and review cycles.`}
      >
        <div className="tq-dashboard-kpi-card__header">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            customClass="!m-0"
            label="Needs assignment"
          />
          <span className="tq-dashboard-kpi-card__status-icon" aria-hidden="true">
            <ModusWcIcon name={count > 0 ? 'warning' : 'check_circle'} size="sm" decorative />
          </span>
        </div>

        <div className="tq-dashboard-kpi-card__metric">
          <span
            className={`tq-dashboard-kpi-card__value tq-dashboard-kpi-card__value--${valueTone}`}
            aria-hidden="true"
          >
            {count}
          </span>
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="Not in a group and not on an active or draft cycle"
          />
        </div>

        <div className="tq-dashboard-kpi-card__footer">
          <ModusWcIcon name="chevron_right" size="xs" decorative />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="!m-0"
            label={count > 0 ? 'View list and assign' : 'View list'}
          />
        </div>
      </article>
    </ModusWcCard>
  )
}
