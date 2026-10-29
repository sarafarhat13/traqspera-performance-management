import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcDate,
  ModusWcIcon,
  ModusWcModal,
  ModusWcProgress,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { canCompleteReviewCycle } from '../utils/cycleFinalApproval'
import { computeCycleStats } from '../utils/cycleStats'
import { readInputString } from '../utils/modusFormEvents'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { formatDate, isReviewDateRangeValid } from '../utils/status'
import {
  computeCycleDueDateFromWorkflow,
  getCycleDisplayEndDate,
  getCycleDisplayStartDate,
} from '../utils/cycleDisplay'
import { CycleStatusBadge } from './CycleStatusBadge'
import { PerformanceDataTable } from './PerformanceDataTable'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import {
  createManagerSelectCell,
  createStageDueCell,
  createTableActionButton,
  createReviewDisplayStatusBadge,
} from '../utils/modusTableCells'
import { reviewReviewerDisplayName, reviewerPreviewLabel } from '../utils/reviewer'
import {
  costCenterOptionsFromPeople,
  countActiveDashboardFilters,
  createDefaultDashboardFilters,
  departmentOptionsFromPeople,
  reviewMatchesDashboardFilters,
  ratingOptionsFromCycle,
  reviewerOptionsFromReviews,
  titleOptionsFromPeople,
  unionOptionsFromPeople,
  type DashboardFilters,
  type DashboardReviewStatusFilter,
} from '../utils/dashboardFilters'
import {
  cycleIncludesRatingScale,
  getReviewCycleStageChipStatus,
  type CycleStageChipStatus,
  getReviewDisplayStatus,
  getReviewWorkflowStage,
  reviewOverallRatingLabel,
  stepDeadlineOrCycleEnd,
  WORKFLOW_STEP_META,
  workflowFromLegacy,
  type CycleWorkflowStageCard,
} from '../utils/workflow'
import type { WorkflowStepType } from '../types'
import type { ReviewDisplayStatus } from '../utils/status'
import {
  CycleWorkflowStageCards,
  type CycleWorkflowStageFilter,
} from './CycleWorkflowStageCards'
import { PerformanceDashboardFilterBar } from './PerformanceDashboardFilterBar'
import { ReviewCycleCompleteModal } from './ReviewCycleCompleteModal'
import { TemplateEmployeePreview } from './TemplateEmployeePreview'
import { useModusDialog } from '../utils/useModusDialog'
import type { Person } from '../types'

function stageChipMatchesStatusFilter(
  chipStatus: CycleStageChipStatus,
  filter: DashboardReviewStatusFilter,
): boolean {
  if (filter === 'all') return true
  if (filter === 'pending' || filter === 'overdue') return chipStatus === filter
  return true
}

const CYCLE_EDIT_MODAL_ID = 'cycle-edit-modal'
const CYCLE_DETAIL_TEMPLATE_PREVIEW_MODAL_ID = 'cycle-detail-template-preview'

