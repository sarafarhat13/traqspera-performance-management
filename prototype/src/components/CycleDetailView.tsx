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
import { computeCycleStats } from '../utils/cycleStats'
import { readInputString } from '../utils/modusFormEvents'
import { formatDate, isReviewDateRangeValid } from '../utils/status'
import { CycleStatusBadge } from './CycleStatusBadge'
import { PerformanceDataTable } from './PerformanceDataTable'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import {
  createManagerSelectCell,
  createReviewStatusBadge,
  createStageDueCell,
  createTableActionButton,
} from '../utils/modusTableCells'
import { reviewReviewerDisplayName } from '../utils/reviewer'
import {
  computeDashboardReviewCounts,
  costCenterOptionsFromPeople,
  countActiveDashboardFilters,
  createDefaultDashboardFilters,
  departmentOptionsFromPeople,
  reviewMatchesDashboardFilters,
  titleOptionsFromPeople,
  unionOptionsFromPeople,
  type DashboardFilters,
} from '../utils/dashboardFilters'
import { PerformanceDashboardFilterBar } from './PerformanceDashboardFilterBar'
import type { Person, ReviewStatus } from '../types'

const CYCLE_EDIT_MODAL_ID = 'cycle-edit-modal'

export function CycleDetailView() {
  const {
    state,
    setView,
    openEmployeeReview,
    getCycle,
    getTemplate,
    getPerson,
    selectCycle,
    updateReviewManager,
    updateCycle,
  } = usePerformance()

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [draftName, setDraftName] = useState('')
  const [draftDueDate, setDraftDueDate] = useState('')
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultDashboardFilters())
  const [filterFieldsKey, setFilterFieldsKey] = useState(0)

  const cycle = state.selectedCycleId ? getCycle(state.selectedCycleId) : undefined

  useEffect(() => {
    setFilters(createDefaultDashboardFilters())
    setFilterFieldsKey((key) => key + 1)
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

  const cyclePeople = useMemo(() => {
    if (!cycle) return [] as Person[]
    const employeeIds = new Set(
      state.reviews.filter((review) => review.cycleId === cycle.id).map((review) => review.employeeId),
    )
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

  const reviewCounts = useMemo(() => {
    if (!cycle) {
      return { all: 0, pending: 0, completed: 0, overdue: 0, draft: 0 }
    }
    return computeDashboardReviewCounts([cycle], state.reviews, state.people, {
      search: filters.search,
      department: filters.department,
      costCenter: filters.costCenter,
      title: filters.title,
      union: filters.union,
    })
  }, [cycle, state.reviews, state.people, filters])

  const activeFilterCount = useMemo(() => countActiveDashboardFilters(filters), [filters])

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const clearFilters = useCallback(() => {
    requestAnimationFrame(() => {
      setFilters(createDefaultDashboardFilters())
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

  const openEditModal = () => {
    if (!cycle) return
    setDraftName(cycle.name)
    setDraftDueDate(cycle.dueDate)
    setEditModalOpen(true)
  }

  const closeEditModal = () => {
    setEditModalOpen(false)
    const dialog = document.getElementById(CYCLE_EDIT_MODAL_ID) as HTMLDialogElement | null
    dialog?.close()
  }

  const canSaveCycleEdit =
    draftName.trim().length > 0 &&
    Boolean(cycle) &&
    isReviewDateRangeValid(cycle!.startDate, draftDueDate)

  const handleSaveCycleEdit = () => {
    if (!cycle || !canSaveCycleEdit) return
    updateCycle(cycle.id, { name: draftName.trim(), dueDate: draftDueDate })
    closeEditModal()
  }

  const stats = useMemo(
    () => (cycle ? computeCycleStats(cycle, state.reviews) : null),
    [cycle, state.reviews],
  )

  const tableData = useMemo(() => {
    if (!cycle) return []
    return state.reviews
      .filter((review) => review.cycleId === cycle.id)
      .filter((review) => {
        const employee = getPerson(review.employeeId)
        return reviewMatchesDashboardFilters(review, cycle, employee, filters)
      })
      .map((review) => {
        const employee = getPerson(review.employeeId)
        return {
          id: review.id,
          employeeName: employee?.name ?? 'Unknown',
          department: employee?.department ?? '—',
          managerId: review.managerId,
          managerName: reviewReviewerDisplayName(review, getPerson),
          reviewerType: review.reviewerType,
          status: review.status,
          statusLabel: review.status,
        }
      })
  }, [cycle, state.reviews, getPerson, filters])

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
        header: 'Reviewer',
        accessor: 'managerName',
        sortable: true,
        cellRenderer: (_value: unknown, row: unknown) => {
          const record = row as {
            id: string
            managerId: string
            managerName: string
            employeeName: string
            reviewerType?: string
          }
          return createManagerSelectCell(
            record.managerId,
            managerOptions,
            (managerId) => updateReviewManager(record.id, managerId),
            `Assign manager for ${record.employeeName}`,
          )
        },
      },
      {
        id: 'status',
        header: 'Status',
        accessor: 'statusLabel',
        sortable: true,
        cellRenderer: (_v: unknown, row: unknown) =>
          createReviewStatusBadge((row as { status: ReviewStatus }).status),
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
            <ModusWcTextInput
              label="Review cycle name"
              size="sm"
              required
              value={draftName}
              onInputChange={(e) => setDraftName(readInputString(e as CustomEvent))}
            />
            <ModusWcDate
              label="End date"
              size="sm"
              required
              value={draftDueDate}
              onInputChange={(e) => setDraftDueDate(readInputString(e as CustomEvent))}
            />
            {!isReviewDateRangeValid(cycle.startDate, draftDueDate) && draftDueDate && (
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-danger)]"
                label="End date must be on or after the start date."
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
              {cycle.status === 'active' && (
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
              <ModusWcTypography hierarchy="p" size="sm" label={formatDate(cycle.startDate)} />
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="End date" />
              <ModusWcTypography hierarchy="p" size="sm" label={formatDate(cycle.dueDate)} />
            </div>
            <div>
              <ModusWcTypography hierarchy="p" size="xs" weight="semibold" label="Template" />
              <ModusWcTypography hierarchy="p" size="sm" label={template?.name ?? '—'} />
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
                label={`${stats.percentComplete}% complete • ${stats.completed} completed, ${stats.pending} pending, ${stats.overdue} overdue`}
              />
            </div>
          )}
        </ModusWcCard>

        <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
          <div slot="title" className="flex w-full min-w-0 items-center gap-2 mb-4">
            <ModusWcIcon name="group" decorative />
            <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Employees" />
          </div>
          <div className="flex flex-col gap-3">
            <PerformanceDashboardFilterBar
              filters={filters}
              counts={reviewCounts}
              departmentOptions={departmentOptions}
              costCenterOptions={costCenterOptions}
              titleOptions={titleOptions}
              unionOptions={unionOptions}
              activeFilterCount={activeFilterCount}
              filterFieldsKey={filterFieldsKey}
              showViewToggle={false}
              searchAriaLabel="Search by employee name, department, cost center, or title"
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
                  label="No employees match the current filters. Try adjusting search, department, or status."
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
      </div>
    </TraqsperaPageBody>
  )
}
