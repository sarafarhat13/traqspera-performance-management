import type { Question, RatingScaleConfig } from '../types'

export function questionWeightAnswerKey(questionId: string): string {
  return `${questionId}__weight`
}

export function questionRatingAnswerKey(questionId: string): string {
  return `${questionId}__rating`
}

/** Weight shown in summaries: saved answer first, then template default. */
export function displayQuestionWeight(q: Question, answers?: Record<string, string>): string | undefined {
  const raw = answers?.[questionWeightAnswerKey(q.id)]?.trim()
  if (raw) return `${raw}%`
  if (q.weight > 0) return `${q.weight}%`
  return undefined
}

export function formatQuestionRatingAnswer(
  raw: string | undefined,
  ratingScale: RatingScaleConfig,
): string | undefined {
  if (!raw?.trim()) return undefined
  const rating = Number(raw)
  if (!Number.isFinite(rating)) return undefined
  if (rating < ratingScale.min || rating > ratingScale.max) return String(rating)
  const label = ratingScale.labels[rating - ratingScale.min]
  return label ? `${rating} — ${label}` : String(rating)
}

export function seedQuestionAnswerKeys(
  questions: Question[],
  existing?: Record<string, string>,
): Record<string, string> {
  const seed: Record<string, string> = { ...existing }
  questions.forEach((q) => {
    if (seed[q.id] === undefined) seed[q.id] = ''
    if (seed[questionWeightAnswerKey(q.id)] === undefined) {
      seed[questionWeightAnswerKey(q.id)] = q.weight > 0 ? String(q.weight) : ''
    }
    if (seed[questionRatingAnswerKey(q.id)] === undefined) {
      seed[questionRatingAnswerKey(q.id)] = ''
    }
  })
  return seed
}

export function questionScoringMetaLabel(q: Question, answers?: Record<string, string>): string | undefined {
  const parts: string[] = []
  const weight = displayQuestionWeight(q, answers)
  if (weight) parts.push(`Weight ${weight}`)
  else if (q.weight > 0) parts.push(`Default ${q.weight}%`)
  parts.push('Editable in review')
  if (q.required) parts.push('Required')
  return parts.join(' · ')
}
