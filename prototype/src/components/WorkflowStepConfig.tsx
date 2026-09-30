import { useEffect, useState, type DragEvent } from 'react'
import {
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcDate,
  ModusWcIcon,
  ModusWcRadio,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { RatingScaleConfig, WorkflowKickoffMode, WorkflowStep, WorkflowStepType } from '../types'
import { RatingScaleConfigModal } from './RatingScaleConfigModal'
import { formatRatingScaleSummary } from '../utils/ratingScale'
import { readInputChecked, readInputString } from '../utils/modusFormEvents'
import {
  type CoreWorkflowStepType,
  type ReorderableWorkflowStepType,
  getAcknowledgementWorkflowStep,
  getEnabledWorkflowSteps,
  getRatingScaleWorkflowStep,
  getReorderableWorkflowSteps,
  getWorkflowFlowSummaryItems,
  canUseParallelKickoff,
  moveCoreWorkflowStepToIndex,
  RATING_SCALE_STEP_META,
  resetCoreWorkflowOrder,
  WORKFLOW_STEP_LABELS,
  WORKFLOW_STEP_META,
} from '../utils/workflow'

type WorkflowStepConfigProps = {
  workflow: WorkflowStep[]
  onWorkflowChange: (steps: WorkflowStep[]) => void
  workflowKickoffMode: WorkflowKickoffMode
  onWorkflowKickoffModeChange: (mode: WorkflowKickoffMode) => void
  ratingScale: RatingScaleConfig
  onRatingScaleChange: (scale: RatingScaleConfig) => void
}

function flowBulletClass(type: WorkflowStepType): string {
  if (type === 'rating_scale') return RATING_SCALE_STEP_META.flowBulletClass
  return WORKFLOW_STEP_META[type as CoreWorkflowStepType].flowBulletClass
}

export function WorkflowStepConfig({
  workflow,
  onWorkflowChange,
  workflowKickoffMode,
  onWorkflowKickoffModeChange,
  ratingScale,
  onRatingScaleChange,
}: WorkflowStepConfigProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [ratingModalOpen, setRatingModalOpen] = useState(false)

  const parallelKickoffAvailable = canUseParallelKickoff(workflow)
  const sequentialKickoff = workflowKickoffMode === 'sequential' || !parallelKickoffAvailable
  const flowSummaryItems = getWorkflowFlowSummaryItems(
    workflow,
    sequentialKickoff ? 'sequential' : 'parallel',
  )

  useEffect(() => {
    if (!parallelKickoffAvailable && workflowKickoffMode === 'parallel') {
      onWorkflowKickoffModeChange('sequential')
    }
  }, [parallelKickoffAvailable, workflowKickoffMode, onWorkflowKickoffModeChange])

  const reorderableSteps = getReorderableWorkflowSteps(workflow)
  const ratingStep = getRatingScaleWorkflowStep(workflow)
  const acknowledgementStep = getAcknowledgementWorkflowStep(workflow)
  const enabledFlowSteps = getEnabledWorkflowSteps(workflow)
  const acknowledgementStepNumber = reorderableSteps.length + 1

  const updateStep = (id: string, patch: Partial<WorkflowStep>) => {
    onWorkflowChange(workflow.map((step) => (step.id === id ? { ...step, ...patch } : step)))
  }

  const updateManagerStep = (id: string, patch: Partial<WorkflowStep>) => {
    const managerStep = workflow.find((step) => step.type === 'manager')
    if (
      patch.enabled === false &&
      ratingStep &&
      managerStep &&
      id === managerStep.id
    ) {
      onWorkflowChange(
        workflow.map((step) => {
          if (step.id === id) return { ...step, ...patch }
          if (step.type === 'rating_scale') return { ...step, enabled: false }
          return step
        }),
      )
      return
    }
    updateStep(id, patch)
  }

  const updateManagerRatingIncluded = (included: boolean) => {
    if (!ratingStep) return
    updateStep(ratingStep.id, { enabled: included })
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

      <fieldset className="tq-workflow-config__kickoff flex flex-col gap-2 border-0 p-0 m-0">
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          weight="semibold"
          customClass="!m-0"
          label="Employee and manager kickoff"
        />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-4">
          <ModusWcRadio
            name="workflow-kickoff-mode"
            size="sm"
            label="Sequential — one phase starts after the other"
            value={sequentialKickoff}
            onInputChange={() => onWorkflowKickoffModeChange('sequential')}
          />
          <ModusWcRadio
            name="workflow-kickoff-mode"
            size="sm"
            label="Parallel — self-evaluation and manager review start together"
            value={!sequentialKickoff}
            disabled={!parallelKickoffAvailable}
            onInputChange={() => onWorkflowKickoffModeChange('parallel')}
          />
        </div>
        {!parallelKickoffAvailable && (
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="Enable both Self Evaluation and Manager Evaluation to use parallel kickoff."
          />
        )}
      </fieldset>

      {sequentialKickoff ? (
        <div className="tq-workflow-config__hint" role="note">
          <ModusWcIcon name="drag_indicator" size="sm" decorative />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="Drag Self Evaluation and Manager Evaluation to reorder them. Employee Acknowledgment stays fixed at the end. Optional manager rating is configured under Manager Evaluation."
          />
        </div>
      ) : (
        <div className="tq-workflow-config__hint" role="note">
          <ModusWcIcon name="people_group" size="sm" decorative />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="Both evaluations are open at once until each is submitted. Later steps still run in order after both are complete."
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {reorderableSteps.map((step, index) => {
          const stepType = step.type as ReorderableWorkflowStepType
          const meta = WORKFLOW_STEP_META[stepType]
          const isDraggable = step.enabled && sequentialKickoff
          const onToggleStep =
            stepType === 'manager'
              ? (enabled: boolean) => updateManagerStep(step.id, { enabled })
              : (enabled: boolean) => updateStep(step.id, { enabled })

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
                    onToggleStep(readInputChecked(e as CustomEvent))
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

              {stepType === 'manager' && ratingStep ? (
                <div className="tq-workflow-step__nested-block">
                  <div className="tq-workflow-step__nested-option">
                    <ModusWcCheckbox
                      size="sm"
                      value={ratingStep.enabled && step.enabled}
                      disabled={!step.enabled}
                      aria-label={`Include ${RATING_SCALE_STEP_META.title} under manager evaluation`}
                      onInputChange={(e) =>
                        updateManagerRatingIncluded(readInputChecked(e as CustomEvent))
                      }
                    />
                    <div className="tq-workflow-step__nested-copy min-w-0 flex-1">
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        weight="semibold"
                        customClass="!m-0"
                        label={RATING_SCALE_STEP_META.title}
                      />
                      <ModusWcTypography
                        hierarchy="p"
                        size="xs"
                        customClass="!m-0 mt-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={RATING_SCALE_STEP_META.description}
                      />
                    </div>
                  </div>
                  {step.enabled && ratingStep.enabled ? (
                    <div className="tq-workflow-step__nested-summary">
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        customClass="!m-0 min-w-0 flex-1 text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={formatRatingScaleSummary(ratingScale)}
                      />
                      <ModusWcButton
                        variant="outlined"
                        color="tertiary"
                        size="sm"
                        onButtonClick={() => setRatingModalOpen(true)}
                      >
                        <ModusWcIcon name="edit" size="xs" decorative />
                        Edit rating scale
                      </ModusWcButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}

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

      {ratingStep ? (
        <RatingScaleConfigModal
          open={ratingModalOpen}
          ratingScale={ratingScale}
          onClose={() => setRatingModalOpen(false)}
          onSave={onRatingScaleChange}
        />
      ) : null}

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
          {flowSummaryItems.map((item, index) => {
            const bulletClass =
              item.key === 'parallel-kickoff'
                ? 'tq-workflow-flow__bullet--primary'
                : flowBulletClass(
                    enabledFlowSteps.find((s) => s.id === item.key)?.type ?? 'acknowledgement',
                  )
            return (
              <li key={item.key} className="tq-workflow-flow__item">
                <span className={`tq-workflow-flow__bullet ${bulletClass}`} aria-hidden="true" />
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!m-0"
                  label={`${index + 1}. ${item.label}`}
                />
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
