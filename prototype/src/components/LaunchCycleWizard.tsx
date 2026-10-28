import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import {
  ModusWcAlert,
  ModusWcAutocomplete,
  ModusWcButton,
  ModusWcCard,
  ModusWcChip,
  ModusWcIcon,
  ModusWcModal,
  ModusWcSelect,
  ModusWcStepper,
  ModusWcTextInput,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { createEmptyTemplate, DEFAULT_RATING_SCALE } from '../data/seed'
import { usePerformance } from '../context/PerformanceContext'
import type {
  EmployeeReviewerAssignment,
  Person,
  RatingScaleConfig,
  ReviewerRoleType,
  ReviewTemplate,
  ReviewCycle,
  WorkflowKickoffMode,
  WorkflowStep,
} from '../types'
import { readInputString } from '../utils/modusFormEvents'
import {
  readTableSelectedRowIds,
  rowIdSetEqual,
} from '../utils/tableRowSelection'
import { CYCLE_STATUS_LABELS } from '../utils/status'
import { computeCycleDueDateFromWorkflow } from '../utils/cycleDisplay'
import { isRatingScaleConfigValid, normalizeRatingScale } from '../utils/ratingScale'
import {
  createDefaultWorkflowSteps,
  getEnabledWorkflowSteps,
  isWorkflowDeadlinesOrderValid,
  canUseParallelKickoff,
  workflowIncludesManagerRatingScale,
} from '../utils/workflow'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { CreateTemplateForm, isCreateTemplateValid } from './CreateTemplateForm'
import { TemplateEmployeePreview } from './TemplateEmployeePreview'
import { PerformanceDataTable } from './PerformanceDataTable'
import {
  createNeutralTagBadge,
  createReviewerAssignmentCell,
} from '../utils/modusTableCells'
import {
  defaultReviewerAssignment,
  buildManagerOptions,
  isReviewerAssignmentValid,
  isSupervisorAssignmentMissing,
  resolveEffectiveSupervisorId,
  REVIEWER_TYPE_OPTIONS,
  reviewerPreviewLabel,
} from '../utils/reviewer'
import { WorkflowStepConfig } from './WorkflowStepConfig'
import { LaunchCycleReviewSummary } from './LaunchCycleReviewSummary'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { isTemplateVisibleInCycleWizard } from '../utils/templateLifecycle'
import { useModusDialog } from '../utils/useModusDialog'

const TEMPLATE_PREVIEW_MODAL_ID = 'launch-wizard-template-preview'
const PARTICIPANT_SUMMARY_DETAIL_MODAL_ID = 'launch-wizard-participant-summary-detail'

const WIZARD_STEPS = [
  'Cycle Details',
  'Template',
  'Workflow',
  'Participants',
  'Review & Launch',
] as const

const LAUNCH_WIZARD_CARD = `${TRAQ_CARD_CLASS} tq-launch-wizard__card`

function matchesMultiFilter(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value)
}

type ParticipantFieldMultiFilterProps = {
  label: string
  emptyHint: string
  values: string[]
  selected: string[]
  onSelectedChange: (next: string[]) => void
}

function ParticipantFieldMultiFilter({
  label,
  emptyHint,
  values,
  selected,
  onSelectedChange,
}: ParticipantFieldMultiFilterProps) {
  const autocompleteRef = useRef<ComponentRef<typeof ModusWcAutocomplete>>(null)

  const menuItems = useMemo(
    () =>
      values
        .filter((value) => !selected.includes(value))
        .map((value) => ({
          label: value,
          value,
          visibleInMenu: true,
        })),
    [values, selected],
  )

  const addValue = useCallback(
    (value: string) => {
      if (!value || selected.includes(value)) return
      onSelectedChange([...selected, value])
    },
    [onSelectedChange, selected],
  )

  return (
    <ModusWcAutocomplete
      ref={autocompleteRef}
      label={label}
      size="sm"
      includeSearch
      showMenuOnFocus
      placeholder={emptyHint}
      items={menuItems}
      onItemSelect={(e) => {
        const value = (e as CustomEvent<{ value?: string }>).detail?.value ?? ''
        addValue(value)
        void autocompleteRef.current?.clearInput?.()
        void autocompleteRef.current?.closeMenu?.()
      }}
    />
  )
}

function defaultCycleEndFallback(): string {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
}

