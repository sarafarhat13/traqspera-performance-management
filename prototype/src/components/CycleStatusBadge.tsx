import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import type { CycleStatus } from '../types'
import { CYCLE_STATUS_LABELS, cycleStatusBadgeColor } from '../utils/status'

export function CycleStatusBadge({ status }: { status: CycleStatus }) {
  return (
    <ModusWcBadge
      variant="filled"
      color={cycleStatusBadgeColor(status)}
      size="sm"
      customClass={status === 'draft' ? 'tq-cycle-status-badge--draft' : undefined}
    >
      {CYCLE_STATUS_LABELS[status]}
    </ModusWcBadge>
  )
}
