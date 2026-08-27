import { ModusWcRating, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { RatingScaleConfig } from '../types'

type PerformanceRatingScaleFieldProps = {
  ratingScale: RatingScaleConfig
  value: number
  onChange: (value: number) => void
}

export function PerformanceRatingScaleField({
  ratingScale,
  value,
  onChange,
}: PerformanceRatingScaleFieldProps) {
  const count = ratingScale.max - ratingScale.min + 1
  const selectedLabel =
    value >= ratingScale.min && value <= ratingScale.max
      ? ratingScale.labels[value - ratingScale.min]
      : undefined

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[var(--modus-wc-color-base-200)] bg-[var(--modus-wc-color-base-100)] p-4">
      <div className="flex flex-col gap-1">
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          weight="semibold"
          customClass="!m-0"
          label="Overall performance rating *"
        />
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={`Select a rating from ${ratingScale.min} (${ratingScale.labels[0]}) to ${ratingScale.max} (${ratingScale.labels[ratingScale.labels.length - 1]}).`}
        />
      </div>

      <ModusWcRating
        variant="star"
        count={count}
        value={value}
        size="md"
        aria-label="Overall performance rating"
        getAriaLabelText={(ratingValue) =>
          ratingScale.labels[ratingValue - ratingScale.min] ?? `Rating ${ratingValue}`
        }
        onRatingChange={(e: CustomEvent<{ newRating: number }>) => onChange(e.detail.newRating)}
      />

      {selectedLabel && (
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          weight="semibold"
          customClass="!m-0 text-[var(--modus-wc-color-primary)]"
          label={`${value} — ${selectedLabel}`}
        />
      )}

      <ul className="tq-rating-scale-legend" aria-label="Rating scale definitions">
        {ratingScale.labels.map((label, index) => (
          <li key={`${ratingScale.min + index}-${label}`}>
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={`${ratingScale.min + index}: ${label}`}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
