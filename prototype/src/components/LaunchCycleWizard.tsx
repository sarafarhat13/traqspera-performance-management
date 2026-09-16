import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcAutocomplete,
  ModusWcButton,
  ModusWcCard,
  ModusWcDate,
  ModusWcIcon,
  ModusWcModal,
  ModusWcSelect,
  ModusWcStepper,
  ModusWcTabs,
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
import {
  readTableSelectedRowIds,
  rowIdSetEqual,
} from '../utils/tableRowSelection'
import { questionScoringMetaLabel } from '../utils/questionReview'
import { CYCLE_STATUS_LABELS, isReviewDateRangeValid } from '../utils/status'
import {
  createDefaultWorkflowSteps,
  getEnabledWorkflowSteps,
} from '../utils/workflow'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { CreateTemplateForm, isCreateTemplateValid } from './CreateTemplateForm'
import { PerformanceDataTable } from './PerformanceDataTable'
import {
  createNeutralTagBadge,
  createReviewerAssignmentCell,
} from '../utils/modusTableCells'
import {
  defaultReviewerAssignment,
  buildManagerOptions,
  isReviewerAssignmentValid,
  REVIEWER_TYPE_OPTIONS,
  reviewerPreviewLabel,
} from '../utils/reviewer'
import { WorkflowStepConfig } from './WorkflowStepConfig'
import { LaunchCycleReviewSummary } from './LaunchCycleReviewSummary'
import { LaunchCycleGroupPicker } from './LaunchCycleGroupPicker'
import { ParticipantConflictPanel } from './ParticipantConflictPanel'
import {
  ReviewGroupFormModal,
  formValuesFromGroup,
  type ReviewGroupFormValues,
} from './ReviewGroupFormModal'
import type { ReviewEmployeeGroup } from '../types'
import {
  applyDefaultAssignmentsFromProvenance,
  buildProvenanceFromState,
  computeParticipantIdsFromProvenance,
  detectConflicts,
} from '../utils/participantSelection'

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
  'Participants',
  'Review & Launch',
] as const

const LAUNCH_GROUP_FORM_MODAL_ID = 'launch-wizard-review-group-form'

