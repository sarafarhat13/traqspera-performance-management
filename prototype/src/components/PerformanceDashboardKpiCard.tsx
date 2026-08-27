import { ModusWcBadge, ModusWcIcon, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'

type KpiValueTone = 'primary' | 'warning' | 'danger'

type PerformanceDashboardKpiCardProps = {
  title: string
  value: number
  valueTone: KpiValueTone
  metricLabel: string
  footerLabel: string
  status: 'complete' | 'badge'
  badgeLabel?: string
  footerIcon?: string
  headerIcon?: string
}

export function PerformanceDashboardKpiCard({
  title,
  value,
  valueTone,
  metricLabel,
  footerLabel,
  status,
  badgeLabel,
  footerIcon = 'group',
  headerIcon,
}: PerformanceDashboardKpiCardProps) {
  return (
    <article className="tq-dashboard-kpi-card">
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
          <ModusWcBadge variant="outlined" color="tertiary" size="sm">
            {badgeLabel}
          </ModusWcBadge>
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
    </article>
  )
}
