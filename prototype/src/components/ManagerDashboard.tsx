import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PerformanceDashboardKpiCard } from './PerformanceDashboardKpiCard'
import { PerformanceDashboardFilterBar } from './PerformanceDashboardFilterBar'
import { ManagerTeamReviewRow } from './ManagerTeamReviewRow'
import { PerformanceDataTable } from './PerformanceDataTable'
import { formatDate, MANAGER_DASHBOARD_STATUS_LABELS } from '../utils/status'
import {
  createManagerReviewStatusBadge,
  createTableActionButton,
  createTableActionGroup,
} from '../utils/modusTableCells'
import {
  countActiveDashboardFilters,
  costCenterOptionsFromPeople,
  createDefaultDashboardFilters,
  departmentOptionsFromPeople,
  filterReviewsForDashboard,
  computeScopedDashboardReviewCounts,
  titleOptionsFromPeople,
  unionOptionsFromPeople,
  type DashboardFilters,
} from '../utils/dashboardFilters'
import { getCurrentStageDeadline, hasManagerReviewDraft } from '../utils/workflow'
import type { PerformanceReview, Person, ReviewCycle, ReviewStatus, ReviewTemplate } from '../types'
import { resolveManagerDashboardPersonId } from '../utils/managerDashboardContext'

type ManagerDashboardViewMode = 'card' | 'table'

function reviewStatusPriority(status: ReviewStatus): number {
  switch (status) {
    case 'manager_pending':
      return 0
    case 'acknowledgement_pending':
      return 1
    case 'self_eval_pending':
      return 2
    case 'not_started':
      return 3
    case 'completed':
      return 4
    default:
      return 5
  }
}

function isCompletedThisQuarter(iso?: string): boolean {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3
  const quarterStart = new Date(now.getFullYear(), quarterStartMonth, 1)
  return date >= quarterStart
}

function reviewCompletedAt(review: PerformanceReview): string | undefined {
  return review.acknowledgement?.completedAt ?? review.managerReview?.completedAt
}

function buildReviewTableRows(
  reviews: PerformanceReview[],
  getPerson: (id: string) => Person | undefined,
  getCycle: (id: string) => ReviewCycle | undefined,
  getTemplate: (id: string) => ReviewTemplate | undefined,
) {
  return reviews.map((review) => {
    const employee = getPerson(review.employeeId)
    const cycle = getCycle(review.cycleId)
    const template = cycle ? getTemplate(cycle.templateId) : undefined
    const dueDate = cycle ? getCurrentStageDeadline(cycle, review) : undefined

    return {
      id: review.id,
      employeeName: employee?.name ?? 'Employee',
      title: employee?.title ?? '—',
      reviewName: template?.name ?? cycle?.name ?? 'Performance review',
      status: review.status,
      statusLabel: MANAGER_DASHBOARD_STATUS_LABELS[review.status],
      dueDate: dueDate ? formatDate(dueDate) : '—',
      selfEvalCompleted: review.selfEval?.completedAt
        ? formatDate(review.selfEval.completedAt)
        : '—',
      managerReviewDraft: hasManagerReviewDraft(review),
    }
  })
}

