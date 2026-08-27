import { useState, type DragEvent } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcCheckbox,
  ModusWcIcon,
  ModusWcTextInput,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { createEmptyQuestion } from '../data/seed'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import type { Question, ReviewTemplate } from '../types'
import { readInputChecked, readInputString } from '../utils/modusFormEvents'
import { TagBadge } from './TagBadge'

export type CreateTemplateFormProps = {
  draft: ReviewTemplate
  onDraftChange: (draft: ReviewTemplate) => void
  onCancel: () => void
  onSubmit: () => void
  submitLabel?: string
  submitDisabled?: boolean
}

function moveQuestionToIndex(questions: Question[], sourceId: string, targetIndex: number): Question[] {
  const fromIndex = questions.findIndex((q) => q.id === sourceId)
  if (fromIndex < 0 || fromIndex === targetIndex) return questions
  const next = [...questions]
  const [item] = next.splice(fromIndex, 1)
  next.splice(targetIndex, 0, item)
  return next.map((q, i) => ({ ...q, order: i + 1 }))
}

function reorderQuestions(
  questions: Question[],
  id: string,
  direction: 'up' | 'down',
): Question[] {
  const index = questions.findIndex((q) => q.id === id)
  if (index < 0) return questions
  const target = direction === 'up' ? index - 1 : index + 1
  if (target < 0 || target >= questions.length) return questions
  const next = [...questions]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next.map((q, i) => ({ ...q, order: i + 1 }))
}

export function isCreateTemplateValid(draft: ReviewTemplate): boolean {
  return (
    draft.name.trim().length > 0 &&
    draft.description.trim().length > 0 &&
    draft.questions.some((q) => q.label.trim().length > 0)
  )
}

