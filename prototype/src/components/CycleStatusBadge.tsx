import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { CycleStatus } from '../types'
import { CYCLE_STATUS_LABELS, cycleStatusBadgeColor, statusBadgeCustomClass } from '../utils/status'

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  const color = cycleStatusBadgeColor(status)

  return (
    <ModusWcBadge
      variant="outlined"
      color={color}
      size="sm"
      customClass={statusBadgeCustomClass(color)}
    >
      {CYCLE_STATUS_LABELS[status]}
    </ModusWcBadge>
  )
}
