import { useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcDate,
  ModusWcIcon,
  ModusWcModal,
  ModusWcSelect,
  ModusWcStepper,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { createEmptyTemplate } from '../data/seed'
import { usePerformance } from '../context/PerformanceContext'
import type {
  EmployeeReviewerAssignment,
  RatingScaleConfig,
  ReviewerRoleType,
  ReviewTemplate,
  ReviewCycle,
  WorkflowStep,
} from '../types'
import { readInputString } from '../utils/modusFormEvents'
import { CYCLE_STATUS_LABELS, isReviewDateRangeValid } from '../utils/status'
import {
  createDefaultWorkflowSteps,
  getEnabledWorkflowSteps,
} from '../utils/workflow'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { CreateTemplateForm, isCreateTemplateValid } from './CreateTemplateForm'
import { PerformanceDataTable } from './PerformanceDataTable'
import { createNeutralTagBadge, createReviewerAssignmentCell } from '../utils/modusTableCells'
import {
  defaultReviewerAssignment,
  buildManagerOptions,
  isReviewerAssignmentValid,
  REVIEWER_TYPE_OPTIONS,
} from '../utils/reviewer'
import { WorkflowStepConfig } from './WorkflowStepConfig'
import { LaunchCycleReviewSummary } from './LaunchCycleReviewSummary'

const FILTER_ALL = '__all__'
const TEMPLATE_PREVIEW_MODAL_ID = 'launch-wizard-template-preview'

function estimateTemplateDuration(questionCount: number): string {
  if (questionCount <= 3) return '30–45 minutes'
  if (questionCount <= 5) return '45–60 minutes'
  return '60–90 minutes'
}

const WIZARD_STEPS = [
  'Cycle Details',
  'Template',
  'Workflow',
  'Employees',
  'Review & Launch',
] as const

const DEFAULT_RATING_SCALE: RatingScaleConfig = {
  min: 1,
  max: 5,
  labels: ['Unsatisfactory', 'Needs improvement', 'Meets expectations', 'Exceeds', 'Outstanding'],
}

function defaultStartDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultDueDate(): string {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
}

export function LaunchCycleWizard() {
  const { state, setView, launchCycle, saveCycleDraft, saveTemplate, getTemplate, getPerson } =
    usePerformance()

  const isAdmin = state.demoRole === 'hr_admin'
  const dashboardView = isAdmin ? 'hr_dashboard' : 'manager_dashboard'

  const [stepIndex, setStepIndex] = useState(0)
  const [cycleName, setCycleName] = useState('')
  const [startDate, setStartDate] = useState(defaultStartDate())
  const [dueDate, setDueDate] = useState(defaultDueDate())
  const [templateMode, setTemplateMode] = useState<'select' | 'create'>('select')
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    state.templates[0]?.id ?? '',
  )
  const [draftTemplate, setDraftTemplate] = useState<ReviewTemplate>(() => createEmptyTemplate())
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(() => createDefaultWorkflowSteps())
  const [ratingScale, setRatingScale] = useState<RatingScaleConfig>(DEFAULT_RATING_SCALE)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [reviewerAssignments, setReviewerAssignments] = useState<
    Record<string, EmployeeReviewerAssignment>
  >({})
  const [bulkReviewerType, setBulkReviewerType] = useState<ReviewerRoleType>('crew_manager')
  const [filterDepartment, setFilterDepartment] = useState(FILTER_ALL)
  const [filterCostCenter, setFilterCostCenter] = useState(FILTER_ALL)
  const [filterTitle, setFilterTitle] = useState(FILTER_ALL)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  const employeePool = useMemo(() => {
    let people = state.people.filter((p) => p.role === 'employee')
    if (!isAdmin) {
      people = people.filter((p) => p.managerId === state.activePersonId)
    }
    return people
  }, [state.people, state.activePersonId, isAdmin])

  const departmentOptions = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.department))].sort()
    return [
      { label: 'All departments', value: FILTER_ALL },
      ...values.map((v) => ({ label: v, value: v })),
    ]
  }, [employeePool])

  const costCenterOptions = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.costCenter))].sort()
    return [
      { label: 'All cost centers', value: FILTER_ALL },
      ...values.map((v) => ({ label: v, value: v })),
    ]
  }, [employeePool])

  const titleOptions = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.title))].sort()
    return [
      { label: 'All titles', value: FILTER_ALL },
      ...values.map((v) => ({ label: v, value: v })),
    ]
  }, [employeePool])

  const filteredEmployees = useMemo(() => {
    return employeePool.filter((p) => {
      if (filterDepartment !== FILTER_ALL && p.department !== filterDepartment) return false
      if (filterCostCenter !== FILTER_ALL && p.costCenter !== filterCostCenter) return false
      if (filterTitle !== FILTER_ALL && p.title !== filterTitle) return false
      return true
    })
  }, [employeePool, filterDepartment, filterCostCenter, filterTitle])

  const selectedEmployees = useMemo(
    () =>
      selectedEmployeeIds
        .map((id) => state.people.find((p) => p.id === id))
        .filter((person): person is NonNullable<typeof person> => Boolean(person)),
    [selectedEmployeeIds, state.people],
  )

  const reviewerAssignmentsForLaunch = useMemo(
    () =>
      Object.fromEntries(
        selectedEmployeeIds.map((id) => [
          id,
          reviewerAssignments[id] ?? defaultReviewerAssignment(),
        ]),
      ),
    [selectedEmployeeIds, reviewerAssignments],
  )

  const buildCycleInput = (): Omit<ReviewCycle, 'id' | 'status'> | null => {
    let templateId = selectedTemplateId
    const launchedTemplate =
      templateMode === 'create'
        ? {
            ...draftTemplate,
            questions: draftTemplate.questions.map((q, i) => ({ ...q, order: i + 1 })),
          }
        : getTemplate(templateId ?? '')

    if (templateMode === 'create' && launchedTemplate) {
      saveTemplate(launchedTemplate as ReviewTemplate, { silent: true })
      templateId = launchedTemplate.id
    }

    if (!templateId) return null

    const workflowDeadlines = workflow.map((s) => s.deadline).filter(Boolean)
    const latestDeadline = workflowDeadlines.sort().at(-1)
    const cycleDue = latestDeadline || dueDate

    return {
      name: cycleName.trim(),
      description: launchedTemplate?.description || undefined,
      createdBy: 'HR Admin',
      templateId,
      startDate,
      dueDate: cycleDue,
      includesSelfEvaluation: workflow.some((s) => s.enabled && s.type === 'employee'),
      workflow,
      ratingScale,
      employeeIds: selectedEmployeeIds,
    }
  }

  const resolvedTemplate = useMemo(() => {
    if (templateMode === 'create') return draftTemplate
    return selectedTemplateId ? getTemplate(selectedTemplateId) : undefined
  }, [templateMode, draftTemplate, selectedTemplateId, getTemplate])

  const previewTemplate = useMemo(
    () => (previewTemplateId ? getTemplate(previewTemplateId) : undefined),
    [previewTemplateId, getTemplate],
  )

  useEffect(() => {
    const dialog = document.getElementById(TEMPLATE_PREVIEW_MODAL_ID) as HTMLDialogElement | null
    if (!dialog) return

    const handleClose = () => setPreviewTemplateId(null)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  useEffect(() => {
    const dialog = document.getElementById(TEMPLATE_PREVIEW_MODAL_ID) as HTMLDialogElement | null
    if (previewTemplateId) {
      dialog?.showModal()
      return
    }
    dialog?.close()
  }, [previewTemplateId])

  const stepperItems = useMemo(() => {
    type StepperColor = 'primary' | 'info' | 'neutral'
    return WIZARD_STEPS.map((label, index) => {
      const status =
        index < stepIndex ? 'completed' : index === stepIndex ? 'current' : 'pending'
      const color: StepperColor =
        status === 'completed' ? 'primary' : status === 'current' ? 'info' : 'neutral'
      return {
        label,
        color,
        content: status === 'completed' ? '✓' : String(index + 1),
      }
    })
  }, [stepIndex])

  const employeePoolIds = useMemo(() => employeePool.map((person) => person.id), [employeePool])

  const filteredEmployeeIds = useMemo(
    () => filteredEmployees.map((person) => person.id),
    [filteredEmployees],
  )

  const assignmentForBulk = (): EmployeeReviewerAssignment => {
    if (bulkReviewerType === 'custom') {
      return { type: 'custom', customManagerId: '' }
    }
    return { type: bulkReviewerType }
  }

  const managerOptions = useMemo(() => buildManagerOptions(state.people), [state.people])

  const applyReviewerAssignmentsForIds = (
    ids: string[],
    mergeWithExisting = false,
  ) => {
    const bulkAssignment = assignmentForBulk()
    setReviewerAssignments((prev) => {
      if (mergeWithExisting) {
        const next = { ...prev }
        ids.forEach((id) => {
          if (!next[id]) next[id] = bulkAssignment
        })
        return next
      }
      const next: Record<string, EmployeeReviewerAssignment> = {}
      ids.forEach((id) => {
        next[id] = prev[id] ?? bulkAssignment
      })
      return next
    })
  }

  const handleEmployeeRowSelectionChange = (
    event: CustomEvent<{ selectedRowIds: string[] }>,
  ) => {
    const newIds = event.detail.selectedRowIds
    setSelectedEmployeeIds(newIds)
    applyReviewerAssignmentsForIds(newIds)
  }

  const mergeEmployeeSelection = (idsToAdd: string[]) => {
    setSelectedEmployeeIds((prev) => [...new Set([...prev, ...idsToAdd])])
    applyReviewerAssignmentsForIds(idsToAdd, true)
  }

  const setReviewerType = (employeeId: string, type: ReviewerRoleType) => {
    setReviewerAssignments((prev) => ({
      ...prev,
      [employeeId]: {
        type,
        customManagerId:
          type === 'custom' ? prev[employeeId]?.customManagerId ?? '' : undefined,
      },
    }))
  }

  const setReviewerCustomManager = (employeeId: string, customManagerId: string) => {
    setReviewerAssignments((prev) => ({
      ...prev,
      [employeeId]: {
        type: 'custom',
        customManagerId,
      },
    }))
  }

  const applyBulkReviewer = (type: ReviewerRoleType) => {
    setBulkReviewerType(type)
    if (selectedEmployeeIds.length === 0) return
    setReviewerAssignments((prev) => {
      const next = { ...prev }
      selectedEmployeeIds.forEach((id) => {
        next[id] = {
          type,
          customManagerId:
            type === 'custom' ? prev[id]?.customManagerId ?? '' : undefined,
        }
      })
      return next
    })
  }

  const selectAllFiltered = () => mergeEmployeeSelection(filteredEmployeeIds)

  const selectAllInPool = () => mergeEmployeeSelection(employeePoolIds)

  const clearSelection = () => {
    setSelectedEmployeeIds([])
    setReviewerAssignments({})
  }

  const employeeTableData = useMemo(
    () =>
      filteredEmployees.map((person) => {
        const assignment =
          reviewerAssignments[person.id] ??
          (selectedEmployeeIds.includes(person.id) ? defaultReviewerAssignment() : undefined)
        return {
          id: person.id,
          name: person.name,
          title: person.title,
          department: person.department,
          costCenter: person.costCenter,
          isSelected: selectedEmployeeIds.includes(person.id),
          reviewerType: assignment?.type ?? 'crew_manager',
          reviewerCustomManagerId: assignment?.customManagerId ?? '',
        }
      }),
    [filteredEmployees, selectedEmployeeIds, reviewerAssignments],
  )

  const employeeTableColumns = useMemo(
    () => [
      { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
      { id: 'title', header: 'Title', accessor: 'title', sortable: true },
      { id: 'department', header: 'Department', accessor: 'department', sortable: true },
      {
        id: 'costCenter',
        header: 'Cost center',
        accessor: 'costCenter',
        sortable: true,
        cellRenderer: (value: unknown) => createNeutralTagBadge(String(value)),
      },
      ...(isAdmin
        ? [
            {
              id: 'reviewer',
              header: 'Reviewer',
              accessor: 'reviewerType',
              sortable: false,
              className: 'tq-table-reviewer-cell',
              cellRenderer: (_value: unknown, row: unknown) => {
                const record = row as {
                  id: string
                  name: string
                  isSelected: boolean
                  reviewerType: string
                  reviewerCustomManagerId: string
                }
                if (!record.isSelected) {
                  const empty = document.createElement('span')
                  empty.className =
                    'text-sm text-[var(--modus-wc-color-base-content-low-contrast)]'
                  empty.textContent = '—'
                  return empty
                }
                const assignment: EmployeeReviewerAssignment = {
                  type: record.reviewerType as ReviewerRoleType,
                  customManagerId: record.reviewerCustomManagerId,
                }
                return createReviewerAssignmentCell(
                  assignment,
                  managerOptions,
                  (type) => setReviewerType(record.id, type as ReviewerRoleType),
                  (managerId) => setReviewerCustomManager(record.id, managerId),
                  `Reviewer for ${record.name}`,
                )
              },
            },
          ]
        : []),
    ],
    [isAdmin, reviewerAssignments, managerOptions],
  )

  const isTemplateValid = () => {
    if (templateMode === 'select') return Boolean(selectedTemplateId)
    return isCreateTemplateValid(draftTemplate)
  }

  const handleCreateTemplate = () => {
    if (!isCreateTemplateValid(draftTemplate)) return
    const normalized = {
      ...draftTemplate,
      questions: draftTemplate.questions.map((q, i) => ({ ...q, order: i + 1 })),
    }
    saveTemplate(normalized, { silent: true })
    setSelectedTemplateId(normalized.id)
    setTemplateMode('select')
  }

  const canAdvance = () => {
    switch (stepIndex) {
      case 0:
        return (
          cycleName.trim().length > 0 &&
          isReviewDateRangeValid(startDate, dueDate)
        )
      case 1:
        return isTemplateValid()
      case 2:
        return getEnabledWorkflowSteps(workflow).length > 0
      case 3:
        return (
          selectedEmployeeIds.length > 0 &&
          selectedEmployeeIds.every((id) =>
            isReviewerAssignmentValid(
              reviewerAssignments[id] ?? defaultReviewerAssignment(),
            ),
          )
        )
      default:
        return true
    }
  }

  const goBack = () => {
    if (stepIndex === 0) {
      setView(dashboardView)
      return
    }
    setStepIndex((i) => i - 1)
  }

  const goNext = () => {
    if (!canAdvance()) return
    if (stepIndex < WIZARD_STEPS.length - 1) {
      setStepIndex((i) => i + 1)
      return
    }
    handleLaunch()
  }

  const handleLaunch = () => {
    const cycleInput = buildCycleInput()
    if (!cycleInput) return
    launchCycle(cycleInput, { reviewerAssignments: reviewerAssignmentsForLaunch })
  }

  const handleSaveDraft = () => {
    const cycleInput = buildCycleInput()
    if (!cycleInput || cycleInput.name.length === 0) return
    saveCycleDraft(cycleInput, { reviewerAssignments: reviewerAssignmentsForLaunch })
  }

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Launch performance review cycle"
        subtitle="Configure the cycle, template, workflow, and participants before launching."
        onBack={goBack}
        backAriaLabel={stepIndex === 0 ? 'Cancel launch wizard' : 'Back to previous step'}
      />

      <div className="flex flex-col gap-3">
        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <ModusWcStepper
            steps={stepperItems}
            orientation="horizontal"
            aria-label="Launch cycle wizard progress"
          />
        </ModusWcCard>

        {stepIndex === 0 && (
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <ModusWcTypography
              slot="title"
              hierarchy="h4"
              size="md"
              weight="semibold"
              label="Step 1 — Cycle Details"
            />
            <div className="flex flex-col gap-3 max-w-xl">
              <ModusWcTextInput
                label="Review cycle name"
                size="sm"
                required
                value={cycleName}
                onInputChange={(e) => setCycleName(readInputString(e as CustomEvent))}
              />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <ModusWcDate
                  label="Start date"
                  size="sm"
                  required
                  value={startDate}
                  onInputChange={(e) => setStartDate(readInputString(e as CustomEvent))}
                />
                <ModusWcDate
                  label="End date"
                  size="sm"
                  required
                  value={dueDate}
                  onInputChange={(e) => setDueDate(readInputString(e as CustomEvent))}
                />
              </div>
              {!isReviewDateRangeValid(startDate, dueDate) && startDate && dueDate && (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-danger)]"
                  label="End date must be on or after the start date."
                />
              )}
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Workflow step deadlines can override the end date when set in step 3."
              />
            </div>
          </ModusWcCard>
        )}

        {stepIndex === 1 && templateMode === 'create' && (
          <CreateTemplateForm
            draft={draftTemplate}
            onDraftChange={setDraftTemplate}
            onCancel={() => setTemplateMode('select')}
            onSubmit={handleCreateTemplate}
            submitLabel="Create Template"
          />
        )}

        {stepIndex === 1 && templateMode === 'select' && (
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <div className="tq-template-step flex flex-col gap-4">
              <ModusWcTypography hierarchy="h4" size="lg" weight="semibold" label="Template" />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="max-w-2xl text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label="Choose the review template that best fits your performance evaluation needs"
                />
                <ModusWcButton
                  variant="borderless"
                  color="tertiary"
                  size="sm"
                  onButtonClick={() => {
                    setTemplateMode('create')
                    setDraftTemplate(createEmptyTemplate())
                  }}
                >
                  <ModusWcIcon name="add" size="xs" decorative />
                  Create New Template
                </ModusWcButton>
              </div>

              <div
                className="tq-template-picker-list"
                role="radiogroup"
                aria-label="Review template"
              >
                {state.templates
                  .filter((template) => template.name.trim().length > 0)
                  .map((template) => {
                  const selected = selectedTemplateId === template.id
                  return (
                    <div
                      key={template.id}
                      role="radio"
                      aria-checked={selected}
                      tabIndex={0}
                      className={`tq-template-picker-card${selected ? ' tq-template-picker-card--selected' : ''}`}
                      onClick={() => setSelectedTemplateId(template.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedTemplateId(template.id)
                        }
                      }}
                    >
                      <div className="tq-template-picker-card__header">
                        <div className="tq-template-picker-card__title-row min-w-0">
                          <span className="tq-template-picker-card__indicator" aria-hidden="true">
                            {selected ? (
                              <span className="tq-template-picker-card__indicator-selected">
                                <ModusWcIcon name="check" size="xs" decorative />
                              </span>
                            ) : (
                              <span className="tq-template-picker-card__indicator-empty" />
                            )}
                          </span>
                          <ModusWcTypography
                            hierarchy="p"
                            size="md"
                            weight="semibold"
                            customClass="!m-0 min-w-0"
                            label={template.name}
                          />
                        </div>
                        <div
                          className="shrink-0"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          <ModusWcButton
                            variant="outlined"
                            color="tertiary"
                            size="xs"
                            onButtonClick={() => setPreviewTemplateId(template.id)}
                          >
                            <ModusWcIcon name="visibility_on" size="xs" decorative />
                            Preview
                          </ModusWcButton>
                        </div>
                      </div>
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={template.description}
                      />
                      <div className="tq-template-picker-card__meta">
                        <span className="tq-template-picker-card__meta-item">
                          <ModusWcIcon name="document" size="xs" decorative />
                          <ModusWcTypography
                            hierarchy="p"
                            size="sm"
                            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                            label={`${template.questions.length} questions`}
                          />
                        </span>
                        <span className="tq-template-picker-card__meta-item">
                          <ModusWcIcon name="calendar_clock" size="xs" decorative />
                          <ModusWcTypography
                            hierarchy="p"
                            size="sm"
                            customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                            label={estimateTemplateDuration(template.questions.length)}
                          />
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <ModusWcModal
              modalId={TEMPLATE_PREVIEW_MODAL_ID}
              backdrop="default"
              position="center"
              showClose
              aria-label="Template preview"
            >
              <span slot="header">{previewTemplate?.name ?? 'Template preview'}</span>
              <div slot="content" className="flex flex-col gap-3">
                {previewTemplate && (
                  <>
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                      label={previewTemplate.description}
                    />
                    <div className="tq-template-preview">
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={`${previewTemplate.questions.length} questions`}
                      />
                      <ul className="tq-template-preview__questions">
                        {previewTemplate.questions.map((q) => (
                          <li key={q.id}>
                            <ModusWcTypography
                              hierarchy="p"
                              size="sm"
                              customClass="!m-0 min-w-0"
                              label={q.label}
                            />
                            <ModusWcTypography
                              hierarchy="p"
                              size="xs"
                              customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                              label={`Weight ${q.weight}%${q.required ? ' · Required' : ''}`}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </div>
              <div slot="footer" className="flex justify-end">
                <ModusWcButton
                  variant="outlined"
                  color="tertiary"
                  size="sm"
                  onButtonClick={() => setPreviewTemplateId(null)}
                >
                  Close
                </ModusWcButton>
              </div>
            </ModusWcModal>
          </ModusWcCard>
        )}

        {stepIndex === 2 && (
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <WorkflowStepConfig workflow={workflow} onWorkflowChange={setWorkflow} />
          </ModusWcCard>
        )}

        {stepIndex === 3 && (
          <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
            <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-3 mb-4">
              <ModusWcTypography
                hierarchy="h4"
                size="md"
                weight="semibold"
                label="Step 4 — Select Employees"
              />
              <div className="flex shrink-0 flex-wrap gap-2">
                <ModusWcButton
                  variant="outlined"
                  color="tertiary"
                  size="xs"
                  onButtonClick={selectAllFiltered}
                >
                  Select all shown
                </ModusWcButton>
                <ModusWcButton
                  variant="outlined"
                  color="tertiary"
                  size="xs"
                  onButtonClick={selectAllInPool}
                >
                  Select all employees
                </ModusWcButton>
                <ModusWcButton
                  variant="borderless"
                  color="tertiary"
                  size="xs"
                  onButtonClick={clearSelection}
                >
                  Clear
                </ModusWcButton>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div
                className={`grid grid-cols-1 gap-3 ${isAdmin ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}
              >
                <ModusWcSelect
                  label="Department"
                  size="sm"
                  value={filterDepartment}
                  options={departmentOptions}
                  onInputChange={(e) => setFilterDepartment(readInputString(e as CustomEvent))}
                />
                <ModusWcSelect
                  label="Cost center"
                  size="sm"
                  value={filterCostCenter}
                  options={costCenterOptions}
                  onInputChange={(e) => setFilterCostCenter(readInputString(e as CustomEvent))}
                />
                <ModusWcSelect
                  label="Title"
                  size="sm"
                  value={filterTitle}
                  options={titleOptions}
                  onInputChange={(e) => setFilterTitle(readInputString(e as CustomEvent))}
                />
                {isAdmin && (
                  <ModusWcSelect
                    label="Reviewer for selected"
                    size="sm"
                    value={bulkReviewerType}
                    options={REVIEWER_TYPE_OPTIONS}
                    onInputChange={(e) =>
                      applyBulkReviewer(readInputString(e as CustomEvent) as ReviewerRoleType)
                    }
                  />
                )}
              </div>
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                label={`${selectedEmployeeIds.length} selected · ${filteredEmployees.length} of ${employeePool.length} employees shown`}
              />
              {isAdmin && (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label="Select employees with row checkboxes or Select all in the table header. For Custom (select manager), search and pick a manager from the list. Reviewer for selected applies Crew Manager, Supervisor, or Custom to every selected row."
                />
              )}
              <PerformanceDataTable
                caption="Employees Available for This Review Cycle"
                columns={employeeTableColumns}
                data={employeeTableData}
                density="comfortable"
                selectable="multi"
                selectedRowIds={selectedEmployeeIds}
                onRowSelectionChange={handleEmployeeRowSelectionChange}
              />
              {employeeTableData.length === 0 && (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label="No employees match the current filters. Try clearing one or more dropdowns."
                />
              )}
            </div>
          </ModusWcCard>
        )}

        {stepIndex === 4 && (
          <LaunchCycleReviewSummary
            cycleName={cycleName.trim() || '—'}
            template={resolvedTemplate}
            workflow={workflow}
            ratingScale={ratingScale}
            selectedEmployees={selectedEmployees}
          />
        )}

        {stepIndex !== 4 && (
          <div className="flex flex-wrap justify-end gap-2">
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              disabled={!canAdvance()}
              onButtonClick={goNext}
            >
              Continue
            </ModusWcButton>
          </div>
        )}

        {stepIndex === 4 && (
          <div className="flex flex-wrap justify-end gap-2">
              <ModusWcButton
                variant="outlined"
                color="tertiary"
                size="sm"
                disabled={cycleName.trim().length === 0}
                onButtonClick={handleSaveDraft}
              >
                <ModusWcIcon name="save" size="xs" decorative />
                Save Draft
              </ModusWcButton>
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                disabled={!canAdvance()}
                onButtonClick={handleLaunch}
              >
                <ModusWcIcon name="play" size="xs" decorative />
                Confirm & Start Review Cycle
              </ModusWcButton>
          </div>
        )}
      </div>
    </TraqsperaPageBody>
  )
}