export function CycleDetailView() {
  const {
    state,
    setView,
    openEmployeeReview,
    getCycle,
    getTemplate,
    getPerson,
    getReviewGroup,
    selectCycle,
    updateReviewManager,
    updateCycle,
  } = usePerformance()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [templatePreviewOpen, setTemplatePreviewOpen] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftSelfEvalDue, setDraftSelfEvalDue] = useState('')
  const [draftManagerDue, setDraftManagerDue] = useState('')
  const [draftAckDue, setDraftAckDue] = useState('')
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultDashboardFilters())
  const [workflowStageFilter, setWorkflowStageFilter] = useState<CycleWorkflowStageFilter>('all')
  const [filterFieldsKey, setFilterFieldsKey] = useState(0)

  const cycle = state.selectedCycleId ? getCycle(state.selectedCycleId) : undefined
  /** Cycle details is the HR cycle administration surface in this prototype. */
  const canManageCycleAdmin = Boolean(cycle)

  useEffect(() => {
    setFilters(createDefaultDashboardFilters())
    setWorkflowStageFilter('all')
    setFilterFieldsKey((key) => key + 1)
    setTemplatePreviewOpen(false)
  }, [cycle?.id])

  const managerOptions = useMemo(
    () =>
      state.people
        .filter((person) => person.role === 'manager')
        .map((person) => ({ label: person.name, value: person.id }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    [state.people],
  )

  const template = cycle ? getTemplate(cycle.templateId) : undefined

  const closeTemplatePreview = useCallback(() => {
    setTemplatePreviewOpen(false)
  }, [])

  const { requestClose: closeTemplatePreviewDialog, requestOpen: openTemplatePreviewDialog } =
    useModusDialog(
      CYCLE_DETAIL_TEMPLATE_PREVIEW_MODAL_ID,
      templatePreviewOpen,
      closeTemplatePreview,
    )

  const openTemplatePreview = useCallback(() => {
    setTemplatePreviewOpen(true)
    openTemplatePreviewDialog()
  }, [openTemplatePreviewDialog])

  const cycleAttachedGroups = useMemo(() => {
    if (!cycle?.attachedGroupIds?.length) return []
    return cycle.attachedGroupIds
      .map((id) => getReviewGroup(id))
      .filter((group): group is NonNullable<typeof group> => Boolean(group))
  }, [cycle?.attachedGroupIds, getReviewGroup])

  const cyclePeople = useMemo(() => {
    if (!cycle) return [] as Person[]
    const employeeIds = new Set([
      ...cycle.employeeIds,
      ...state.reviews
        .filter((review) => review.cycleId === cycle.id)
        .map((review) => review.employeeId),
    ])
    return state.people.filter((person) => employeeIds.has(person.id))
  }, [cycle, state.reviews, state.people])

  const departmentOptions = useMemo(
    () => departmentOptionsFromPeople(cyclePeople),
    [cyclePeople],
  )

  const costCenterOptions = useMemo(
    () => costCenterOptionsFromPeople(cyclePeople),
    [cyclePeople],
  )

  const titleOptions = useMemo(() => titleOptionsFromPeople(cyclePeople), [cyclePeople])

  const unionOptions = useMemo(() => unionOptionsFromPeople(cyclePeople), [cyclePeople])

  const cycleReviews = useMemo(
    () => (cycle ? state.reviews.filter((review) => review.cycleId === cycle.id) : []),
    [cycle, state.reviews],
  )

  const reviewerOptions = useMemo(
    () => reviewerOptionsFromReviews(cycleReviews, getPerson),
    [cycleReviews, getPerson],
  )

  const ratingOptions = useMemo(
    () => (cycle && cycleIncludesRatingScale(cycle) ? ratingOptionsFromCycle(cycle) : undefined),
    [cycle],
  )

  const cycleReviewsMatchingPanelFilters = useMemo(() => {
    if (!cycle) return []
    return state.reviews
      .filter((review) => review.cycleId === cycle.id)
      .filter((review) => {
        const employee = getPerson(review.employeeId)
        return reviewMatchesDashboardFilters(review, cycle, employee, { ...filters, status: 'all' }, undefined, {
          getPerson,
        })
      })
  }, [cycle, state.reviews, filters, getPerson])

  const showStageStatusChips =
    workflowStageFilter !== 'all' && workflowStageFilter !== 'complete'

  const reviewStatusCounts = useMemo(() => {
    if (!cycle || !showStageStatusChips) return undefined
    const stage = workflowStageFilter as Exclude<CycleWorkflowStageCard, 'complete'>
    const counts = { all: 0, pending: 0, overdue: 0, completed: 0, draft: 0 }
    for (const review of cycleReviewsMatchingPanelFilters) {
      const chipStatus = getReviewCycleStageChipStatus(cycle, review, stage)
      if (!chipStatus) continue
      counts.all += 1
      counts[chipStatus] += 1
    }
    return counts
  }, [cycle, cycleReviewsMatchingPanelFilters, showStageStatusChips, workflowStageFilter])

  const handleWorkflowStageChange = useCallback((stage: CycleWorkflowStageFilter) => {
    setWorkflowStageFilter(stage)
    setFilters((current) => ({ ...current, status: 'all' }))
  }, [])

  const activeFilterCount = useMemo(() => {
    let count = countActiveDashboardFilters(filters)
    if (workflowStageFilter !== 'all') count += 1
    return count
  }, [filters, workflowStageFilter])

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const clearFilters = useCallback(() => {
    requestAnimationFrame(() => {
      setFilters(createDefaultDashboardFilters())
      setWorkflowStageFilter('all')
      setFilterFieldsKey((key) => key + 1)
    })
  }, [])

  useEffect(() => {
    const dialog = document.getElementById(CYCLE_EDIT_MODAL_ID) as HTMLDialogElement | null
    if (!dialog) return

    const handleClose = () => setEditModalOpen(false)
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [])

  useEffect(() => {
    const dialog = document.getElementById(CYCLE_EDIT_MODAL_ID) as HTMLDialogElement | null
    if (editModalOpen) {
      dialog?.showModal()
      return
    }
    dialog?.close()
  }, [editModalOpen])

  const workflowForCycle = useMemo(() => {
    if (!cycle) return []
    return cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
  }, [cycle])

  const workflowStepEnabled = useCallback(
    (type: WorkflowStepType) =>
      workflowForCycle.some((step) => step.type === type && step.enabled),
    [workflowForCycle],
  )

  const openEditModal = () => {
    if (!cycle) return
    const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)
    const dueFor = (type: WorkflowStepType) => {
      const step = workflow.find((s) => s.type === type)
      return stepDeadlineOrCycleEnd(cycle, step)
    }
    setDraftName(cycle.name)
    setDraftSelfEvalDue(workflowStepEnabled('employee') ? dueFor('employee') : '')
    setDraftManagerDue(workflowStepEnabled('manager') ? dueFor('manager') : '')
    setDraftAckDue(workflowStepEnabled('acknowledgement') ? dueFor('acknowledgement') : '')
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    const dialog = document.getElementById(CYCLE_EDIT_MODAL_ID) as HTMLDialogElement | null
    dialog?.close()
  }

  const cycleEditDatesValid = useMemo(() => {
    if (!cycle) return false
    const checks: string[] = []
    if (workflowStepEnabled('employee')) checks.push(draftSelfEvalDue)
    if (workflowStepEnabled('manager')) checks.push(draftManagerDue)
    if (workflowStepEnabled('acknowledgement')) checks.push(draftAckDue)
    if (checks.length === 0) return true
    const cycleStart =
      getCycleDisplayStartDate(cycle) || new Date().toISOString().slice(0, 10)
    return checks.every((date) => isReviewDateRangeValid(cycleStart, date))
  }, [
    cycle,
    draftSelfEvalDue,
    draftManagerDue,
    draftAckDue,
    workflowStepEnabled,
  ])

  const canSaveCycleEdit =
    draftName.trim().length > 0 && Boolean(cycle) && cycleEditDatesValid

  const handleSaveCycleEdit = () => {
    if (!cycle || !canSaveCycleEdit) return
    if (cycle.status === 'active' || cycle.status === 'draft') {
      const workflow = cycle.workflow ?? workflowFromLegacy(cycle.includesSelfEvaluation)

      let nextWorkflow = workflow
      const applyStepDeadline = (type: WorkflowStepType, date: string) => {
        nextWorkflow = nextWorkflow.map((step) =>
          step.type === type ? { ...step, deadline: date } : step,
        )
      }
      if (workflowStepEnabled('employee')) {
        applyStepDeadline('employee', draftSelfEvalDue)
      }
      if (workflowStepEnabled('manager')) {
        applyStepDeadline('manager', draftManagerDue)
      }
      if (workflowStepEnabled('acknowledgement')) {
        applyStepDeadline('acknowledgement', draftAckDue)
      }

      const latestDue = computeCycleDueDateFromWorkflow(nextWorkflow, cycle.dueDate)

      updateCycle(cycle.id, {
        name: draftName.trim(),
        dueDate: latestDue,
        workflow: nextWorkflow,
      })
    }
    closeEditModal()
  }

  const stats = useMemo(
    () => (cycle ? computeCycleStats(cycle, state.reviews) : null),
    [cycle, state.reviews],
  )

  const canCompleteCycle =
    Boolean(cycle) && canCompleteReviewCycle(cycle!, state.reviews)

  const openCompleteCycleModal = () => {
    setCloseModalOpen(true)
  }

  const tableData = useMemo(() => {
    if (!cycle) return []
    return cycleReviewsMatchingPanelFilters
      .filter((review) => {
        if (workflowStageFilter !== 'all') {
          const stage = getReviewWorkflowStage(cycle, review)
          if (stage !== workflowStageFilter) return false
        }

        if (showStageStatusChips && filters.status !== 'all') {
          const chipStatus = getReviewCycleStageChipStatus(
            cycle,
            review,
            workflowStageFilter as Exclude<CycleWorkflowStageCard, 'complete'>,
          )
          if (!chipStatus) return false
          if (!stageChipMatchesStatusFilter(chipStatus, filters.status as DashboardReviewStatusFilter)) return false
        }

        return true
      })
      .map((review) => {
        const employee = getPerson(review.employeeId)
        return {
          id: review.id,
          employeeName: employee
            ? formatEmployeeNameWithCode(employee.name, employee.id)
            : 'Unknown',
          department: employee?.department ?? '—',
          managerId: review.managerId,
          managerName: reviewReviewerDisplayName(review, getPerson),
          displayStatus: (cycle ? getReviewDisplayStatus(cycle, review) : 'not_started') as ReviewDisplayStatus,
          overallRating: reviewOverallRatingLabel(cycle, review) ?? '—',
        }
      })
  }, [cycle, cycleReviewsMatchingPanelFilters, filters.status, getPerson, showStageStatusChips, workflowStageFilter])

  const employeeTableColumns = useMemo(
    () => [
      {
        id: 'employee',
        header: 'Employee',
        accessor: 'employeeName',
        sortable: true,
        cellRenderer: (value: unknown, row: unknown) =>
          createTableActionButton(String(value), () =>
            openEmployeeReview(String((row as { id: string }).id)),
          ),
      },
      { id: 'department', header: 'Department', accessor: 'department', sortable: true },
      {
        id: 'manager',
        header: 'Assign reviewer',
        accessor: 'managerName',
        sortable: true,
        cellRenderer: (_value: unknown, row: unknown) => {
          const record = row as {
            id: string
            managerId: string
            managerName: string
            employeeName: string
            displayStatus: ReviewDisplayStatus
          }
          const reviewComplete = record.displayStatus === 'complete'
          return createManagerSelectCell(
            record.managerId,
            managerOptions,
            (managerId) => updateReviewManager(record.id, managerId),
            reviewComplete
              ? `Reviewer for ${record.employeeName} (review complete)`
              : `Assign manager for ${record.employeeName}`,
            reviewComplete,
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessor: 'displayStatus',
        sortable: true,
        cellRenderer: (_value: unknown, row: unknown) =>
          createReviewDisplayStatusBadge(
            (row as { displayStatus: ReviewDisplayStatus }).displayStatus,
            { forTable: true },
          ),
      },
      {
        id: 'rating',
        header: 'Rating',
        accessor: 'overallRating',
        sortable: true,
      },
      {
        id: 'stageDue',
        header: 'Current stage due',
        accessor: 'id',
        sortable: false,
        cellRenderer: (_v: unknown, row: unknown) => {
          const reviewId = String((row as { id: string }).id)
          const review = state.reviews.find((r) => r.id === reviewId)
          if (!review || !cycle) {
            const empty = document.createElement('span')
            empty.textContent = '—'
            return empty
          }
          return createStageDueCell(cycle, review, {
            personId: state.activePersonId,
          })
        },
      },
      {
        id: 'actions',
        header: '',
        accessor: 'id',
        sortable: false,
        cellRenderer: (value: unknown) =>
          createTableActionButton('View employee', () => openEmployeeReview(String(value))),
      },
    ],
    [
      cycle,
      managerOptions,
      openEmployeeReview,
      state.activePersonId,
      state.reviews,
      updateReviewManager,
    ],
  )

  if (!cycle) {
    return (
      <TraqsperaPageBody>
        <TraqsperaPageHeader
          title="Review cycle"
          onBack={() => setView('hr_dashboard')}
          backAriaLabel="Back to dashboard"
        />
        <ModusWcTypography hierarchy="p" size="md" label="Select a review cycle to view details." />
      </TraqsperaPageBody>
    )
  }

  const handleBackToCycles = () => {
    selectCycle(null)
    setView('hr_dashboard')
  }

  const description =
    cycle.description?.trim() ||
    template?.description?.trim() ||
    'Performance review cycle'

  return (
    <TraqsperaPageBody>
      <div className="flex flex-col gap-3">
        <TraqsperaPageHeader
          title={cycle.name}
          subtitle={description}
          onBack={handleBackToCycles}
          backAriaLabel="Back to review cycles"
          actions={
            canManageCycleAdmin && cycle.status === 'active' ? (
              <ModusWcButton
                variant="filled"
                color="primary"
                size="sm"
                disabled={!canCompleteCycle}
                onButtonClick={openCompleteCycleModal}
              >
                <ModusWcIcon name="check_circle" size="xs" decorative />
                Complete cycle
              </ModusWcButton>
            ) : undefined
          }
        />

        <ModusWcModal
          modalId={CYCLE_EDIT_MODAL_ID}
          backdrop="default"
          position="center"
          showClose
          aria-label="Edit review cycle"
        >
          <span slot="header">Edit review cycle</span>
          <div slot="content" className="flex flex-col gap-3">
            {cycle.status === 'active' || cycle.status === 'draft' ? (
              <>
                <ModusWcTextInput
                  label="Review cycle name"
                  size="sm"
                  required
                  value={draftName}
                  onInputChange={(e) => setDraftName(readInputString(e as CustomEvent))}
                />
                {workflowStepEnabled('employee') && (
                  <ModusWcDate
                    label={WORKFLOW_STEP_META.employee.dueDateLabel}
                    size="sm"
                    required
                    value={draftSelfEvalDue}
                    onInputChange={(e) => setDraftSelfEvalDue(readInputString(e as CustomEvent))}
                  />
                )}
                {workflowStepEnabled('manager') && (
                  <ModusWcDate
                    label={WORKFLOW_STEP_META.manager.dueDateLabel}
                    size="sm"
                    required
                    value={draftManagerDue}
                    onInputChange={(e) => setDraftManagerDue(readInputString(e as CustomEvent))}
                  />
                )}
                {workflowStepEnabled('acknowledgement') && (
                  <ModusWcDate
                    label={WORKFLOW_STEP_META.acknowledgement.dueDateLabel}
                    size="sm"
                    required
                    value={draftAckDue}
                    onInputChange={(e) => setDraftAckDue(readInputString(e as CustomEvent))}
                  />
                )}
                {!cycleEditDatesValid && (
                  <ModusWcTypography
                    hierarchy="p"
                    size="sm"
                    customClass="text-[var(--modus-wc-color-danger)]"
                    label="Each due date must be on or after the cycle start date."
                  />
                )}
              </>
            ) : (
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="This cycle is closed and cannot be edited."
              />
            )}
          </div>
          <div slot="footer" className="flex w-full justify-end gap-2">
            <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={closeEditModal}>
              Cancel
            </ModusWcButton>
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              disabled={!canSaveCycleEdit}
              onButtonClick={handleSaveCycleEdit}
            >
              <ModusWcIcon name="save" size="xs" decorative />
              Save changes
            </ModusWcButton>
          </div>
        </ModusWcModal>

        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <div slot="title" className="flex w-full min-w-0 items-center justify-between gap-3 mb-4">
            <ModusWcTypography
              hierarchy="h4"
              size="md"
              weight="semibold"
              customClass="!m-0"
              label="Cycle Summary"
            />
            <div className="flex shrink-0 items-center gap-2">
              <CycleStatusBadge status={cycle.status} />
              {canManageCycleAdmin && (
                <ModusWcButton
                  variant="borderless"
                  color="tertiary"
                  shape="square"
                  size="sm"
                  aria-label="Edit review cycle"
                  onButtonClick={openEditModal}
                >
                  <ModusWcIcon name="pencil" size="xs" decorative />
                </ModusWcButton>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Created by" />
              <ModusWcTypography hierarchy="p" size="sm" label={cycle.createdBy ?? 'HR Admin'} />
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Start date" />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                label={
                  getCycleDisplayStartDate(cycle)
                    ? formatDate(getCycleDisplayStartDate(cycle))
                    : '—'
                }
              />
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="End date" />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                label={formatDate(getCycleDisplayEndDate(cycle))}
              />
            </div>
            <div className="min-w-0">
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Template" />
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="!m-0 min-w-0"
                  label={template?.name ?? '—'}
                />
                {template ? (
                  <ModusWcButton
                    variant="outlined"
                    color="tertiary"
                    size="xs"
                    onButtonClick={openTemplatePreview}
                  >
                    <ModusWcIcon name="visibility_on" size="xs" decorative />
                    Preview
                  </ModusWcButton>
                ) : null}
              </div>
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Employees" />
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                label={String(stats?.totalEmployees ?? cycle.employeeIds.length)}
              />
            </div>
          </div>
          {stats && (
            <div className="mt-4 flex flex-col gap-1">
              <ModusWcProgress
                value={stats.percentComplete}
                max={100}
                aria-label={`${cycle.name} completion progress`}
                customClass="w-full"
              />
              <ModusWcTypography
                hierarchy="p"
                size="xs"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label={`${stats.percentComplete}% complete`}
              />
            </div>
          )}
        </ModusWcCard>

        <ReviewCycleCompleteModal
          cycle={cycle}
          isOpen={closeModalOpen}
          onClose={() => setCloseModalOpen(false)}
        />

        <CycleWorkflowStageCards
          cycle={cycle}
          reviews={cycleReviewsMatchingPanelFilters}
          activeStage={workflowStageFilter}
          onStageChange={handleWorkflowStageChange}
        />

        {cycleAttachedGroups.length > 0 ? (
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <div slot="title" className="flex w-full min-w-0 items-center gap-2 mb-4">
              <ModusWcIcon name="people_group" decorative />
              <ModusWcTypography
                hierarchy="h4"
                size="md"
                weight="semibold"
                label="Review groups in this cycle"
              />
            </div>
            <ul className="flex list-none flex-col gap-2 p-0">
              {cycleAttachedGroups.map((group) => {
                const previewPerson =
                  (group.memberIds[0] ? getPerson(group.memberIds[0]) : undefined) ??
                  cyclePeople[0]
                const reviewerLabel = previewPerson
                  ? reviewerPreviewLabel(
                      previewPerson,
                      group.defaultReviewerAssignment,
                      getPerson,
                    )
                  : '—'
                const membersInCycle = group.memberIds.filter((id) =>
                  cycle.employeeIds.includes(id),
                ).length
                return (
                  <li key={group.id}>
                    <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={group.name} />
                    <ModusWcTypography
                      hierarchy="p"
                      size="xs"
                      customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                      label={`${membersInCycle} employees in cycle · ${reviewerLabel}`}
                    />
                  </li>
                )
              })}
            </ul>
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              customClass="mt-3 text-[var(--modus-wc-color-base-content-low-contrast)]"
              label="The participant list below includes all employees in this cycle, including those added individually."
            />
          </ModusWcCard>
        ) : null}

        <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
          <div slot="title" className="flex w-full min-w-0 items-center gap-2 mb-4">
            <ModusWcIcon name="group" decorative />
            <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Employees" />
          </div>
          <div className="flex flex-col gap-3">
            <PerformanceDashboardFilterBar
              filters={filters}
              counts={reviewStatusCounts}
              departmentOptions={departmentOptions}
              costCenterOptions={costCenterOptions}
              titleOptions={titleOptions}
              unionOptions={unionOptions}
              reviewerOptions={reviewerOptions}
              ratingOptions={ratingOptions}
              activeFilterCount={activeFilterCount}
              filterFieldsKey={filterFieldsKey}
              showViewToggle={false}
              showStatusChips={showStageStatusChips}
              statusFilterMode="cycleDetail"
              searchAriaLabel="Search by employee name, department, cost center, title, or reviewer"
              filterPanelId="cycle-detail-filter-panel"
              onFiltersChange={updateFilters}
              onClearFilters={clearFilters}
            />
            {tableData.length === 0 ? (
              <div className="flex flex-col gap-3">
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                  label="No employees match the current filters. Try adjusting search, status, department, rating, or workflow stage."
                />
                {activeFilterCount > 0 && (
                  <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={clearFilters}>
                    Clear filters
                  </ModusWcButton>
                )}
              </div>
            ) : (
              <PerformanceDataTable
                caption={`Employees in ${cycle.name}`}
                columns={employeeTableColumns}
                data={tableData}
              />
            )}
          </div>
        </ModusWcCard>

        <ModusWcModal
          modalId={CYCLE_DETAIL_TEMPLATE_PREVIEW_MODAL_ID}
          backdrop="default"
          position="center"
          showClose={true}
          customClass="tq-launch-wizard-template-preview-dialog"
          aria-label="Template preview"
        >
          <span slot="header" className="tq-launch-wizard-template-preview-modal-title">
            {template?.name.trim() || 'Template preview'}
          </span>
          <div slot="content" className="tq-launch-wizard-template-preview-modal flex flex-col">
            {template ? <TemplateEmployeePreview key={template.id} template={template} /> : null}
          </div>
          <div slot="footer" className="flex w-full justify-end">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={closeTemplatePreviewDialog}
            >
              Close
            </ModusWcButton>
          </div>
        </ModusWcModal>
      </div>
    </TraqsperaPageBody>
  )
}
