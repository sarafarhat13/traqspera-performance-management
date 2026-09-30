import {
  ModusWcButton,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ISelectOption } from '@trimble-oss/moduswebcomponents'
import type { RatingScaleConfig } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import {
  RATING_SCALE_POINT_COUNTS,
  ratingScalePointCount,
  resetRatingScaleToDefaults,
  setRatingScalePointCount,
  updateRatingScaleLabel,
  type RatingScalePointCount,
} from '../utils/ratingScale'

type RatingScaleConfigEditorProps = {
  ratingScale: RatingScaleConfig
  onChange: (scale: RatingScaleConfig) => void
}

const POINT_COUNT_OPTIONS: ISelectOption[] = RATING_SCALE_POINT_COUNTS.map((count) => ({
  label: `${count} levels (1–${count} stars)`,
  value: String(count),
}))

export function RatingScaleConfigEditor({
  ratingScale,
  onChange,
}: RatingScaleConfigEditorProps) {
  const pointCount = ratingScalePointCount(ratingScale)
  const resolvedCount = RATING_SCALE_POINT_COUNTS.includes(pointCount as RatingScalePointCount)
    ? (pointCount as RatingScalePointCount)
    : 5

  const handlePointCountChange = (value: string) => {
    const next = Number(value)
    if (!RATING_SCALE_POINT_COUNTS.includes(next as RatingScalePointCount)) return
    onChange(setRatingScalePointCount(ratingScale, next as RatingScalePointCount))
  }

  const handleReset = () => {
    onChange(resetRatingScaleToDefaults(resolvedCount))
  }

  return (
    <div className="tq-rating-scale-editor flex flex-col gap-3">
      <ModusWcTypography
        hierarchy="p"
        size="xs"
        weight="semibold"
        customClass="!m-0"
        label="Customize rating labels"
      />
      <ModusWcTypography
        hierarchy="p"
        size="xs"
        customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
        label="Managers see these names on each star level. Ratings stay optional at submit time."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <ModusWcSelect
          label="Number of levels"
          size="sm"
          value={String(resolvedCount)}
          options={POINT_COUNT_OPTIONS}
          onInputChange={(e) => handlePointCountChange(readInputString(e as CustomEvent))}
        />
        <div className="flex items-end justify-start sm:justify-end">
          <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={handleReset}>
            Reset labels to defaults
          </ModusWcButton>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {ratingScale.labels.map((label, index) => {
          const level = ratingScale.min + index
          return (
            <ModusWcTextInput
              key={`rating-label-${level}`}
              label={`${level}-star label`}
              size="sm"
              value={label}
              required
              onInputChange={(e) =>
                onChange(updateRatingScaleLabel(ratingScale, index, readInputString(e as CustomEvent)))
              }
            />
          )
        })}
      </div>
    </div>
  )
}
