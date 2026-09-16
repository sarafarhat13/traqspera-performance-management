import {
  ModusWcNumberInput,
  ModusWcRating,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { DEFAULT_RATING_SCALE } from '../data/seed'
import type { Question, RatingScaleConfig } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import {
  displayQuestionWeight,
  formatQuestionRatingAnswer,
  questionRatingAnswerKey,
  questionWeightAnswerKey,
} from '../utils/questionReview'

type ReviewQuestionMetaProps = {
  question: Question
  answers?: Record<string, string>
}

/** Read-only hint under a question title (template default vs current values). */
export function ReviewQuestionMeta({ question, answers }: ReviewQuestionMetaProps) {
  const currentWeight = displayQuestionWeight(question, answers)
  const templateHint =
    question.weight > 0 ? `Template default ${question.weight}%` : undefined
  const label = [currentWeight ? `Weight ${currentWeight}` : templateHint, 'You can change weight and rating for this question']
    .filter(Boolean)
    .join(' · ')

  return (
    <ModusWcTypography
      hierarchy="p"
      size="xs"
      customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
      label={label}
    />
  )
}

type ReviewQuestionScoringInputsProps = {
  question: Question
  ratingScale?: RatingScaleConfig
  answers: Record<string, string>
  onAnswersChange: (next: Record<string, string>) => void
  /** Prefix for field labels when the same question appears in manager vs employee context. */
  fieldLabelPrefix?: string
}

export function ReviewQuestionScoringInputs({
  question,
  ratingScale = DEFAULT_RATING_SCALE,
  answers,
  onAnswersChange,
  fieldLabelPrefix = '',
}: ReviewQuestionScoringInputsProps) {
  const prefix = fieldLabelPrefix ? `${fieldLabelPrefix} ` : ''
  const weightKey = questionWeightAnswerKey(question.id)
  const ratingKey = questionRatingAnswerKey(question.id)

  const ratingValue = Number(answers[ratingKey] ?? 0)
  const count = ratingScale.max - ratingScale.min + 1
  const selectedLabel =
    ratingValue >= ratingScale.min && ratingValue <= ratingScale.max
      ? ratingScale.labels[ratingValue - ratingScale.min]
      : undefined

  return (
    <div className="flex flex-col gap-3">
      <ModusWcNumberInput
        label={`${prefix}Weight (%)`}
        size="sm"
        min={0}
        max={100}
        value={answers[weightKey] ?? (question.weight > 0 ? String(question.weight) : '')}
        aria-label={`${prefix}Weight for ${question.label}`}
        onInputChange={(e) =>
          onAnswersChange({
            ...answers,
            [weightKey]: readInputString(e as CustomEvent),
          })
        }
      />

      <div className="flex flex-col gap-2 rounded-lg border border-[var(--modus-wc-color-base-200)] bg-[var(--modus-wc-color-base-100)] p-3">
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          weight="semibold"
          customClass="!m-0"
          label={`${prefix}Rating scale`}
        />
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={`${ratingScale.min} (${ratingScale.labels[0]}) – ${ratingScale.max} (${ratingScale.labels[ratingScale.labels.length - 1]})`}
        />
        <ModusWcRating
          variant="star"
          count={count}
          value={ratingValue}
          size="sm"
          aria-label={`${prefix}Rating for ${question.label}`}
          getAriaLabelText={(ratingVal) =>
            ratingScale.labels[ratingVal - ratingScale.min] ?? `Rating ${ratingVal}`
          }
          onRatingChange={(e: CustomEvent<{ newRating: number }>) =>
            onAnswersChange({
              ...answers,
              [ratingKey]: String(e.detail.newRating),
            })
          }
        />
        {selectedLabel && (
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="!m-0 text-[var(--modus-wc-color-primary)]"
            label={`${ratingValue} — ${selectedLabel}`}
          />
        )}
      </div>
    </div>
  )
}

type ReviewQuestionScoringSummaryProps = {
  question: Question
  answers?: Record<string, string>
  ratingScale?: RatingScaleConfig
}

/** Completed review: show captured weight and rating under the answer. */
export function ReviewQuestionScoringSummary({
  question,
  answers,
  ratingScale = DEFAULT_RATING_SCALE,
}: ReviewQuestionScoringSummaryProps) {
  const parts: string[] = []
  const weight = displayQuestionWeight(question, answers)
  if (weight) parts.push(`Weight ${weight}`)

  const ratingText = formatQuestionRatingAnswer(
    answers?.[questionRatingAnswerKey(question.id)],
    ratingScale,
  )
  if (ratingText) parts.push(`Rating ${ratingText}`)

  if (parts.length === 0) return null

  return (
    <ModusWcTypography
      hierarchy="p"
      size="xs"
      customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
      label={parts.join(' · ')}
    />
  )
}