type CycleParticipantSummary = {
  inCycleCount: number
  assignedCount: number
  unassignedCount: number
  unassigned: { id: string; displayName: string; reason: string }[]
  unassignedEmployeeCount: number
  unassignedEmployees: { id: string; name: string; supervisorLabel: string }[]
  participants: {
    id: string
    name: string
    supervisorLabel: string
    assignmentValid: boolean
    attentionReason?: string
  }[]
}

type SummaryModalView = 'selected' | 'assigned' | 'attention' | 'unassigned' | null

function supervisorLabelForEmployee(
  person: { supervisorId?: string },
  getPerson: (id: string) => Person | undefined,
): string {
  const supervisorId = person.supervisorId?.trim()
  const supervisorPerson = supervisorId ? getPerson(supervisorId) : undefined
  return supervisorPerson
    ? formatEmployeeNameWithCode(supervisorPerson.name, supervisorPerson.id)
    : 'Not on file'
}

const PARTICIPANT_SUMMARY_MODAL_COLUMNS = [
  { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
  { id: 'supervisorLabel', header: 'Supervisor', accessor: 'supervisorLabel', sortable: true },
]

const SUMMARY_STAT_CARD_BUTTON_CLASS =
  'min-w-0 w-full rounded-lg text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--modus-wc-color-primary)] enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-[var(--modus-wc-color-primary)] disabled:cursor-default disabled:opacity-70'

function CycleParticipantSummaryPanel({ summary }: { summary: CycleParticipantSummary }) {
  const [modalView, setModalView] = useState<SummaryModalView>(null)
  const closeListModal = useCallback(() => setModalView(null), [])
  const { requestClose: requestCloseListModal } = useModusDialog(
    PARTICIPANT_SUMMARY_DETAIL_MODAL_ID,
    modalView !== null,
    closeListModal,
  )

  const modalParticipants = useMemo(() => {
    switch (modalView) {
      case 'selected':
        return summary.participants
      case 'assigned':
        return summary.participants.filter((participant) => participant.assignmentValid)
      case 'attention':
        return summary.participants.filter((participant) => !participant.assignmentValid)
      case 'unassigned':
        return summary.unassignedEmployees
      default:
        return []
    }
  }, [modalView, summary.participants])

  const modalTitle =
    modalView === 'selected'
      ? 'Selected for cycle'
      : modalView === 'assigned'
        ? 'Reviewers assigned'
        : modalView === 'attention'
          ? 'Needs attention'
          : modalView === 'unassigned'
            ? 'Unassigned employees'
            : 'Employees'

  const modalTableData = useMemo(
    () =>
      modalParticipants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        supervisorLabel: participant.supervisorLabel,
      })),
    [modalParticipants],
  )

  return (
    <>
      <div className="flex flex-col gap-3">
        <ModusWcTypography hierarchy="h4" size="sm" weight="semibold" label="Selection summary" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button
            type="button"
            className={SUMMARY_STAT_CARD_BUTTON_CLASS}
            disabled={summary.inCycleCount === 0}
            aria-label={`View ${summary.inCycleCount} employees selected for cycle`}
            onClick={() => setModalView('selected')}
          >
            <ModusWcCard bordered={false} padding="compact" customClass="min-w-0 bg-[var(--modus-wc-color-base-100)]">
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Selected for cycle"
              />
              <ModusWcTypography hierarchy="h4" size="lg" weight="semibold" label={String(summary.inCycleCount)} />
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={summary.inCycleCount === 0 ? 'None selected' : 'View employees'}
              />
            </ModusWcCard>
          </button>
          <button
            type="button"
            className={SUMMARY_STAT_CARD_BUTTON_CLASS}
            disabled={summary.assignedCount === 0}
            aria-label={`View ${summary.assignedCount} employees with reviewers assigned`}
            onClick={() => setModalView('assigned')}
          >
            <ModusWcCard bordered={false} padding="compact" customClass="min-w-0 bg-[var(--modus-wc-color-base-100)]">
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Reviewers assigned"
              />
              <ModusWcTypography hierarchy="h4" size="lg" weight="semibold" label={String(summary.assignedCount)} />
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={summary.assignedCount === 0 ? 'None yet' : 'View employees'}
              />
            </ModusWcCard>
          </button>
          <button
            type="button"
            className={SUMMARY_STAT_CARD_BUTTON_CLASS}
            disabled={summary.unassignedCount === 0}
            aria-label={`View ${summary.unassignedCount} employees needing attention`}
            onClick={() => setModalView('attention')}
          >
            <ModusWcCard bordered={false} padding="compact" customClass="min-w-0 bg-[var(--modus-wc-color-base-100)]">
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Needs attention"
              />
              <ModusWcTypography
                hierarchy="h4"
                size="lg"
                weight="semibold"
                customClass={
                  summary.unassignedCount > 0
                    ? 'text-[var(--modus-wc-color-warning)]'
                    : undefined
                }
                label={String(summary.unassignedCount)}
              />
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={summary.unassignedCount === 0 ? 'All set' : 'View employees'}
              />
            </ModusWcCard>
          </button>
          <button
            type="button"
            className={SUMMARY_STAT_CARD_BUTTON_CLASS}
            disabled={summary.unassignedEmployeeCount === 0}
            aria-label={`View ${summary.unassignedEmployeeCount} unassigned employees`}
            onClick={() => setModalView('unassigned')}
          >
            <ModusWcCard bordered={false} padding="compact" customClass="min-w-0 bg-[var(--modus-wc-color-base-100)]">
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Unassigned employees"
              />
              <ModusWcTypography
                hierarchy="h4"
                size="lg"
                weight="semibold"
                label={String(summary.unassignedEmployeeCount)}
              />
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={
                  summary.unassignedEmployeeCount === 0
                    ? 'Everyone selected'
                    : 'View employees'
                }
              />
            </ModusWcCard>
          </button>
        </div>
        {summary.inCycleCount === 0 ? (
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label="No one selected yet. Use the employee table below to add people and set reviewers."
          />
        ) : null}
        {summary.inCycleCount > 0 && summary.unassignedCount > 0 ? (
          <ModusWcAlert
            variant="warning"
            alertTitle={
              summary.unassignedCount === 1
                ? '1 participant needs a reviewer'
                : `${summary.unassignedCount} participants need a reviewer`
            }
            alertDescription="Update reviewer settings in the employee table below, or open Needs attention to see who is affected."
          />
        ) : null}
        {summary.inCycleCount > 0 && summary.unassignedCount === 0 ? (
          <ModusWcAlert
            variant="success"
            alertTitle="Ready to continue"
            alertDescription="Every selected employee has a reviewer assignment."
          />
        ) : null}
      </div>

      <ModusWcModal
        modalId={PARTICIPANT_SUMMARY_DETAIL_MODAL_ID}
        backdrop="default"
        position="center"
        showClose={true}
        customClass="tq-launch-wizard-participant-list-dialog"
        aria-label={modalTitle}
      >
        <span slot="header">{modalTitle}</span>
        <div slot="content" className="flex min-w-0 flex-col gap-3 overflow-x-auto">
          {modalTableData.length === 0 ? (
            <ModusWcTypography
              size="sm"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label="No employees in this list."
            />
          ) : (
            <PerformanceDataTable
              caption={modalTitle}
              columns={PARTICIPANT_SUMMARY_MODAL_COLUMNS}
              data={modalTableData}
              density="compact"
              hover={false}
              sortable={true}
              customClass="w-full"
            />
          )}
        </div>
        <div slot="footer" className="flex w-full justify-end">
          <ModusWcButton
            variant="outlined"
            color="tertiary"
            size="sm"
            onButtonClick={requestCloseListModal}
          >
            Close
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </>
  )
}

