import { DEFAULT_RATING_SCALE } from '../data/seed'
import type { RatingScaleConfig } from '../types'

export const RATING_SCALE_POINT_COUNTS = [3, 4, 5] as const
export type RatingScalePointCount = (typeof RATING_SCALE_POINT_COUNTS)[number]

const FALLBACK_LABELS_BY_COUNT: Record<RatingScalePointCount, string[]> = {
  3: ['Needs improvement', 'Meets expectations', 'Outstanding'],
  4: ['Unsatisfactory', 'Needs improvement', 'Meets expectations', 'Outstanding'],
  5: [...DEFAULT_RATING_SCALE.labels],
}

export function defaultLabelsForPointCount(pointCount: RatingScalePointCount): string[] {
  return [...(FALLBACK_LABELS_BY_COUNT[pointCount] ?? FALLBACK_LABELS_BY_COUNT[5])]
}

export function ratingScalePointCount(scale: RatingScaleConfig): number {
  return scale.max - scale.min + 1
}

export function normalizeRatingScale(scale: RatingScaleConfig): RatingScaleConfig {
  const count = ratingScalePointCount(scale)
  const labels = [...scale.labels]
  const defaults = defaultLabelsForPointCount(
    (RATING_SCALE_POINT_COUNTS.includes(count as RatingScalePointCount)
      ? count
      : 5) as RatingScalePointCount,
  )
  while (labels.length < count) {
    labels.push(defaults[labels.length] ?? `Level ${labels.length + scale.min}`)
  }
  return {
    min: scale.min,
    max: scale.max,
    labels: labels.slice(0, count),
  }
}

export function setRatingScalePointCount(
  current: RatingScaleConfig,
  pointCount: RatingScalePointCount,
): RatingScaleConfig {
  const defaults = defaultLabelsForPointCount(pointCount)
  const labels = defaults.map((fallback, index) => {
    const existing = current.labels[index]?.trim()
    return existing && existing.length > 0 ? existing : fallback
  })
  return { min: 1, max: pointCount, labels }
}

export function updateRatingScaleLabel(
  scale: RatingScaleConfig,
  index: number,
  label: string,
): RatingScaleConfig {
  const normalized = normalizeRatingScale(scale)
  const labels = [...normalized.labels]
  if (index < 0 || index >= labels.length) return normalized
  labels[index] = label
  return { ...normalized, labels }
}

export function resetRatingScaleToDefaults(pointCount: RatingScalePointCount): RatingScaleConfig {
  return {
    min: 1,
    max: pointCount,
    labels: defaultLabelsForPointCount(pointCount),
  }
}

export function formatRatingScaleSummary(scale: RatingScaleConfig): string {
  const normalized = normalizeRatingScale(scale)
  const count = ratingScalePointCount(normalized)
  const first = normalized.labels[0]?.trim() || '—'
  const last = normalized.labels[normalized.labels.length - 1]?.trim() || '—'
  return `${count} levels · ${first} → ${last}`
}

export function isRatingScaleConfigValid(scale: RatingScaleConfig): boolean {
  const normalized = normalizeRatingScale(scale)
  const count = ratingScalePointCount(normalized)
  if (!RATING_SCALE_POINT_COUNTS.includes(count as RatingScalePointCount)) return false
  return normalized.labels.every((label) => label.trim().length > 0)
}
