import { useState, type DragEvent } from 'react'
import {
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcDate,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { WorkflowStep, WorkflowStepType } from '../types'
import { readInputChecked, readInputString } from '../utils/modusFormEvents'
import {
  type CoreWorkflowStepType,
  type ReorderableWorkflowStepType,
  getAcknowledgementWorkflowStep,
  getEnabledWorkflowSteps,
  getRatingScaleWorkflowStep,
  getReorderableWorkflowSteps,
  moveCoreWorkflowStepToIndex,
  RATING_SCALE_STEP_META,
  resetCoreWorkflowOrder,
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEP_META,
} from '../utils/workflow'

type WorkflowStepConfigProps = {
  workflow: WorkflowStep[]
  onWorkflowChange: (steps: WorkflowStep[]) => void
}

function flowBulletClass(type: WorkflowStepType): string {
  if (type === 'rating_scale') return RATING_SCALE_STEP_META.flowBulletClass
  return WORKFLOW_STEP_META[type as CoreWorkflowStepType].flowBulletClass
}

export function WorkflowStepConfig({ workflow, onWorkflowChange }: WorkflowStepConfigProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  const reorderableSteps = getReorderableWorkflowSteps(workflow)
  const ratingStep = getRatingScaleWorkflowStep(workflow)
  const acknowledgementStep = getAcknowledgementWorkflowStep(workflow)
  const enabledFlowSteps = getEnabledWorkflowSteps(workflow)
  const ratingStepNumber = reorderableSteps.length + 1
  const acknowledgementStepNumber = reorderableSteps.length + 2

  const updateStep = (id: string, patch: Partial<WorkflowStep>) => {
    onWorkflowChange(workflow.map((step) => (step.id === id ? { ...step, ...patch } : step)))
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
    const targetIndex = reorderableSteps.findIndex((step) => step.id === targetId)
    if (targetIndex < 0) {
      handleDragEnd()
      return
    }
    onWorkflowChange(moveCoreWorkflowStepToIndex(workflow, sourceId, targetIndex))
    handleDragEnd()
  }

  return (
    <div className="tq-workflow-config flex flex-col gap-4">
      <div className="tq-workflow-config__header">
        <div className="flex min-w-0 items-center gap-2">
          <ModusWcIcon name="settings" size="sm" decorative />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            customClass="!m-0"
            label="Configure review components, set due dates, and arrange the step order"
          />
        </div>
        <ModusWcButton
          variant="outlined"
          color="tertiary"
          size="sm"
          onButtonClick={() => onWorkflowChange(resetCoreWorkflowOrder(workflow))}
        >
          <ModusWcIcon name="refresh" size="xs" decorative />
          Reset Order
        </ModusWcButton>
      </div>

      <div className="tq-workflow-config__hint" role="note">
        <ModusWcIcon name="drag_indicator" size="sm" decorative />
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label="Drag Self Evaluation and Manager Evaluation to reorder them. Scale Rating and Employee Acknowledgment stay fixed at the end."
        />
      </div>

      <div className="flex flex-col gap-3">
        {reorderableSteps.map((step, index) => {
          const stepType = step.type as ReorderableWorkflowStepType
          const meta = WORKFLOW_STEP_META[stepType]
          const isDraggable = step.enabled

          return (
            <div
              key={step.id}
              className={[
                'tq-workflow-step',
                'tq-workflow-step--handle-end',
                draggingId === step.id ? 'tq-workflow-step--dragging' : '',
                dragOverId === step.id && draggingId !== step.id
                  ? 'tq-workflow-step--drag-over'
                  : '',
                !step.enabled ? 'tq-workflow-step--disabled' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onDragOver={isDraggable ? (event) => handleDragOver(event, step.id) : undefined}
              onDrop={isDraggable ? (event) => handleDrop(event, step.id) : undefined}
            >
              <div className="tq-workflow-step__top">
                <ModusWcCheckbox
                  size="sm"
                  value={step.enabled}
                  aria-label={`Include ${meta.title}`}
                  onInputChange={(e) =>
                    updateStep(step.id, { enabled: readInputChecked(e as CustomEvent) })
                  }
                />

                <span className={`tq-workflow-step__icon tq-workflow-step__icon--${stepType}`}>
                  <ModusWcIcon name={meta.icon} size="sm" decorative />
                </span>

                <div className="tq-workflow-step__copy min-w-0 flex-1">
                  <ModusWcTypography
                    hierarchy="p"
                    size="md"
                    weight="semibold"
                    customClass="!m-0"
                    label={meta.title}
                  />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="!m-0 mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
                    label={meta.description}
                  />
                </div>

                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!m-0 shrink-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={`Step ${index + 1}`}
                />

                {isDraggable ? (
                  <button
                    type="button"
                    className="tq-workflow-step__handle"
                    draggable
                    aria-label={`Drag to reorder ${meta.title}`}
                    onDragStart={(event) => handleDragStart(event, step.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <ModusWcIcon name="drag_indicator" size="sm" decorative />
                  </button>
                ) : null}
              </div>

              <div className="tq-workflow-step__due">
                <ModusWcDate
                  label={meta.dueDateLabel}
                  size="sm"
                  value={step.deadline}
                  onInputChange={(e) =>
                    updateStep(step.id, { deadline: readInputString(e as CustomEvent) })
                  }
                />
              </div>
            </div>
          )
        })}

        {ratingStep && (
          <div className="tq-workflow-step tq-workflow-step--rating tq-workflow-step--no-handle">
            <div className="tq-workflow-step__top">
              <ModusWcCheckbox
                size="sm"
                value={ratingStep.enabled}
                aria-label={`Include ${RATING_SCALE_STEP_META.title}`}
                onInputChange={(e) =>
                  updateStep(ratingStep.id, { enabled: readInputChecked(e as CustomEvent) })
                }
              />

              <span className="tq-workflow-step__icon tq-workflow-step__icon--rating_scale">
                <ModusWcIcon name={RATING_SCALE_STEP_META.icon} size="sm" decorative />
              </span>

              <div className="tq-workflow-step__copy min-w-0 flex-1">
                <ModusWcTypography
                  hierarchy="p"
                  size="md"
                  weight="semibold"
                  customClass="!m-0"
                  label={RATING_SCALE_STEP_META.title}
                />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!m-0 mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={RATING_SCALE_STEP_META.description}
                />
              </div>

              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="!m-0 shrink-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={`Step ${ratingStepNumber}`}
              />
            </div>
          </div>
        )}

        {acknowledgementStep && (
          <div className="tq-workflow-step tq-workflow-step--acknowledgement tq-workflow-step--no-handle">
            <div className="tq-workflow-step__top">
              <span
                className="tq-workflow-step__mandatory"
                aria-label="Always included"
                title="Always included"
              />

              <span className="tq-workflow-step__icon tq-workflow-step__icon--acknowledgement">
                <ModusWcIcon name={WORKFLOW_STEP_META.acknowledgement.icon} size="sm" decorative />
              </span>

              <div className="tq-workflow-step__copy min-w-0 flex-1">
                <ModusWcTypography
                  hierarchy="p"
                  size="md"
                  weight="semibold"
                  customClass="!m-0"
                  label={WORKFLOW_STEP_META.acknowledgement.title}
                />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!m-0 mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label={WORKFLOW_STEP_META.acknowledgement.description}
                />
              </div>

              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="!m-0 shrink-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={`Step ${acknowledgementStepNumber}`}
              />
            </div>

            <div className="tq-workflow-step__due">
              <ModusWcDate
                label={WORKFLOW_STEP_META.acknowledgement.dueDateLabel}
                size="sm"
                value={acknowledgementStep.deadline}
                onInputChange={(e) =>
                  updateStep(acknowledgementStep.id, {
                    deadline: readInputString(e as CustomEvent),
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      <div className="tq-workflow-flow" aria-label="Review process flow summary">
        <div className="tq-workflow-flow__header">
          <ModusWcIcon name="settings" size="sm" decorative />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            customClass="!m-0"
            label="Review Process Flow"
          />
        </div>
        <ol className="tq-workflow-flow__list">
          {enabledFlowSteps.map((step, index) => (
            <li key={step.id} className="tq-workflow-flow__item">
              <span className={`tq-workflow-flow__bullet ${flowBulletClass(step.type)}`} aria-hidden="true" />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="!m-0"
                label={`${index + 1}. ${WORKFLOW_STEP_LABELS[step.type]}`}
              />
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
