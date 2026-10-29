import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcAlert,
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcModal,
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
import { createReviewerAssignmentCell, createTableActionButton } from '../utils/modusTableCells'
import {
  defaultReviewerAssignment,
  buildManagerOptions,
  isReviewerAssignmentValid,
  isSupervisorAssignmentMissing,
  resolveEffectiveSupervisorId,
} from '../utils/reviewer'
import { WorkflowStepConfig } from './WorkflowStepConfig'
import { LaunchCycleReviewSummary } from './LaunchCycleReviewSummary'
import { LaunchCycleParticipantPickerModal } from './LaunchCycleParticipantPickerModal'
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

function defaultCycleEndFallback(): string {
  return new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
}

type CycleParticipantSummary = {
  inCycleCount: number
  attentionCount: number
  participants: {
    id: string
    name: string
    supervisorLabel: string
    assignmentValid: boolean
  }[]
}

type SummaryModalView = 'selected' | 'attention' | null

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

  const modalTitle = modalView === 'attention' ? 'Needs attention' : 'Selected for cycle'

  const modalTableData = useMemo(() => {
    const rows =
      modalView === 'attention'
        ? summary.participants.filter((participant) => !participant.assignmentValid)
        : modalView === 'selected'
          ? summary.participants
          : []
    return rows.map((participant) => ({
      id: participant.id,
      name: participant.name,
      supervisorLabel: participant.supervisorLabel,
    }))
  }, [modalView, summary.participants])

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            disabled={summary.attentionCount === 0}
            aria-label={`View ${summary.attentionCount} employees needing attention`}
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
                  summary.attentionCount > 0 ? 'text-[var(--modus-wc-color-warning)]' : undefined
                }
                label={String(summary.attentionCount)}
              />
              <ModusWcTypography
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={summary.attentionCount === 0 ? 'All set' : 'View employees'}
              />
            </ModusWcCard>
          </button>
        </div>
        {summary.attentionCount > 0 ? (
          <ModusWcAlert
            variant="warning"
            alertTitle={
              summary.attentionCount === 1
                ? '1 participant needs a reviewer'
                : `${summary.attentionCount} participants need a reviewer`
            }
            alertDescription="Choose a custom reviewer for them in the list below."
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
          <PerformanceDataTable
            caption={modalTitle}
            columns={PARTICIPANT_SUMMARY_MODAL_COLUMNS}
            data={modalTableData}
            density="compact"
            hover={false}
            sortable={true}
            customClass="w-full"
          />
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

  const [draftCycle] = useState(() =>
    state.editingCycleId
      ? state.cycles.find((c) => c.id === state.editingCycleId && c.status === 'draft')
      : undefined,
  )
  const [stepIndex, setStepIndex] = useState(0)
  const [cycleName, setCycleName] = useState(draftCycle?.name ?? '')
  const [cycleDescription, setCycleDescription] = useState(draftCycle?.description ?? '')
  const [templateMode, setTemplateMode] = useState<'select' | 'create'>('select')
  const wizardSelectableTemplates = useMemo(
    () => state.templates.filter(isTemplateVisibleInCycleWizard),
    [state.templates],
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    () => draftCycle?.templateId || wizardSelectableTemplates[0]?.id || '',
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
  const [workflow, setWorkflow] = useState<WorkflowStep[]>(
    () => draftCycle?.workflow ?? createDefaultWorkflowSteps(),
  )
  const [workflowKickoffMode, setWorkflowKickoffMode] = useState<WorkflowKickoffMode>(
    draftCycle?.workflowKickoffMode ?? 'sequential',
  )
  const [ratingScale, setRatingScale] = useState<RatingScaleConfig>(() =>
    normalizeRatingScale(draftCycle?.ratingScale ?? DEFAULT_RATING_SCALE),
  )
  const [allowSupportingDocuments, setAllowSupportingDocuments] = useState(
    draftCycle?.allowSupportingDocuments ?? false,
  )
  const [allowManagerSupportingDocuments, setAllowManagerSupportingDocuments] = useState(
    draftCycle?.allowManagerSupportingDocuments ?? false,
  )
  const [individualEmployeeIds, setIndividualEmployeeIds] = useState<string[]>(
    () => draftCycle?.employeeIds ?? [],
  )
  const [reviewerAssignments, setReviewerAssignments] = useState<
    Record<string, EmployeeReviewerAssignment>
  >(() => draftCycle?.reviewerAssignments ?? {})
  const [participantPickerOpen, setParticipantPickerOpen] = useState(false)
  const [addedEmployeeTableKey, setAddedEmployeeTableKey] = useState(0)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null)

  const employeePool = useMemo(
    () => state.people.filter((p) => p.role === 'employee'),
    [state.people],
  )

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

  const buildCycleInput = (options?: {
    allowEmptyTemplate?: boolean
  }): Omit<ReviewCycle, 'id' | 'status'> | null => {
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

    if (!templateId) {
      if (!options?.allowEmptyTemplate) return null
      templateId = ''
    }

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
      allowManagerSupportingDocuments,
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

  const managerOptions = useMemo(() => buildManagerOptions(state.people), [state.people])

  const cycleParticipantSummary = useMemo((): CycleParticipantSummary => {
    const participants: CycleParticipantSummary['participants'] = []
    for (const id of derivedParticipantIds) {
      const person = getPerson(id)
      if (!person) continue
      participants.push({
        id,
        name: formatEmployeeNameWithCode(person.name, person.id),
        supervisorLabel: supervisorLabelForEmployee(person, getPerson),
        assignmentValid: isReviewerAssignmentValid(getEffectiveAssignment(id), person),
      })
    }
    participants.sort((a, b) => {
      if (a.assignmentValid !== b.assignmentValid) return a.assignmentValid ? 1 : -1
      return a.name.localeCompare(b.name)
    })
    return {
      inCycleCount: derivedParticipantIds.length,
      attentionCount: participants.filter((participant) => !participant.assignmentValid).length,
      participants,
    }
  }, [derivedParticipantIds, getEffectiveAssignment, getPerson])

  const removeParticipant = useCallback((employeeId: string) => {
    setIndividualEmployeeIds((prev) => prev.filter((id) => id !== employeeId))
    setReviewerAssignments((prev) => {
      if (!(employeeId in prev)) return prev
      const next = { ...prev }
      delete next[employeeId]
      return next
    })
  }, [])

  const handleParticipantPickerConfirm = useCallback(
    (ids: string[], assignments: Record<string, EmployeeReviewerAssignment>) => {
      setIndividualEmployeeIds((prev) => [...prev, ...ids.filter((id) => !prev.includes(id))])
      setReviewerAssignments((prev) => ({ ...prev, ...assignments }))
      setParticipantPickerOpen(false)
    },
    [],
  )

  const closeParticipantPicker = useCallback(() => setParticipantPickerOpen(false), [])

  const updateParticipantReviewer = useCallback(
    (employeeId: string, next: EmployeeReviewerAssignment) => {
      setReviewerAssignments((prev) => ({ ...prev, [employeeId]: next }))
      setAddedEmployeeTableKey((key) => key + 1)
    },
    [],
  )

  const addedEmployeeTableData = useMemo(
    () =>
      selectedEmployees
        .map((person) => {
          const assignment = getEffectiveAssignment(person.id)
          return {
            id: person.id,
            name: formatEmployeeNameWithCode(person.name, person.id),
            title: person.title,
            department: person.department,
            reviewerType: assignment.type,
            noSupervisorOnFile: isSupervisorAssignmentMissing(person, defaultReviewerAssignment()),
          }
        })
        .sort((a, b) => {
          if (a.noSupervisorOnFile !== b.noSupervisorOnFile) return a.noSupervisorOnFile ? -1 : 1
          return a.name.localeCompare(b.name)
        }),
    [selectedEmployees, getEffectiveAssignment],
  )

  const renderAddedEmployeeReviewerCell = useCallback(
    (record: { id: string; name: string }) => {
      const person = getPerson(record.id)
      const assignment = getEffectiveAssignment(record.id)
      const supervisorId = resolveEffectiveSupervisorId(person, assignment) ?? ''
      const supervisorName = supervisorId ? getPerson(supervisorId)?.name ?? '—' : ''
      return createReviewerAssignmentCell(
        assignment,
        managerOptions,
        (type) =>
          updateParticipantReviewer(
            record.id,
            type === 'custom'
              ? { type: 'custom', customManagerId: assignment.customManagerId ?? '' }
              : { type: type as ReviewerRoleType },
          ),
        (managerId) =>
          updateParticipantReviewer(record.id, { type: 'custom', customManagerId: managerId }),
        `Reviewer for ${record.name}`,
        assignment.type === 'supervisor'
          ? {
              supervisorMissing: isSupervisorAssignmentMissing(person, assignment),
              supervisorLabel: supervisorName
                ? `Supervisor — ${supervisorName}`
                : 'Supervisor — not on file',
            }
          : undefined,
      )
    },
    [getEffectiveAssignment, getPerson, managerOptions, updateParticipantReviewer],
  )

  const addedEmployeeTableColumns = useMemo(
    () => [
      { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
      { id: 'title', header: 'Title', accessor: 'title', sortable: true },
      { id: 'department', header: 'Department', accessor: 'department', sortable: true },
      {
        id: 'reviewer',
        header: 'Reviewer',
        accessor: 'reviewerType',
        sortable: false,
        className: 'tq-table-reviewer-cell',
        cellRenderer: (_value: unknown, row: unknown) =>
          renderAddedEmployeeReviewerCell(row as { id: string; name: string }),
      },
      {
        id: 'actions',
        header: '',
        accessor: 'id',
        sortable: false,
        cellRenderer: (_value: unknown, row: unknown) => {
          const record = row as { id: string; name: string }
          const button = createTableActionButton(
            'Remove',
            () => removeParticipant(record.id),
            'danger',
          )
          button.setAttribute('aria-label', `Remove ${record.name} from review`)
          return button
        },
      },
    ],
    [removeParticipant, renderAddedEmployeeReviewerCell],
  )

  const participantStatusLabel = useMemo(() => {
    const employeePart =
      derivedParticipantIds.length === 1
        ? '1 employee selected'
        : `${derivedParticipantIds.length} employees selected`
    const reviewerPart =
      cycleParticipantSummary.attentionCount === 0
        ? derivedParticipantIds.length === 0
          ? 'No reviewer assignments yet'
          : 'All reviewers assigned'
        : cycleParticipantSummary.attentionCount === 1
          ? '1 needs reviewer'
          : `${cycleParticipantSummary.attentionCount} need reviewer`
    return `${employeePart} · ${reviewerPart}`
  }, [derivedParticipantIds.length, cycleParticipantSummary.attentionCount])

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

  const canSaveDraft = () => {
    if (cycleName.trim().length === 0) return false
    if (stepIndex === 0) return true
    return isTemplateValid()
  }

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
    launchCycle(cycleInput, {
      reviewerAssignments: reviewerAssignmentsForLaunch,
      existingCycleId: draftCycle?.id,
    })
  }

  const handleSaveDraft = () => {
    if (!canSaveDraft()) return
    const cycleInput = buildCycleInput({
      allowEmptyTemplate: stepIndex === 0,
    })
    if (!cycleInput) return
    saveCycleDraft(cycleInput, {
      reviewerAssignments: reviewerAssignmentsForLaunch,
      existingCycleId: draftCycle?.id,
    })
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
            title={draftCycle ? 'Edit draft review cycle' : 'Launch performance review cycle'}
            subtitle={
              draftCycle
                ? 'Pick up where you left off. Save the draft again or publish when it is ready.'
                : 'Configure the cycle, template, workflow, and participants before launching.'
            }
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
              allowManagerSupportingDocuments={allowManagerSupportingDocuments}
              onAllowManagerSupportingDocumentsChange={setAllowManagerSupportingDocuments}
            />
          </ModusWcCard>
        )}

        {stepIndex === 3 && (
          <ModusWcCard bordered padding="compact" customClass={`${LAUNCH_WIZARD_CARD} tq-table-card`}>
            <div slot="title" className="tq-launch-wizard__title-row mb-4 gap-3">
              <div className="flex min-w-0 flex-col gap-2">
                <ModusWcTypography
                  hierarchy="h4"
                  size="md"
                  weight="semibold"
                  label="Step 4 — Participants"
                />
                <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={participantStatusLabel} />
              </div>
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                onButtonClick={() => setParticipantPickerOpen(true)}
              >
                <ModusWcIcon name="add" size="xs" decorative />
                Add employees
              </ModusWcButton>
            </div>
            <div className="flex flex-col gap-3">
              <CycleParticipantSummaryPanel summary={cycleParticipantSummary} />
              <div
                className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-[var(--modus-wc-color-base-200)] p-6"
                hidden={derivedParticipantIds.length > 0}
              >
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label="No employees added yet. Add employees to choose who is included in this review and who reviews them."
                />
                <ModusWcButton
                  variant="filled"
                  color="primary"
                  size="sm"
                  onButtonClick={() => setParticipantPickerOpen(true)}
                >
                  <ModusWcIcon name="add" size="xs" decorative />
                  Add employees
                </ModusWcButton>
              </div>
              <div className="flex flex-col gap-2" hidden={derivedParticipantIds.length === 0}>
                <ModusWcTypography
                  hierarchy="h4"
                  size="sm"
                  weight="semibold"
                  label="Employees in this review"
                />
                <PerformanceDataTable
                  key={addedEmployeeTableKey}
                  caption="Employees added to this review cycle"
                  columns={addedEmployeeTableColumns}
                  data={addedEmployeeTableData}
                  density="comfortable"
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
            allowManagerSupportingDocuments={allowManagerSupportingDocuments}
            selectedEmployees={selectedEmployees}
            conflictsWereResolved={derivedParticipantIds.every((id) =>
              isReviewerAssignmentValid(getEffectiveAssignment(id), getPerson(id)),
            )}
            getPerson={getPerson}
          />
        )}

          </div>
        </div>

        <LaunchCycleParticipantPickerModal
          open={participantPickerOpen}
          excludedIds={derivedParticipantIds}
          employeePool={employeePool}
          managerOptions={managerOptions}
          getPerson={getPerson}
          onCancel={closeParticipantPicker}
          onConfirm={handleParticipantPickerConfirm}
        />

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
                <ModusWcButton
                  variant="outlined"
                  color="tertiary"
                  size="sm"
                  {...(!canSaveDraft() ? { disabled: true } : {})}
                  onButtonClick={handleSaveDraft}
                >
                  Save Draft
                </ModusWcButton>
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