const LAUNCH_WIZARD_CARD = `${TRAQ_CARD_CLASS} tq-launch-wizard__card`

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
  const {
    state,
    setView,
    launchCycle,
    saveCycleDraft,
    saveTemplate,
    saveReviewGroup,
    getTemplate,
    getPerson,
    getReviewGroup,
  } = usePerformance()

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
  const [individualEmployeeIds, setIndividualEmployeeIds] = useState<string[]>([])
  const [attachedGroupIds, setAttachedGroupIds] = useState<string[]>([])
  const [participantsTabIndex, setParticipantsTabIndex] = useState(0)
  const [launchGroupFormOpen, setLaunchGroupFormOpen] = useState(false)
  const [draftLaunchGroup, setDraftLaunchGroup] = useState<ReviewEmployeeGroup | null>(null)
  const [reviewerAssignments, setReviewerAssignments] = useState<
    Record<string, EmployeeReviewerAssignment>
  >({})
  const [bulkReviewerType, setBulkReviewerType] = useState<ReviewerRoleType>('crew_manager')
  const [bulkCustomManagerId, setBulkCustomManagerId] = useState('')
  const [filterDepartment, setFilterDepartment] = useState(FILTER_ALL)
  const [filterCostCenter, setFilterCostCenter] = useState(FILTER_ALL)
  const [filterTitle, setFilterTitle] = useState(FILTER_ALL)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  const employeePool = useMemo(
    () => state.people.filter((p) => p.role === 'employee'),
    [state.people],
  )

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

  const getGroup = useCallback(
    (id: string) => getReviewGroup(id) ?? state.reviewGroups.find((g) => g.id === id),
    [getReviewGroup, state.reviewGroups],
  )

  const provenance = useMemo(
    () =>
      buildProvenanceFromState({
        individualEmployeeIds: new Set(individualEmployeeIds),
        individualAssignments: reviewerAssignments,
        attachedGroupIds,
        getGroup,
      }),
    [individualEmployeeIds, reviewerAssignments, attachedGroupIds, getGroup],
  )

  const derivedParticipantIds = useMemo(
    () => computeParticipantIdsFromProvenance(provenance),
    [provenance],
  )

  const conflicts = useMemo(
    () => detectConflicts(provenance, reviewerAssignments),
    [provenance, reviewerAssignments],
  )

  const syncReviewerDefaults = useCallback(
    (
      nextAttachedGroupIds: string[],
      nextIndividualEmployeeIds: string[],
      prev: Record<string, EmployeeReviewerAssignment>,
    ) => {
      const nextProvenance = buildProvenanceFromState({
        individualEmployeeIds: new Set(nextIndividualEmployeeIds),
        individualAssignments: prev,
        attachedGroupIds: nextAttachedGroupIds,
        getGroup,
      })
      return applyDefaultAssignmentsFromProvenance(nextProvenance, prev)
    },
    [getGroup],
  )

  const selectedEmployees = useMemo(
    () =>
      derivedParticipantIds
        .map((id) => state.people.find((p) => p.id === id))
        .filter((person): person is NonNullable<typeof person> => Boolean(person)),
    [derivedParticipantIds, state.people],
  )

  const reviewerAssignmentsForLaunch = useMemo(
    () =>
      Object.fromEntries(
        derivedParticipantIds.map((id) => [
          id,
          reviewerAssignments[id] ?? defaultReviewerAssignment(),
        ]),
      ),
    [derivedParticipantIds, reviewerAssignments],
  )

  const participantTabs = useMemo(
    () => [{ label: 'Select individuals' }, { label: 'Review groups' }],
    [],
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
      employeeIds: derivedParticipantIds,
      attachedGroupIds: attachedGroupIds.length > 0 ? attachedGroupIds : undefined,
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

  const assignmentForBulk = useCallback((): EmployeeReviewerAssignment => {
    if (bulkReviewerType === 'custom') {
      return { type: 'custom', customManagerId: bulkCustomManagerId }
    }
    return { type: bulkReviewerType }
  }, [bulkReviewerType, bulkCustomManagerId])

  const managerOptions = useMemo(() => buildManagerOptions(state.people), [state.people])

  const bulkManagerItems = useMemo(
    () =>
      managerOptions.map((option) => ({
        label: option.label,
        value: option.value,
        visibleInMenu: true,
        selected: option.value === bulkCustomManagerId,
      })),
    [managerOptions, bulkCustomManagerId],
  )

  const bulkCustomManagerLabel =
    managerOptions.find((option) => option.value === bulkCustomManagerId)?.label ?? ''

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

  const handleEmployeeRowSelectionChange = useCallback(
    (event: CustomEvent<{ selectedRowIds: string[] }>) => {
      const newIds = readTableSelectedRowIds(event)
      setIndividualEmployeeIds((prev) => {
        if (rowIdSetEqual(prev, newIds)) return prev
        const added = newIds.filter((id) => !prev.includes(id))
        if (added.length > 0) {
          const bulkAssignment = assignmentForBulk()
          setReviewerAssignments((assignments) => {
            const next = { ...assignments }
            added.forEach((id) => {
              if (!next[id]) next[id] = bulkAssignment
            })
            return next
          })
        }
        return newIds
      })
    },
    [assignmentForBulk],
  )

  const mergeEmployeeSelection = (idsToAdd: string[]) => {
    setIndividualEmployeeIds((prev) => [...new Set([...prev, ...idsToAdd])])
    applyReviewerAssignmentsForIds(idsToAdd, true)
  }

  const handleAttachedGroupIdsChange = useCallback(
    (nextAttached: string[]) => {
      setAttachedGroupIds(nextAttached)
      setReviewerAssignments((prev) =>
        syncReviewerDefaults(nextAttached, individualEmployeeIds, prev),
      )
    },
    [individualEmployeeIds, syncReviewerDefaults],
  )

  const selectAllReviewGroups = () => {
    const nextAttached = state.reviewGroups.map((group) => group.id)
    setAttachedGroupIds(nextAttached)
    setReviewerAssignments((prev) =>
      syncReviewerDefaults(nextAttached, individualEmployeeIds, prev),
    )
  }

  const clearAttachedGroups = () => {
    setAttachedGroupIds([])
    setReviewerAssignments((prev) => syncReviewerDefaults([], individualEmployeeIds, prev))
  }

  const handleLaunchGroupFormSubmit = (values: ReviewGroupFormValues) => {
    if (!draftLaunchGroup) return
    const group: ReviewEmployeeGroup = {
      ...draftLaunchGroup,
      name: values.name,
      description: values.description || undefined,
      memberIds: values.memberIds,
      defaultReviewerAssignment: values.defaultReviewerAssignment,
    }
    saveReviewGroup(group)
    const nextAttached = attachedGroupIds.includes(group.id)
      ? attachedGroupIds
      : [...attachedGroupIds, group.id]
    setAttachedGroupIds(nextAttached)
    setReviewerAssignments((prev) => {
      const lookupGroup = (id: string) => (id === group.id ? group : getGroup(id))
      const nextProvenance = buildProvenanceFromState({
        individualEmployeeIds: new Set(individualEmployeeIds),
        individualAssignments: prev,
        attachedGroupIds: nextAttached,
        getGroup: lookupGroup,
      })
      return applyDefaultAssignmentsFromProvenance(nextProvenance, prev)
    })
    setLaunchGroupFormOpen(false)
    setDraftLaunchGroup(null)
    setParticipantsTabIndex(1)
  }

  const resolveConflict = (employeeId: string, assignment: EmployeeReviewerAssignment) => {
    setReviewerAssignments((prev) => ({
      ...prev,
      [employeeId]: assignment,
    }))
  }

  const setReviewerType = (employeeId: string, type: ReviewerRoleType) => {
    setReviewerAssignments((prev) => ({
      ...prev,
      [employeeId]: {
        type,
        customManagerId:
          type === 'custom'
            ? prev[employeeId]?.customManagerId || bulkCustomManagerId || ''
            : undefined,
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

  const applyAssignmentToSelected = (assignment: EmployeeReviewerAssignment) => {
    if (individualEmployeeIds.length === 0) return
    setReviewerAssignments((prev) => {
      const next = { ...prev }
      individualEmployeeIds.forEach((id) => {
        next[id] = assignment
      })
      return next
    })
  }

  const applyBulkReviewer = (type: ReviewerRoleType) => {
    setBulkReviewerType(type)
    applyAssignmentToSelected(
      type === 'custom'
        ? { type: 'custom', customManagerId: bulkCustomManagerId }
        : { type },
    )
  }

  const applyBulkCustomManager = (managerId: string) => {
    setBulkCustomManagerId(managerId)
    setBulkReviewerType('custom')
    applyAssignmentToSelected({ type: 'custom', customManagerId: managerId })
  }

  const selectAllFiltered = () => mergeEmployeeSelection(filteredEmployeeIds)

  const selectAllInPool = () => mergeEmployeeSelection(employeePoolIds)

  const clearSelection = () => {
    setIndividualEmployeeIds([])
    setReviewerAssignments((prev) => syncReviewerDefaults(attachedGroupIds, [], prev))
  }

  const employeeTableData = useMemo(
    () =>
      filteredEmployees.map((person) => {
        const isIndividuallySelected = individualEmployeeIds.includes(person.id)
        const assignment =
          reviewerAssignments[person.id] ??
          (isIndividuallySelected ? defaultReviewerAssignment() : undefined)
        return {
          id: person.id,
          name: person.name,
          title: person.title,
          department: person.department,
          costCenter: person.costCenter,
          isSelected: isIndividuallySelected,
          reviewerType: assignment?.type ?? 'crew_manager',
          reviewerCustomManagerId: assignment?.customManagerId ?? '',
        }
      }),
    [filteredEmployees, individualEmployeeIds, reviewerAssignments],
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
    ],
    [reviewerAssignments, managerOptions],
  )

  const groupPickerItems = useMemo(
    () =>
      state.reviewGroups.map((group) => {
        const sampleMember = group.memberIds[0] ? getPerson(group.memberIds[0]) : undefined
        const previewPerson =
          sampleMember ?? state.people.find((person) => person.role === 'employee')
        const reviewerPreview = previewPerson
          ? reviewerPreviewLabel(
              previewPerson,
              group.defaultReviewerAssignment,
              getPerson,
            )
          : '—'
        return {
          id: group.id,
          name: group.name,
          description: group.description,
          membersLabel:
            group.memberIds.length === 1
              ? '1 employee'
              : `${group.memberIds.length} employees`,
          reviewerPreview,
        }
      }),
    [state.reviewGroups, state.people, getPerson],
  )

  const attachedGroups = useMemo(
    () =>
      attachedGroupIds
        .map((id) => getGroup(id))
        .filter((group): group is ReviewEmployeeGroup => Boolean(group)),
    [attachedGroupIds, getGroup],
  )

  const participantStatusLabel = useMemo(() => {
    const employeePart =
      derivedParticipantIds.length === 1
        ? '1 employee'
        : `${derivedParticipantIds.length} employees`
    const groupPart =
      attachedGroupIds.length === 1
        ? '1 group attached'
        : `${attachedGroupIds.length} groups attached`
    const conflictPart =
      conflicts.length === 0
        ? 'No reviewer conflicts'
        : conflicts.length === 1
          ? '1 conflict to resolve'
          : `${conflicts.length} conflicts to resolve`
    return `${employeePart} · ${groupPart} · ${conflictPart}`
  }, [derivedParticipantIds.length, attachedGroupIds.length, conflicts.length])

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

  const canSaveDraft = () => cycleName.trim().length > 0 && isTemplateValid()

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
          derivedParticipantIds.length > 0 &&
          conflicts.length === 0 &&
          derivedParticipantIds.every((id) =>
            isReviewerAssignmentValid(
              reviewerAssignments[id] ?? defaultReviewerAssignment(),
            ),
          )
        )
      default:
        return true
    }
  }

  const exitToDashboard = () => {
    setView('hr_dashboard')
  }

  const goBack = () => {
    if (stepIndex === 0) {
      exitToDashboard()
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
    if (!canSaveDraft()) return
    const cycleInput = buildCycleInput()
    if (!cycleInput) return
    saveCycleDraft(cycleInput, { reviewerAssignments: reviewerAssignmentsForLaunch })
  }

  return (
    <TraqsperaPageBody>
      <div className="tq-launch-wizard-page">
        <div className="tq-launch-wizard-page__close">
          <ModusWcButton
            variant="borderless"
            color="tertiary"
            shape="square"
            size="sm"
            aria-label="Close and return to performance dashboard"
            onButtonClick={exitToDashboard}
          >
            <ModusWcIcon name="close" size="sm" decorative />
          </ModusWcButton>
        </div>

        <div className="tq-launch-wizard">
          <TraqsperaPageHeader
            title="Launch performance review cycle"
            subtitle="Configure the cycle, template, workflow, and participants before launching."
          />

          <div className="tq-launch-wizard__content flex flex-col gap-3">
        <ModusWcCard bordered padding="compact" customClass={`${LAUNCH_WIZARD_CARD} tq-launch-wizard__stepper-card`}>
          <div className="tq-launch-wizard__stepper-wrap">
            <ModusWcStepper
              steps={stepperItems}
              orientation="horizontal"
              customClass="tq-launch-wizard__steps"
              aria-label="Launch cycle wizard progress"
            />
          </div>
        </ModusWcCard>

        {stepIndex === 0 && (
          <ModusWcCard bordered padding="compact" customClass={LAUNCH_WIZARD_CARD}>
            <ModusWcTypography
              slot="title"
              hierarchy="h4"
              size="md"
              weight="semibold"
              label="Step 1 — Cycle Details"
            />
            <div className="flex flex-col gap-3">
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
          <ModusWcCard bordered padding="compact" customClass={LAUNCH_WIZARD_CARD}>
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
                              label={
                                [
                                  questionScoringMetaLabel(q) ?? (q.weight > 0 ? `Weight ${q.weight}%` : undefined),
                                  q.required ? 'Required' : undefined,
                                ]
                                  .filter(Boolean)
                                  .join(' · ') || '—'
                              }
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
          <ModusWcCard bordered padding="compact" customClass={LAUNCH_WIZARD_CARD}>
            <WorkflowStepConfig workflow={workflow} onWorkflowChange={setWorkflow} />
          </ModusWcCard>
        )}

        {stepIndex === 3 && (
          <ModusWcCard bordered padding="compact" customClass={`${LAUNCH_WIZARD_CARD} tq-table-card`}>
            <div slot="title" className="flex w-full min-w-0 flex-col gap-2 mb-4">
              <ModusWcTypography
                hierarchy="h4"
                size="md"
                weight="semibold"
                label="Step 4 — Participants"
              />
              <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={participantStatusLabel} />
            </div>
            <div className="flex flex-col gap-3">
              {conflicts.length > 0 ? (
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-warning)]"
                  label="Some employees have different reviewers from different sources. Resolve conflicts before continuing."
                />
              ) : null}

              <ParticipantConflictPanel
                conflicts={conflicts}
                getPerson={getPerson}
                getGroup={getGroup}
                onResolve={resolveConflict}
              />

              <div className="tq-review-detail-tabs">
                <ModusWcTabs
                  tabs={participantTabs}
                  activeTabIndex={participantsTabIndex}
                  tabStyle="bordered"
                  size="sm"
                  customClass="tq-review-detail-tabs__strip"
                  aria-label="Participant selection mode"
                  onTabChange={(e: CustomEvent<{ previousTab: number; newTab: number }>) =>
                    setParticipantsTabIndex(e.detail.newTab)
                  }
                />
              </div>

              <div
                className="flex flex-col gap-3"
                hidden={participantsTabIndex !== 0}
                aria-hidden={participantsTabIndex !== 0}
              >
                  <div className="flex shrink-0 flex-wrap justify-end gap-2">
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
                  <div
                    className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
                      bulkReviewerType === 'custom' ? 'xl:grid-cols-5' : 'lg:grid-cols-4'
                    }`}
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
                    <ModusWcSelect
                      label="Reviewer for selected"
                      size="sm"
                      value={bulkReviewerType}
                      options={REVIEWER_TYPE_OPTIONS}
                      onInputChange={(e) =>
                        applyBulkReviewer(readInputString(e as CustomEvent) as ReviewerRoleType)
                      }
                    />
                    <div
                      hidden={bulkReviewerType !== 'custom'}
                      aria-hidden={bulkReviewerType !== 'custom'}
                    >
                      <ModusWcAutocomplete
                        label="Custom reviewer for all selected"
                        size="sm"
                        placeholder="Search managers"
                        includeSearch
                        showMenuOnFocus
                        value={bulkCustomManagerLabel}
                        items={bulkManagerItems}
                        onItemSelect={(e) => {
                          const managerId =
                            (e as CustomEvent<{ value?: string }>).detail?.value ?? ''
                          if (managerId) applyBulkCustomManager(managerId)
                        }}
                      />
                    </div>
                  </div>
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                    label="Add employees who are not in a review group, or set reviewers for specific people. Reviewer for selected applies to individually selected rows."
                  />
                  {participantsTabIndex === 0 ? (
                  <PerformanceDataTable
                    caption="Employees available for this review cycle"
                    columns={employeeTableColumns}
                    data={employeeTableData}
                    density="comfortable"
                    selectable="multi"
                    selectedRowIds={individualEmployeeIds}
                    onRowSelectionChange={handleEmployeeRowSelectionChange}
                  />
                  ) : null}
              </div>

              <div
                className="flex flex-col gap-3"
                hidden={participantsTabIndex !== 1}
                aria-hidden={participantsTabIndex !== 1}
              >
                <LaunchCycleGroupPicker
                  groups={groupPickerItems}
                  attachedGroupIds={attachedGroupIds}
                  onAttachedGroupIdsChange={handleAttachedGroupIdsChange}
                  onAttachAll={selectAllReviewGroups}
                  onClearAll={clearAttachedGroups}
                  onCreateGroup={() => {
                    setDraftLaunchGroup({
                      id: `rgrp-${crypto.randomUUID().slice(0, 8)}`,
                      name: '',
                      memberIds: [],
                      defaultReviewerAssignment: defaultReviewerAssignment(),
                      createdBy: 'HR Admin',
                    })
                    setLaunchGroupFormOpen(true)
                  }}
                />
              </div>

              <ReviewGroupFormModal
                modalId={LAUNCH_GROUP_FORM_MODAL_ID}
                open={launchGroupFormOpen}
                title="Create review group"
                submitLabel="Save group"
                people={state.people}
                initial={draftLaunchGroup ? formValuesFromGroup(draftLaunchGroup) : undefined}
                onClose={() => {
                  setLaunchGroupFormOpen(false)
                  setDraftLaunchGroup(null)
                }}
                onSubmit={handleLaunchGroupFormSubmit}
              />
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
            attachedGroups={attachedGroups}
            conflictsWereResolved={conflicts.length === 0 && derivedParticipantIds.length > 0}
            getPerson={getPerson}
          />
        )}

          </div>
        </div>

        <footer className="tq-launch-wizard-page__footer">
          <div className="tq-launch-wizard-page__footer-inner">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={goBack}
            >
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </ModusWcButton>

            <div className="tq-launch-wizard-page__footer-actions">
              {stepIndex !== 4 ? (
                <ModusWcButton
                  variant="filled"
                  color="primary"
                  size="sm"
                  disabled={!canAdvance()}
                  onButtonClick={goNext}
                >
                  Continue
                </ModusWcButton>
              ) : (
                <div className="tq-launch-wizard-page__footer-final-actions">
                  <ModusWcButton
                    variant="outlined"
                    color="tertiary"
                    size="sm"
                    disabled={!canSaveDraft()}
                    onButtonClick={handleSaveDraft}
                  >
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
          </div>
        </footer>
      </div>
    </TraqsperaPageBody>
  )
}