export function LaunchCycleWizard() {
  const {
    state,
    setView,
    launchCycle,
    saveCycleDraft,
    saveTemplate,
    getTemplate,
    getPerson,
  } = usePerformance()

  const [stepIndex, setStepIndex] = useState(0)
  const [cycleName, setCycleName] = useState('')
  const [cycleDescription, setCycleDescription] = useState('')
  const [templateMode, setTemplateMode] = useState<'select' | 'create'>('select')
  const wizardSelectableTemplates = useMemo(
    () => state.templates.filter(isTemplateVisibleInCycleWizard),
    [state.templates],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => wizardSelectableTemplates[0]?.id ?? '',
  )
  const [templateSearchQuery, setTemplateSearchQuery] = useState('')

  const filteredWizardTemplates = useMemo(() => {
    const query = templateSearchQuery.trim().toLowerCase()
    if (!query) return wizardSelectableTemplates
    return wizardSelectableTemplates.filter((template) => {
      const name = template.name.toLowerCase()
      const description = (template.description ?? '').toLowerCase()
      return name.includes(query) || description.includes(query)
    })
  }, [wizardSelectableTemplates, templateSearchQuery])

  useEffect(() => {
    if (selectedTemplateId && wizardSelectableTemplates.some((t) => t.id === selectedTemplateId)) {
      return
    }
    setSelectedTemplateId(wizardSelectableTemplates[0]?.id ?? '')
  }, [wizardSelectableTemplates, selectedTemplateId])
  const [draftTemplate, setDraftTemplate] = useState<ReviewTemplate>(() => createEmptyTemplate())
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(() => createDefaultWorkflowSteps())
  const [workflowKickoffMode, setWorkflowKickoffMode] = useState<WorkflowKickoffMode>('sequential')
  const [ratingScale, setRatingScale] = useState<RatingScaleConfig>(() =>
    normalizeRatingScale(DEFAULT_RATING_SCALE),
  )
  const [allowSupportingDocuments, setAllowSupportingDocuments] = useState(false)
  const [individualEmployeeIds, setIndividualEmployeeIds] = useState<string[]>([])
  const [reviewerAssignments, setReviewerAssignments] = useState<
    Record<string, EmployeeReviewerAssignment>
  >({})
  const [bulkReviewerType, setBulkReviewerType] = useState<ReviewerRoleType>('supervisor')
  const [bulkCustomManagerId, setBulkCustomManagerId] = useState('')
  const [reviewerTableKey, setReviewerTableKey] = useState(0)
  const [filterDepartments, setFilterDepartments] = useState<string[]>([])
  const [filterCostCenters, setFilterCostCenters] = useState<string[]>([])
  const [filterTitles, setFilterTitles] = useState<string[]>([])
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  const employeePool = useMemo(
    () => state.people.filter((p) => p.role === 'employee'),
    [state.people],
  )

  const departmentValues = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.department))].sort()
    return values
  }, [employeePool])

  const costCenterValues = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.costCenter))].sort()
    return values
  }, [employeePool])

  const titleValues = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.title))].sort()
    return values
  }, [employeePool])

  const filteredEmployees = useMemo(() => {
    return employeePool.filter((p) => {
      if (!matchesMultiFilter(filterDepartments, p.department)) return false
      if (!matchesMultiFilter(filterCostCenters, p.costCenter)) return false
      if (!matchesMultiFilter(filterTitles, p.title)) return false
      return true
    })
  }, [employeePool, filterDepartments, filterCostCenters, filterTitles])

  const derivedParticipantIds = useMemo(
    () => individualEmployeeIds,
    [individualEmployeeIds],
  )

  const getEffectiveAssignment = useCallback(
    (employeeId: string): EmployeeReviewerAssignment =>
      reviewerAssignments[employeeId] ?? defaultReviewerAssignment(),
    [reviewerAssignments],
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
        derivedParticipantIds.map((id) => [id, getEffectiveAssignment(id)]),
      ),
    [derivedParticipantIds, getEffectiveAssignment],
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

    const cycleDue = computeCycleDueDateFromWorkflow(workflow, defaultCycleEndFallback())

    return {
      name: cycleName.trim(),
      description: cycleDescription.trim() || undefined,
      createdBy: 'HR Admin',
      templateId,
      startDate: '',
      dueDate: cycleDue,
      includesSelfEvaluation: workflow.some((s) => s.enabled && s.type === 'employee'),
      workflow,
      workflowKickoffMode,
      ratingScale: normalizeRatingScale(ratingScale),
      allowSupportingDocuments,
      employeeIds: derivedParticipantIds,
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

  const openTemplatePreview = useCallback((templateId: string) => {
    if (!getTemplate(templateId)) return
    setPreviewTemplateId(templateId)
  }, [getTemplate])

  const closeTemplatePreview = useCallback(() => {
    setPreviewTemplateId(null)
  }, [])

  const { requestClose: closePreviewDialog } = useModusDialog(
    TEMPLATE_PREVIEW_MODAL_ID,
    previewTemplateId !== null,
    closeTemplatePreview,
  )

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

  const filteredEmployeeIds = useMemo(
    () => filteredEmployees.map((person) => person.id),
    [filteredEmployees],
  )

  const buildReviewerAssignmentForEmployee = useCallback(
    (employeeId: string, type: ReviewerRoleType): EmployeeReviewerAssignment => {
      if (type === 'custom') {
        return { type: 'custom', customManagerId: bulkCustomManagerId }
      }
      if (type === 'supervisor') {
        return { type: 'supervisor' }
      }
      return { type }
    },
    [bulkCustomManagerId],
  )

  const assignmentForBulk = useCallback(
    (employeeId: string): EmployeeReviewerAssignment =>
      buildReviewerAssignmentForEmployee(employeeId, bulkReviewerType),
    [buildReviewerAssignmentForEmployee, bulkReviewerType],
  )

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

  const applyReviewerToFilteredEmployees = useCallback(
    (type: ReviewerRoleType, options?: { customManagerId?: string }) => {
      if (filteredEmployeeIds.length === 0) return
      setReviewerAssignments((prev) => {
        const next = { ...prev }
        filteredEmployeeIds.forEach((id) => {
          if (type === 'custom') {
            next[id] = {
              type: 'custom',
              customManagerId: options?.customManagerId ?? bulkCustomManagerId,
            }
            return
          }
          if (type === 'supervisor') {
            next[id] = { type: 'supervisor' }
            return
          }
          next[id] = { type }
        })
        return next
      })
      setReviewerTableKey((key) => key + 1)
    },
    [bulkCustomManagerId, filteredEmployeeIds],
  )

  const handleEmployeeRowSelectionChange = useCallback(
    (event: CustomEvent<{ selectedRowIds: string[] }>) => {
      const newIds = readTableSelectedRowIds(event)
      setIndividualEmployeeIds((prev) => {
        if (rowIdSetEqual(prev, newIds)) return prev
        const added = newIds.filter((id) => !prev.includes(id))
        if (added.length > 0) {
          setReviewerAssignments((assignments) => {
            const next = { ...assignments }
            added.forEach((id) => {
              if (!next[id]) next[id] = assignmentForBulk(id)
            })
            return next
          })
        }
        return newIds
      })
    },
    [assignmentForBulk],
  )

  const ensureIndividualParticipant = useCallback((employeeId: string) => {
    setIndividualEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev : [...prev, employeeId],
    )
  }, [])

  const setReviewerType = (employeeId: string, type: ReviewerRoleType) => {
    ensureIndividualParticipant(employeeId)
    const previous = reviewerAssignments[employeeId] ?? getEffectiveAssignment(employeeId)
    setReviewerAssignments((prev) => ({
      ...prev,
      [employeeId]:
        type === 'custom'
          ? {
              type: 'custom',
              customManagerId: previous.customManagerId || bulkCustomManagerId || '',
            }
          : type === 'supervisor'
            ? { type: 'supervisor' }
            : { type },
    }))
    setReviewerTableKey((key) => key + 1)
  }

  const setReviewerCustomManager = (employeeId: string, customManagerId: string) => {
    ensureIndividualParticipant(employeeId)
    setReviewerAssignments((prev) => ({
      ...prev,
      [employeeId]: {
        type: 'custom',
        customManagerId,
      },
    }))
    setReviewerTableKey((key) => key + 1)
  }

  const applyBulkReviewer = (type: ReviewerRoleType) => {
    setBulkReviewerType(type)
    applyReviewerToFilteredEmployees(type)
  }

  const applyBulkCustomManager = (managerId: string) => {
    setBulkCustomManagerId(managerId)
    setBulkReviewerType('custom')
    applyReviewerToFilteredEmployees('custom', { customManagerId: managerId })
  }

  const employeeTableData = useMemo(
    () =>
      filteredEmployees.map((person) => {
        const isIndividuallySelected = individualEmployeeIds.includes(person.id)
        const inCycle = derivedParticipantIds.includes(person.id)
        const effective = reviewerAssignments[person.id]
          ? reviewerAssignments[person.id]
          : inCycle
            ? getEffectiveAssignment(person.id)
            : defaultReviewerAssignment()
        const effectiveSupervisorId = resolveEffectiveSupervisorId(person, effective) ?? ''
        return {
          id: person.id,
          name: formatEmployeeNameWithCode(person.name, person.id),
          title: person.title,
          department: person.department,
          costCenter: person.costCenter,
          isSelected: isIndividuallySelected,
          reviewerType: effective.type,
          reviewerCustomManagerId: effective.customManagerId ?? '',
          reviewerSupervisorId: effectiveSupervisorId,
          supervisorMissing: isSupervisorAssignmentMissing(person, effective),
        }
      })
        .sort((a, b) => {
          if (a.supervisorMissing !== b.supervisorMissing) {
            return a.supervisorMissing ? -1 : 1
          }
          return a.name.localeCompare(b.name)
        }),
    [
      filteredEmployees,
      individualEmployeeIds,
      reviewerAssignments,
      derivedParticipantIds,
      getEffectiveAssignment,
    ],
  )

  const cycleParticipantSummary = useMemo((): CycleParticipantSummary => {
    const unassigned: CycleParticipantSummary['unassigned'] = []
    const participants: CycleParticipantSummary['participants'] = []
    const selectedIds = new Set(derivedParticipantIds)
    const unassignedEmployees: CycleParticipantSummary['unassignedEmployees'] = []

    for (const person of employeePool) {
      if (selectedIds.has(person.id)) continue
      unassignedEmployees.push({
        id: person.id,
        name: formatEmployeeNameWithCode(person.name, person.id),
        supervisorLabel: supervisorLabelForEmployee(person, getPerson),
      })
    }
    unassignedEmployees.sort((a, b) => a.name.localeCompare(b.name))

    for (const id of derivedParticipantIds) {
      const person = getPerson(id)
      if (!person) continue
      const assignment = getEffectiveAssignment(id)
      const assignmentValid = isReviewerAssignmentValid(assignment, person)
      const name = formatEmployeeNameWithCode(person.name, person.id)
      const supervisorLabel = supervisorLabelForEmployee(person, getPerson)

      let reason: string | undefined
      if (!assignmentValid) {
        reason = 'Reviewer not assigned'
        if (
          assignment.type === 'supervisor' &&
          isSupervisorAssignmentMissing(person, assignment)
        ) {
          reason = 'Supervisor not on file'
        } else if (assignment.type === 'custom' && !assignment.customManagerId?.trim()) {
          reason = 'Custom manager not selected'
        }
        unassigned.push({ id, displayName: name, reason })
      }

      participants.push({
        id,
        name,
        supervisorLabel,
        assignmentValid,
        attentionReason: reason,
      })
    }

    participants.sort((a, b) => {
      if (a.assignmentValid !== b.assignmentValid) {
        return a.assignmentValid ? 1 : -1
      }
      return a.name.localeCompare(b.name)
    })

    const inCycleCount = derivedParticipantIds.length
    return {
      inCycleCount,
      assignedCount: inCycleCount - unassigned.length,
      unassignedCount: unassigned.length,
      unassigned,
      unassignedEmployeeCount: unassignedEmployees.length,
      unassignedEmployees,
      participants,
    }
  }, [derivedParticipantIds, employeePool, getEffectiveAssignment, getPerson])

  const renderReviewerAssignmentCell = useCallback(
    (record: {
      id: string
      name: string
      reviewerType: string
      reviewerCustomManagerId: string
      reviewerSupervisorId: string
      supervisorMissing: boolean
    }) => {
      const person = getPerson(record.id)
      const assignment: EmployeeReviewerAssignment = {
        type: record.reviewerType as ReviewerRoleType,
        customManagerId: record.reviewerCustomManagerId,
        supervisorId: record.reviewerSupervisorId || undefined,
      }
      const effectiveSupervisorId = resolveEffectiveSupervisorId(person, assignment) ?? ''
      const supervisorName = effectiveSupervisorId
        ? getPerson(effectiveSupervisorId)?.name ?? '—'
        : ''
      return createReviewerAssignmentCell(
        assignment,
        managerOptions,
        (type) => setReviewerType(record.id, type as ReviewerRoleType),
        (managerId) => setReviewerCustomManager(record.id, managerId),
        `Reviewer for ${record.name}`,
        assignment.type === 'supervisor'
          ? {
              supervisorMissing: record.supervisorMissing,
              supervisorLabel: supervisorName
                ? `Supervisor — ${supervisorName}`
                : 'Supervisor — not on file',
            }
          : undefined,
      )
    },
    [getPerson, managerOptions],
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
            reviewerType: string
            reviewerCustomManagerId: string
            reviewerSupervisorId: string
            supervisorMissing: boolean
          }
          return renderReviewerAssignmentCell(record)
        },
      },
    ],
    [renderReviewerAssignmentCell],
  )

  const participantStatusLabel = useMemo(() => {
    const employeePart =
      derivedParticipantIds.length === 1
        ? '1 employee selected'
        : `${derivedParticipantIds.length} employees selected`
    const reviewerPart =
      cycleParticipantSummary.unassignedCount === 0
        ? derivedParticipantIds.length === 0
          ? 'No reviewer assignments yet'
          : 'All reviewers assigned'
        : cycleParticipantSummary.unassignedCount === 1
          ? '1 needs reviewer'
          : `${cycleParticipantSummary.unassignedCount} need reviewer`
    return `${employeePart} · ${reviewerPart}`
  }, [derivedParticipantIds.length, cycleParticipantSummary.unassignedCount])

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
        return cycleName.trim().length > 0
      case 1:
        return isTemplateValid()
      case 2: {
        if (getEnabledWorkflowSteps(workflow).length === 0) return false
        if (workflowIncludesManagerRatingScale(workflow)) {
          if (!isRatingScaleConfigValid(ratingScale)) return false
        }
        const kickoffMode: WorkflowKickoffMode =
          workflowKickoffMode === 'parallel' && canUseParallelKickoff(workflow)
            ? 'parallel'
            : 'sequential'
        return isWorkflowDeadlinesOrderValid(workflow, kickoffMode)
      }
      case 3:
        return (
          derivedParticipantIds.length > 0 &&
          derivedParticipantIds.every((id) =>
            isReviewerAssignmentValid(getEffectiveAssignment(id), getPerson(id)),
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
        <div
          className="tq-launch-wizard-page__close"
          hidden={previewTemplateId !== null}
          aria-hidden={previewTemplateId !== null}
        >
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
              <ModusWcTextarea
                label="Description for participants"
                size="sm"
                rows={4}
                value={cycleDescription}
                placeholder="Explain what this review cycle covers and what employees should do next."
                onInputChange={(e) => setCycleDescription(readInputString(e as CustomEvent))}
              />
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Included in the email notification sent to participants when the cycle launches."
              />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="Start and end dates are set automatically when you launch: start is the publish date; end is the due date on the last workflow step (configure deadlines in step 3)."
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

              <ModusWcTextInput
                size="sm"
                label="Search templates"
                includeSearch
                placeholder="Search by template name or description"
                aria-label="Search templates by name or description"
                value={templateSearchQuery}
                onInputChange={(e) => setTemplateSearchQuery(readInputString(e as CustomEvent))}
              />

              <div
                className="tq-template-picker-list"
                role="radiogroup"
                aria-label="Review template"
              >
                {filteredWizardTemplates.length === 0 ? (
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                    label="No templates match your search. Try a different name or description."
                  />
                ) : null}
                {filteredWizardTemplates.map((template) => {
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
                            onButtonClick={() => openTemplatePreview(template.id)}
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
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </ModusWcCard>
        )}

        {stepIndex === 2 && (
          <ModusWcCard bordered padding="compact" customClass={LAUNCH_WIZARD_CARD}>
            <ModusWcTypography
              slot="title"
              hierarchy="h4"
              size="md"
              weight="semibold"
              label="Step 3 — Workflow"
            />
            <WorkflowStepConfig
              workflow={workflow}
              onWorkflowChange={setWorkflow}
              workflowKickoffMode={workflowKickoffMode}
              onWorkflowKickoffModeChange={setWorkflowKickoffMode}
              ratingScale={ratingScale}
              onRatingScaleChange={setRatingScale}
              allowSupportingDocuments={allowSupportingDocuments}
              onAllowSupportingDocumentsChange={setAllowSupportingDocuments}
            />
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
              <div className="flex flex-col gap-3">
                <ModusWcTypography
                  hierarchy="h4"
                  size="md"
                  weight="semibold"
                  label="Select employees"
                />
                  <div className="flex flex-col gap-3">
                    <div
                      className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${
                        bulkReviewerType === 'custom' ? 'xl:grid-cols-5' : 'lg:grid-cols-4'
                      }`}
                    >
                      <ParticipantFieldMultiFilter
                        label="Department"
                        emptyHint="All departments"
                        values={departmentValues}
                        selected={filterDepartments}
                        onSelectedChange={setFilterDepartments}
                      />
                      <ParticipantFieldMultiFilter
                        label="Cost center"
                        emptyHint="All cost centers"
                        values={costCenterValues}
                        selected={filterCostCenters}
                        onSelectedChange={setFilterCostCenters}
                      />
                      <ParticipantFieldMultiFilter
                        label="Title"
                        emptyHint="All titles"
                        values={titleValues}
                        selected={filterTitles}
                        onSelectedChange={setFilterTitles}
                      />
                      <ModusWcSelect
                        label="Reviewer for all shown"
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
                    {filterDepartments.length + filterCostCenters.length + filterTitles.length >
                    0 ? (
                      <div
                        className="flex min-w-0 flex-wrap items-center gap-2"
                        role="group"
                        aria-label="Active participant filters"
                      >
                        {filterDepartments.map((value) => (
                          <ModusWcChip
                            key={`dept-${value}`}
                            label={value}
                            size="sm"
                            active
                            variant="filled"
                            showRemove
                            aria-label={`${value}, remove department filter`}
                            onChipRemove={() =>
                              setFilterDepartments((prev) => prev.filter((entry) => entry !== value))
                            }
                          />
                        ))}
                        {filterCostCenters.map((value) => (
                          <ModusWcChip
                            key={`cc-${value}`}
                            label={value}
                            size="sm"
                            active
                            variant="filled"
                            showRemove
                            aria-label={`${value}, remove cost center filter`}
                            onChipRemove={() =>
                              setFilterCostCenters((prev) => prev.filter((entry) => entry !== value))
                            }
                          />
                        ))}
                        {filterTitles.map((value) => (
                          <ModusWcChip
                            key={`title-${value}`}
                            label={value}
                            size="sm"
                            active
                            variant="filled"
                            showRemove
                            aria-label={`${value}, remove title filter`}
                            onChipRemove={() =>
                              setFilterTitles((prev) => prev.filter((entry) => entry !== value))
                            }
                          />
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <CycleParticipantSummaryPanel summary={cycleParticipantSummary} />
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                    label="Use filters and bulk reviewer controls for the rows shown below. Check employees to add them to the cycle and set each row’s reviewer."
                  />
                  <PerformanceDataTable
                    key={reviewerTableKey}
                    caption="Employees available for this review cycle"
                    columns={employeeTableColumns}
                    data={employeeTableData}
                    density="comfortable"
                    selectable="multi"
                    selectedRowIds={individualEmployeeIds}
                    onRowSelectionChange={handleEmployeeRowSelectionChange}
                  />
              </div>
            </div>
          </ModusWcCard>
        )}

        {stepIndex === 4 && (
          <LaunchCycleReviewSummary
            cycleName={cycleName.trim() || '—'}
            cycleDescription={cycleDescription.trim()}
            template={resolvedTemplate}
            workflow={workflow}
            workflowKickoffMode={workflowKickoffMode}
            ratingScale={ratingScale}
            allowSupportingDocuments={allowSupportingDocuments}
            selectedEmployees={selectedEmployees}
            conflictsWereResolved={derivedParticipantIds.every((id) =>
              isReviewerAssignmentValid(getEffectiveAssignment(id), getPerson(id)),
            )}
            getPerson={getPerson}
          />
        )}

          </div>
        </div>

        <ModusWcModal
          modalId={TEMPLATE_PREVIEW_MODAL_ID}
          backdrop="default"
          position="center"
          showClose={true}
          customClass="tq-launch-wizard-template-preview-dialog"
          aria-label="Template preview"
        >
          <span slot="header" className="tq-launch-wizard-template-preview-modal-title">
            {previewTemplate?.name.trim() || 'Template preview'}
          </span>
          <div slot="content" className="tq-launch-wizard-template-preview-modal flex flex-col">
            {previewTemplate ? (
              <TemplateEmployeePreview key={previewTemplate.id} template={previewTemplate} />
            ) : null}
          </div>
          <div slot="footer" className="flex w-full justify-end">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={closePreviewDialog}
            >
              Close
            </ModusWcButton>
          </div>
        </ModusWcModal>

        <footer className="tq-launch-wizard-page__footer">
          <div className="tq-launch-wizard-page__footer-inner">
            <ModusWcButton
              key={stepIndex === 0 ? 'wizard-footer-cancel' : 'wizard-footer-back'}
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={goBack}
            >
              {stepIndex === 0 ? 'Cancel' : 'Back'}
            </ModusWcButton>

            <div className="tq-launch-wizard-page__footer-actions">
              <div className="tq-launch-wizard-page__footer-final-actions">
                {stepIndex >= 2 && stepIndex <= 4 ? (
                  <ModusWcButton
                    variant="outlined"
                    color="tertiary"
                    size="sm"
                    disabled={!canSaveDraft()}
                    onButtonClick={handleSaveDraft}
                  >
                    Save Draft
                  </ModusWcButton>
                ) : null}
                {stepIndex === WIZARD_STEPS.length - 1 ? (
                  <ModusWcButton
                    key="wizard-publish-review"
                    variant="filled"
                    color="primary"
                    size="sm"
                    customClass="tq-launch-wizard-publish-btn"
                    onButtonClick={handleLaunch}
                  >
                    <ModusWcIcon name="send" size="xs" decorative />
                    Publish review
                  </ModusWcButton>
                ) : (
                  <ModusWcButton
                    key="wizard-continue"
                    variant="filled"
                    color="primary"
                    size="sm"
                    {...(!canAdvance() ? { disabled: true } : {})}
                    onButtonClick={goNext}
                  >
                    Continue
                  </ModusWcButton>
                )}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TraqsperaPageBody>
  )
}
