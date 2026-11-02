import { ModusWcIcon, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import { TagBadge } from './TagBadge'
import type { StatusBadgeSemanticColor } from '../utils/status'

type KpiValueTone = 'primary' | 'warning' | 'danger' | 'success'

type PerformanceDashboardKpiCardProps = {
  title: string
  value: number
  valueTone: KpiValueTone
  metricLabel: string
  footerLabel: string
  status: 'complete' | 'badge'
  badgeLabel?: string
  /** Overrides the tone used for the corner badge. The metric number still uses `valueTone`. */
  badgeColor?: StatusBadgeSemanticColor
  footerIcon?: string
  headerIcon?: string
  /** When set, the card is a toggle that filters the list below. */
  onClick?: () => void
  pressed?: boolean
}

export function PerformanceDashboardKpiCard({
  title,
  value,
  valueTone,
  metricLabel,
  footerLabel,
  status,
  badgeLabel,
  badgeColor: badgeColorProp,
  footerIcon = 'group',
  headerIcon,
  onClick,
  pressed = false,
}: PerformanceDashboardKpiCardProps) {
  const badgeColor: StatusBadgeSemanticColor =
    badgeColorProp ??
    (valueTone === 'danger'
      ? 'danger'
      : valueTone === 'warning'
        ? 'warning'
        : valueTone === 'success'
          ? 'success'
          : 'tertiary')

  const className = [
    'tq-dashboard-kpi-card',
    onClick ? 'tq-dashboard-kpi-card--interactive' : '',
    pressed ? 'tq-dashboard-kpi-card--active' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const body = (
    <>
      <div className="tq-dashboard-kpi-card__header">
        <ModusWcTypography
          hierarchy="h4"
          size="md"
          weight="semibold"
          customClass="!m-0"
          label={title}
        />
        {headerIcon ? (
          <span className="tq-dashboard-kpi-card__status-icon" aria-hidden="true">
            <ModusWcIcon name={headerIcon} size="sm" decorative />
          </span>
        ) : status === 'complete' ? (
          <span className="tq-dashboard-kpi-card__status-icon" aria-hidden="true">
            <ModusWcIcon name="check_circle" size="sm" decorative />
          </span>
        ) : (
          <TagBadge label={badgeLabel ?? ''} color={badgeColor} />
        )}
      </div>

      <div className="tq-dashboard-kpi-card__metric">
        <span
          className={`tq-dashboard-kpi-card__value tq-dashboard-kpi-card__value--${valueTone}`}
          aria-hidden="true"
        >
          {value}
        </span>
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={metricLabel}
        />
      </div>

      <div className="tq-dashboard-kpi-card__footer">
        <ModusWcIcon name={footerIcon} size="xs" decorative />
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={footerLabel}
        />
      </div>
    </>
  )

  if (onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={className}
        aria-pressed={pressed}
        aria-label={`${title}, ${value} ${metricLabel}`}
        onClick={onClick}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        }}
      >
        {body}
      </div>
    )
  }

  return <article className={className}>{body}</article>
}