export function CreateTemplateForm({
  draft,
  onDraftChange,
  onCancel,
  onSubmit,
  submitLabel = 'Create Template',
  submitDisabled,
}: CreateTemplateFormProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const updateQuestion = (id: string, patch: Partial<Question>) => {
    onDraftChange({
      ...draft,
      questions: draft.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)),
    })
  }

  const addQuestion = () => {
    if (draft.questions.length >= 10) return
    onDraftChange({
      ...draft,
      questions: [...draft.questions, createEmptyQuestion(draft.questions.length + 1)],
    })
  }

  const removeQuestion = (id: string) => {
    if (draft.questions.length <= 1) return
    onDraftChange({
      ...draft,
      questions: draft.questions
        .filter((q) => q.id !== id)
        .map((q, i) => ({ ...q, order: i + 1 })),
    })
  }

  const moveQuestion = (id: string, direction: 'up' | 'down') => {
    onDraftChange({
      ...draft,
      questions: reorderQuestions(draft.questions, id, direction),
    })
  }

  const handleDragStart = (event: DragEvent<HTMLButtonElement>, id: string) => {
    setDraggingId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setDragOverId(null)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, id: string) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dragOverId !== id) setDragOverId(id)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain') || draggingId
    if (!sourceId || sourceId === targetId) {
      handleDragEnd()
      return
    }
    const targetIndex = draft.questions.findIndex((q) => q.id === targetId)
    if (targetIndex < 0) {
      handleDragEnd()
      return
    }
    onDraftChange({
      ...draft,
      questions: moveQuestionToIndex(draft.questions, sourceId, targetIndex),
    })
    handleDragEnd()
  }

  const questionCount = draft.questions.length
  const submitBlocked = submitDisabled ?? !isCreateTemplateValid(draft)

  return (
    <div className="tq-create-template flex flex-col gap-3">
      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <ModusWcTypography
          slot="title"
          hierarchy="h4"
          size="md"
          weight="semibold"
          label="Template Information"
        />
        <div className="flex max-w-3xl flex-col gap-3">
          <ModusWcTextInput
            label="Template Name *"
            size="sm"
            required
            value={draft.name}
            placeholder="e.g., Annual Performance Review"
            onInputChange={(e) =>
              onDraftChange({ ...draft, name: readInputString(e as CustomEvent) })
            }
          />
          <ModusWcTextarea
            label="Description *"
            rows={3}
            required
            value={draft.description}
            placeholder="Describe the purpose and scope of this review template"
            onInputChange={(e) =>
              onDraftChange({ ...draft, description: readInputString(e as CustomEvent) })
            }
          />
        </div>
      </ModusWcCard>

      <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
        <div slot="title" className="tq-create-template__questions-header">
          <div className="min-w-0">
            <ModusWcTypography
              hierarchy="h4"
              size="md"
              weight="semibold"
              customClass="!m-0"
              label="Review Questions"
            />
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="!m-0 mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
              label="Add up to 10 questions with optional weights and rating scales"
            />
          </div>
          <TagBadge label={`${questionCount}/10 questions`} color="warning" />
        </div>

        <div className="flex flex-col gap-3">
          {draft.questions.map((q, index) => (
            <div
              key={q.id}
              className={[
                'tq-create-template-question',
                draggingId === q.id ? 'tq-create-template-question--dragging' : '',
                dragOverId === q.id && draggingId !== q.id
                  ? 'tq-create-template-question--drag-over'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={(event) => handleDragOver(event, q.id)}
              onDrop={(event) => handleDrop(event, q.id)}
            >
              <button
                type="button"
                className="tq-create-template-question__handle"
                draggable
                aria-label={`Drag to reorder question ${index + 1}`}
                onDragStart={(event) => handleDragStart(event, q.id)}
                onDragEnd={handleDragEnd}
              >
                <ModusWcIcon name="drag_indicator" size="sm" decorative />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  weight="semibold"
                  customClass="!m-0 tabular-nums"
                  label={String(index + 1)}
                />
              </button>

              <div className="tq-create-template-question__body min-w-0">
                <ModusWcTextInput
                  label="Question Text"
                  size="sm"
                  value={q.label}
                  placeholder="Enter your review question here..."
                  onInputChange={(e) =>
                    updateQuestion(q.id, { label: readInputString(e as CustomEvent) })
                  }
                />
                <div className="tq-create-template-question__options">
                  <ModusWcCheckbox
                    label="This question is required"
                    size="sm"
                    value={q.required}
                    onInputChange={(e) =>
                      updateQuestion(q.id, { required: readInputChecked(e as CustomEvent) })
                    }
                  />
                  <ModusWcCheckbox
                    label="Enable weight (value set during review)"
                    size="sm"
                    value={Boolean(q.enableWeight)}
                    onInputChange={(e) =>
                      updateQuestion(q.id, { enableWeight: readInputChecked(e as CustomEvent) })
                    }
                  />
                  <ModusWcCheckbox
                    label="Enable rating scale (value set during review)"
                    size="sm"
                    value={Boolean(q.enableRatingScale)}
                    onInputChange={(e) =>
                      updateQuestion(q.id, {
                        enableRatingScale: readInputChecked(e as CustomEvent),
                      })
                    }
                  />
                </div>
              </div>

              <div className="tq-create-template-question__actions">
                <ModusWcButton
                  variant="borderless"
                  color="tertiary"
                  size="xs"
                  shape="square"
                  aria-label={`Move question ${index + 1} up`}
                  disabled={index === 0}
                  onButtonClick={() => moveQuestion(q.id, 'up')}
                >
                  <ModusWcIcon name="chevron_up" size="xs" decorative />
                </ModusWcButton>
                <ModusWcButton
                  variant="borderless"
                  color="tertiary"
                  size="xs"
                  shape="square"
                  aria-label={`Move question ${index + 1} down`}
                  disabled={index === draft.questions.length - 1}
                  onButtonClick={() => moveQuestion(q.id, 'down')}
                >
                  <ModusWcIcon name="chevron_down" size="xs" decorative />
                </ModusWcButton>
                <ModusWcButton
                  variant="borderless"
                  color="danger"
                  size="xs"
                  shape="square"
                  aria-label={`Delete question ${index + 1}`}
                  disabled={draft.questions.length <= 1}
                  onButtonClick={() => removeQuestion(q.id)}
                >
                  <ModusWcIcon name="delete" size="xs" decorative />
                </ModusWcButton>
              </div>
            </div>
          ))}

          <div className="flex justify-center pt-1">
            <ModusWcButton
              variant="borderless"
              color="tertiary"
              size="sm"
              disabled={draft.questions.length >= 10}
              onButtonClick={addQuestion}
            >
              <ModusWcIcon name="add" size="xs" decorative />
              Add Question
            </ModusWcButton>
          </div>
        </div>
      </ModusWcCard>

      <div className="flex flex-wrap justify-end gap-2">
        <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={onCancel}>
          Cancel
        </ModusWcButton>
        <ModusWcButton
          variant="filled"
          color="primary"
          size="sm"
          disabled={submitBlocked}
          onButtonClick={onSubmit}
        >
          {submitLabel}
        </ModusWcButton>
      </div>
    </div>
  )
}
