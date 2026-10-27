import { ModusWcIcon } from '@trimble-oss/moduswebcomponents-react'

export type DashboardViewMode = 'card' | 'table'

type DashboardViewModeSegmentedControlProps = {
  value: DashboardViewMode
  onChange: (mode: DashboardViewMode) => void
  className?: string
}

export function DashboardViewModeSegmentedControl({
  value,
  onChange,
  className,
}: DashboardViewModeSegmentedControlProps) {
  const rootClass = ['tq-segmented-control', 'tq-dashboard-view-segment', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass} role="radiogroup" aria-label="View mode">
      <span
        className="tq-segmented-control__thumb"
        aria-hidden="true"
        data-active-index={value === 'table' ? 1 : 0}
      />
      <button
        type="button"
        role="radio"
        aria-checked={value === 'card'}
        aria-label="Card view"
        className="tq-segmented-control__option"
        onClick={() => onChange('card')}
      >
        <ModusWcIcon name="view_grid" size="sm" decorative />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'table'}
        aria-label="Table view"
        className="tq-segmented-control__option"
        onClick={() => onChange('table')}
      >
        <ModusWcIcon name="view_list" size="sm" decorative />
      </button>
    </div>
  )
}
