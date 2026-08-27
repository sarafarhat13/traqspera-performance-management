import { ModusWcBadge } from '@trimble-oss/moduswebcomponents-react'
import { statusBadgeCustomClass, type StatusBadgeSemanticColor } from '../utils/status'

type TagBadgeProps = {
  label: string
  color?: StatusBadgeSemanticColor
}

/** Neutral metadata labels (counts, categories, departments) — same chrome as status badges. */
export function TagBadge({ label, color = 'tertiary' }: TagBadgeProps) {
  return (
    <ModusWcBadge
      variant="outlined"
      color={color}
      size="sm"
      customClass={statusBadgeCustomClass(color)}
    >
      {label}
    </ModusWcBadge>
  )
}
