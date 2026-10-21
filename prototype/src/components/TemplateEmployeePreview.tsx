import { useMemo, useState } from 'react'
import {
  ModusWcCard,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import type { ReviewTemplate } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import { seedQuestionAnswerKeys } from '../utils/questionReview'

type TemplateEmployeePreviewProps = {
  template: ReviewTemplate
}

export function TemplateEmployeePreview({ template }: TemplateEmployeePreviewProps) {
  const questions = useMemo(
    () => [...template.questions].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [template.questions],
  )

  const [answers, setAnswers] = useState<Record<string, string>>(() =>
    seedQuestionAnswerKeys(questions),
  )

  return (
    <div className="tq-template-employee-preview flex flex-col gap-3">
      <div className="min-w-0">
        <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Self-evaluation" />
        {template.description.trim() ? (
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="!m-0 mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={template.description}
          />
        ) : null}
      </div>

      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <div className="flex flex-col gap-4">
          {questions.map((q, index) => (
            <div key={q.id} className="flex flex-col gap-2">
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                weight="semibold"
                label={`${index + 1}. ${q.label}${q.required ? ' *' : ''}`}
              />
              <ModusWcTextarea
                rows={3}
                value={answers[q.id] ?? ''}
                aria-label={q.label}
                placeholder="Enter your response..."
                onInputChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [q.id]: readInputString(e as CustomEvent),
                  }))
                }
              />
            </div>
          ))}
        </div>
      </ModusWcCard>
    </div>
  )
}