export function ManagerDashboard() {
  const {
    state,
    setView,
    setActivePersonId,
    selectReview,
    openEmployeeReview,
    getPerson,
    getCycle,
    getTemplate,
  } = usePerformance()

  const managerId = useMemo(
    () => resolveManagerDashboardPersonId(state.people, state.activePersonId),
    [state.people, state.activePersonId],
  )

  useEffect(() => {
    if (managerId !== state.activePersonId) {
      setActivePersonId(managerId)
    }
  }, [managerId, state.activePersonId, setActivePersonId])
  const [viewMode, setViewMode] = useState<ManagerDashboardViewMode>('card')
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultDashboardFilters())
  const [filterFieldsKey, setFilterFieldsKey] = useState(0)

  useEffect(() => {
    if (filters.status === 'draft' || filters.status === 'active') {
      setFilters((current) => ({ ...current, status: 'all' }))
    }
  }, [filters.status])

  const directReports = useMemo(
    () => state.people.filter((person) => person.managerId === managerId),
    [state.people, managerId],
  )

  const managerReviews = useMemo(
    () => state.reviews.filter((review) => review.managerId === managerId),
    [state.reviews, managerId],
  )

  const teamReviews = useMemo(() => {
    const reportIds = new Set(directReports.map((person) => person.id))
    const relevant = state.reviews.filter(
      (review) => review.managerId === managerId && reportIds.has(review.employeeId),
    )
    const byEmployee = new Map<string, PerformanceReview>()

    for (const review of relevant) {
      const existing = byEmployee.get(review.employeeId)
      if (!existing || reviewStatusPriority(review.status) < reviewStatusPriority(existing.status)) {
        byEmployee.set(review.employeeId, review)
      }
    }

    return Array.from(byEmployee.values()).sort((left, right) => {
      const priorityDelta =
        reviewStatusPriority(left.status) - reviewStatusPriority(right.status)
      if (priorityDelta !== 0) return priorityDelta

      const leftName = getPerson(left.employeeId)?.name ?? ''
      const rightName = getPerson(right.employeeId)?.name ?? ''
      return leftName.localeCompare(rightName)
    })
  }, [state.reviews, managerId, directReports, getPerson])

  const reportIds = useMemo(
    () => new Set(directReports.map((person) => person.id)),
    [directReports],
  )

  const departmentOptions = useMemo(
    () => departmentOptionsFromPeople(directReports),
    [directReports],
  )

  const costCenterOptions = useMemo(
    () => costCenterOptionsFromPeople(directReports),
    [directReports],
  )

  const titleOptions = useMemo(() => titleOptionsFromPeople(directReports), [directReports])

  const unionOptions = useMemo(() => unionOptionsFromPeople(directReports), [directReports])

  const managerReviewFilterOptions = useMemo(
    () => ({ employeeIds: reportIds, managerTeamReviewStatus: true as const }),
    [reportIds],
  )

  const reviewCounts = useMemo(
    () =>
      computeScopedDashboardReviewCounts(
        state.cycles,
        teamReviews,
        state.people,
        {
          search: filters.search,
          department: filters.department,
          costCenter: filters.costCenter,
          title: filters.title,
          union: filters.union,
        },
        managerReviewFilterOptions,
      ),
    [
      state.cycles,
      teamReviews,
      state.people,
      managerReviewFilterOptions,
      filters.search,
      filters.department,
      filters.costCenter,
      filters.title,
      filters.union,
    ],
  )

  const activeFilterCount = useMemo(() => countActiveDashboardFilters(filters), [filters])

  const filteredTeamReviews = useMemo(
    () =>
      filterReviewsForDashboard(teamReviews, state.cycles, state.people, filters, managerReviewFilterOptions),
    [teamReviews, state.cycles, state.people, filters, managerReviewFilterOptions],
  )

  const reviewsDueCount = useMemo(
    () => teamReviews.filter((review) => review.status === 'manager_pending').length,
    [teamReviews],
  )

  const pendingAcknowledgementCount = useMemo(
    () => teamReviews.filter((review) => review.status === 'acknowledgement_pending').length,
    [teamReviews],
  )

  const completedThisQuarterCount = useMemo(
    () =>
      teamReviews.filter((review) => {
        if (review.status !== 'completed') return false
        return isCompletedThisQuarter(reviewCompletedAt(review))
      }).length,
    [teamReviews],
  )

  const openManagerReview = useCallback(
    (reviewId: string) => {
      selectReview(reviewId)
      setView('manager_review')
    },
    [selectReview, setView],
  )

  const teamTableData = useMemo(
    () => buildReviewTableRows(filteredTeamReviews, getPerson, getCycle, getTemplate),
    [filteredTeamReviews, getPerson, getCycle, getTemplate],
  )

  const tableColumns = useMemo(
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
      { id: 'title', header: 'Title', accessor: 'title', sortable: true },
      { id: 'review', header: 'Review', accessor: 'reviewName', sortable: true },
      {
        id: 'status',
        header: 'Status',
        accessor: 'statusLabel',
        sortable: true,
        cellRenderer: (_value: unknown, row: unknown) =>
          createManagerReviewStatusBadge((row as { status: ReviewStatus }).status),
      },
      { id: 'due', header: 'Due', accessor: 'dueDate', sortable: true },
      {
        id: 'selfEval',
        header: 'Self-eval completed',
        accessor: 'selfEvalCompleted',
        sortable: true,
      },
      {
        id: 'actions',
        header: '',
        accessor: 'id',
        sortable: false,
        cellRenderer: (value: unknown, row: unknown) => {
          const reviewId = String(value)
          const rowData = row as { status: ReviewStatus; managerReviewDraft: boolean }
          const actions = [
            createTableActionButton('Details', () => openEmployeeReview(reviewId), 'tertiary'),
          ]

          if (rowData.status === 'manager_pending') {
            actions.unshift(
              createTableActionButton(
                rowData.managerReviewDraft ? 'Continue review' : 'Start Review',
                () => openManagerReview(reviewId),
              ),
            )
          }

          return createTableActionGroup(actions)
        },
      },
    ],
    [openEmployeeReview, openManagerReview],
  )

  const teamReviewsFilteredEmpty = filteredTeamReviews.length === 0
  const teamEmptyMessage =
    teamReviews.length === 0
      ? 'No performance reviews are assigned to your team yet.'
      : 'No team reviews match the current filters. Try adjusting search, department, or status.'

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const clearFilters = useCallback(() => {
    requestAnimationFrame(() => {
      setFilters(createDefaultDashboardFilters())
      setFilterFieldsKey((key) => key + 1)
    })
  }, [])

  const renderReviewRow = (review: PerformanceReview, showPrimaryAction: boolean) => {
    const employee = getPerson(review.employeeId)
    const cycle = getCycle(review.cycleId)
    const template = cycle ? getTemplate(cycle.templateId) : undefined

    return (
      <ManagerTeamReviewRow
        key={review.id}
        review={review}
        employee={employee}
        cycle={cycle}
        templateName={template?.name ?? cycle?.name ?? 'Performance review'}
        onStartReview={
          showPrimaryAction && review.status === 'manager_pending'
            ? () => openManagerReview(review.id)
            : undefined
        }
        onDetails={() => openEmployeeReview(review.id)}
      />
    )
  }

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Manager Dashboard"
        subtitle="Review your team members and conduct evaluations."
        leadingActions={
          <ModusWcIcon name="description" size="sm" decorative customClass="text-[#252a2e]" />
        }
      />

      <div className="tq-manager-dashboard flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <PerformanceDashboardKpiCard
            title="Team Members"
            value={directReports.length}
            valueTone="primary"
            metricLabel="Direct reports"
            footerLabel={`${directReports.length} team member${directReports.length === 1 ? '' : 's'}`}
            status="complete"
            headerIcon="group"
            footerIcon="group"
          />
          <PerformanceDashboardKpiCard
            title="Reviews Due"
            value={reviewsDueCount}
            valueTone="danger"
            metricLabel="Requiring your review"
            footerLabel={
              reviewsDueCount > 0
                ? `${reviewsDueCount} review${reviewsDueCount === 1 ? '' : 's'} need action`
                : 'No reviews due'
            }
            status={reviewsDueCount > 0 ? 'badge' : 'complete'}
            badgeLabel={MANAGER_DASHBOARD_STATUS_LABELS.manager_pending}
            footerIcon="calendar_clock"
          />
          <PerformanceDashboardKpiCard
            title="Pending Acknowledgement"
            value={pendingAcknowledgementCount}
            valueTone="warning"
            metricLabel="Awaiting employee sign-off"
            footerLabel={
              pendingAcknowledgementCount > 0
                ? `${pendingAcknowledgementCount} awaiting acknowledgement`
                : 'All acknowledgements complete'
            }
            status={pendingAcknowledgementCount > 0 ? 'badge' : 'complete'}
            badgeLabel="In progress"
            footerIcon="warning"
          />
          <PerformanceDashboardKpiCard
            title="Completed"
            value={completedThisQuarterCount}
            valueTone="success"
            metricLabel="This quarter"
            footerLabel={`${completedThisQuarterCount} completed this quarter`}
            status="badge"
            badgeLabel="Completed"
            footerIcon="check_circle"
          />
        </div>

        <PerformanceDashboardFilterBar
          filters={filters}
          counts={reviewCounts}
          departmentOptions={departmentOptions}
          costCenterOptions={costCenterOptions}
          titleOptions={titleOptions}
          unionOptions={unionOptions}
          activeFilterCount={activeFilterCount}
          filterFieldsKey={filterFieldsKey}
          viewMode={viewMode}
          statusFilterMode="managerTeam"
          searchAriaLabel="Search by employee name, review cycle, department, or cost center"
          filterPanelId="manager-dashboard-filter-panel"
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
          onViewModeChange={setViewMode}
        />

        <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
          <div slot="title" className="tq-section-card-title mb-4 flex w-full min-w-0 flex-col gap-1">
            <ModusWcTypography
              hierarchy="h4"
              size="md"
              weight="semibold"
              customClass="!m-0"
              label="Team Performance Reviews"
            />
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
              label="One review per direct report. Items needing your manager feedback are listed first."
            />
          </div>
          <div
            hidden={!teamReviewsFilteredEmpty}
            aria-hidden={!teamReviewsFilteredEmpty}
            className={teamReviewsFilteredEmpty ? 'flex flex-col gap-2' : undefined}
          >
            <ModusWcTypography
              hierarchy="p"
              size="sm"
              customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
              label={teamEmptyMessage}
            />
            {activeFilterCount > 0 && teamReviews.length > 0 && (
              <div className="mt-1">
                <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={clearFilters}>
                  Clear filters
                </ModusWcButton>
              </div>
            )}
          </div>
          <div
            hidden={viewMode !== 'card' || teamReviewsFilteredEmpty}
            aria-hidden={viewMode !== 'card' || teamReviewsFilteredEmpty}
            className={
              viewMode === 'card' && !teamReviewsFilteredEmpty ? 'flex flex-col gap-2' : undefined
            }
          >
            {filteredTeamReviews.map((review) => renderReviewRow(review, true))}
          </div>
        </ModusWcCard>

        {viewMode === 'table' && !teamReviewsFilteredEmpty ? (
          <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
            <PerformanceDataTable
              key="manager-team-reviews-table"
              caption="Team performance reviews"
              columns={tableColumns}
              data={teamTableData}
            />
          </ModusWcCard>
        ) : null}
      </div>
    </TraqsperaPageBody>
  )
}
