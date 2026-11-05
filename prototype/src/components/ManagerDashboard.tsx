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
import { formatDate, isLaunchedReviewCycle } from '../utils/status'
import {
  createManagerTeamListStatusBadge,
  createTableActionButton,
  createTableActionGroup,
  createTableIconActionButton,
} from '../utils/modusTableCells'
import {
  countActiveDashboardFilters,
  createDefaultDashboardFilters,
  computeManagerTeamStatusCounts,
  DASHBOARD_FILTER_ALL,
  filterReviewsForDashboard,
  isManagerTeamListStatusFilter,
  MANAGER_TEAM_LIST_STATUS_LABELS,
  managerTeamListStatus,
  managerTeamQueue,
  type DashboardFilters,
  type ManagerTeamQueue,
} from '../utils/dashboardFilters'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import {
  reviewOverallRatingLabel,
  formatReviewProcessText,
  getCurrentStageDeadline,
  hasManagerReviewDraft,
  needsManagerReview,
} from '../utils/workflow'
import type { PerformanceReview, Person, ReviewCycle, ReviewStatus, ReviewTemplate } from '../types'
import { resolveManagerDashboardPersonId } from '../utils/managerDashboardContext'

type ManagerDashboardViewMode = 'card' | 'table'

const DEFAULT_MANAGER_DASHBOARD_VIEW: ManagerDashboardViewMode = 'table'

const NO_HIDDEN_STATUS_CHIPS: readonly string[] = []
const HIDE_COMPLETE_STATUS_CHIP: readonly string[] = ['complete']

/** In-progress queues can't contain complete reviews; the Completed queue makes every status chip redundant. */
function hiddenStatusChipsForQueue(queue: 'all' | ManagerTeamQueue): readonly string[] | 'all' {
  if (queue === 'complete') return 'all'
  if (queue === 'all') return NO_HIDDEN_STATUS_CHIPS
  return HIDE_COMPLETE_STATUS_CHIP
}

function TeamReviewsSectionTitle() {
  return (
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
  )
}

function reviewStatusPriority(status: ReviewStatus): number {
  switch (status) {
    case 'manager_pending':
    case 'parallel_review_pending':
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
    const listStatus = cycle ? managerTeamListStatus(review, cycle) : 'pending'

    return {
      id: review.id,
      employeeName: employee
        ? formatEmployeeNameWithCode(employee.name, employee.id)
        : 'Employee',
      title: employee?.title ?? '—',
      reviewName: template?.name ?? cycle?.name ?? 'Performance review',
      status: review.status,
      listStatus,
      statusLabel: MANAGER_TEAM_LIST_STATUS_LABELS[listStatus],
      dueDate: dueDate ? formatDate(dueDate) : '—',
      processLabel: formatReviewProcessText(cycle, review),
      managerReviewDraft: hasManagerReviewDraft(review),
      managerActionRequired: cycle ? needsManagerReview(cycle, review) : review.status === 'manager_pending',
      overallRating: cycle ? reviewOverallRatingLabel(cycle, review) ?? '—' : '—',
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
  const [viewMode, setViewMode] = useState<ManagerDashboardViewMode>(DEFAULT_MANAGER_DASHBOARD_VIEW)
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultDashboardFilters())
  const [filterFieldsKey, setFilterFieldsKey] = useState(0)
  const [activeQueue, setActiveQueue] = useState<'all' | ManagerTeamQueue>('all')

  useEffect(() => {
    if (!isManagerTeamListStatusFilter(filters.status)) {
      setFilters((current) => ({ ...current, status: 'all' }))
    }
  }, [filters.status])

  const directReports = useMemo(
    () => state.people.filter((person) => person.managerId === managerId),
    [state.people, managerId],
  )

  const managerReviews = useMemo(
    () =>
      state.reviews.filter(
        (review) =>
          review.managerId === managerId && isLaunchedReviewCycle(getCycle(review.cycleId)),
      ),
    [state.reviews, managerId, getCycle],
  )

  const launchedTeamReviews = useMemo(() => {
    const reportIds = new Set(directReports.map((person) => person.id))
    return state.reviews.filter(
      (review) =>
        review.managerId === managerId &&
        reportIds.has(review.employeeId) &&
        isLaunchedReviewCycle(getCycle(review.cycleId)),
    )
  }, [state.reviews, managerId, directReports, getCycle])

  const reviewCycleOptions = useMemo(() => {
    const cycleIds = [...new Set(launchedTeamReviews.map((review) => review.cycleId))]
    const options = cycleIds
      .map((id) => getCycle(id))
      .filter((cycle): cycle is ReviewCycle => Boolean(cycle))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((cycle) => ({ label: cycle.name, value: cycle.id }))
    return [{ label: 'All reviews', value: DASHBOARD_FILTER_ALL }, ...options]
  }, [launchedTeamReviews, getCycle])

  const teamReviews = useMemo(() => {
    const relevant =
      filters.reviewCycleId === DASHBOARD_FILTER_ALL
        ? launchedTeamReviews
        : launchedTeamReviews.filter((review) => review.cycleId === filters.reviewCycleId)
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
  }, [launchedTeamReviews, filters.reviewCycleId, getPerson])

  const reportIds = useMemo(
    () => new Set(directReports.map((person) => person.id)),
    [directReports],
  )

  const managerReviewFilterOptions = useMemo(
    () => ({ employeeIds: reportIds, managerTeamReviewStatus: true as const }),
    [reportIds],
  )

  const queueScopedReviews = useMemo(() => {
    if (activeQueue === 'all') return teamReviews
    return teamReviews.filter((review) => {
      const cycle = getCycle(review.cycleId)
      return cycle ? managerTeamQueue(review, cycle) === activeQueue : false
    })
  }, [teamReviews, activeQueue, getCycle])

  const reviewCounts = useMemo(
    () =>
      computeManagerTeamStatusCounts(
        state.cycles,
        queueScopedReviews,
        state.people,
        {
          search: filters.search,
          department: filters.department,
          costCenter: filters.costCenter,
          title: filters.title,
          union: filters.union,
          reviewerId: filters.reviewerId,
          rating: filters.rating,
          reviewCycleId: filters.reviewCycleId,
        },
        managerReviewFilterOptions,
      ),
    [
      state.cycles,
      queueScopedReviews,
      state.people,
      managerReviewFilterOptions,
      filters.search,
      filters.department,
      filters.costCenter,
      filters.title,
      filters.union,
      filters.reviewerId,
      filters.rating,
      filters.reviewCycleId,
    ],
  )

  const activeFilterCount = useMemo(() => countActiveDashboardFilters(filters), [filters])

  const filteredTeamReviews = useMemo(
    () =>
      filterReviewsForDashboard(
        queueScopedReviews,
        state.cycles,
        state.people,
        filters,
        managerReviewFilterOptions,
      ),
    [queueScopedReviews, state.cycles, state.people, filters, managerReviewFilterOptions],
  )

  const queueCounts = useMemo(() => {
    const counts = {
      with_employee: 0,
      manager_action: 0,
      acknowledgement: 0,
      complete: 0,
    }
    for (const review of teamReviews) {
      const cycle = getCycle(review.cycleId)
      if (!cycle) continue
      counts[managerTeamQueue(review, cycle)] += 1
    }
    return counts
  }, [teamReviews, getCycle])

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
        cellRenderer: (_value: unknown, row: unknown) => {
          const record = row as { listStatus: 'pending' | 'overdue' | 'complete' }
          return createManagerTeamListStatusBadge(record.listStatus)
        },
      },
      { id: 'due', header: 'Due', accessor: 'dueDate', sortable: true },
      {
        id: 'rating',
        header: 'Rating',
        accessor: 'overallRating',
        sortable: true,
      },
      {
        id: 'process',
        header: 'Process',
        accessor: 'processLabel',
        sortable: true,
      },
      {
        id: 'actions',
        header: '',
        accessor: 'id',
        sortable: false,
        cellRenderer: (value: unknown, row: unknown) => {
          const reviewId = String(value)
          const rowData = row as {
            employeeName: string
            managerReviewDraft: boolean
            managerActionRequired: boolean
          }
          const actions = [
            createTableIconActionButton(
              `View details for ${rowData.employeeName}`,
              'visibility_on',
              () => openEmployeeReview(reviewId),
            ),
          ]

          if (rowData.managerActionRequired) {
            actions.unshift(
              rowData.managerReviewDraft
                ? createTableIconActionButton(
                    `Continue review for ${rowData.employeeName}`,
                    'pencil',
                    () => openManagerReview(reviewId),
                  )
                : createTableIconActionButton(
                    `Start review for ${rowData.employeeName}`,
                    'play_circle',
                    () => openManagerReview(reviewId),
                  ),
            )
          }

          return createTableActionGroup(actions, true)
        },
      },
    ],
    [openEmployeeReview, openManagerReview],
  )

  const teamReviewsFilteredEmpty = filteredTeamReviews.length === 0
  const teamEmptyMessage =
    teamReviews.length === 0
      ? 'No performance reviews are assigned to your team yet.'
      : 'No team reviews match the current filters. Try adjusting search, department, or status (pending, overdue, or complete).'

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const selectQueue = useCallback(
    (queue: 'all' | ManagerTeamQueue) => {
      const nextQueue = queue !== 'all' && activeQueue === queue ? 'all' : queue
      setActiveQueue(nextQueue)
      const hidden = hiddenStatusChipsForQueue(nextQueue)
      if (hidden === 'all' ? filters.status !== 'all' : hidden.includes(filters.status)) {
        setFilters((current) => ({ ...current, status: 'all' }))
      }
    },
    [activeQueue, filters.status],
  )

  const hiddenStatusChips = hiddenStatusChipsForQueue(activeQueue)

  const clearFilters = useCallback(() => {
    requestAnimationFrame(() => {
      setFilters(createDefaultDashboardFilters())
      setActiveQueue('all')
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
          showPrimaryAction && (() => {
            const cycle = getCycle(review.cycleId)
            return cycle
              ? needsManagerReview(cycle, review)
              : review.status === 'manager_pending' || review.status === 'parallel_review_pending'
          })()
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
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5"
          role="group"
          aria-label="Filter team reviews"
        >
          <PerformanceDashboardKpiCard
            title="Team Members"
            value={directReports.length}
            valueTone="primary"
            metricLabel="Direct reports"
            footerLabel={`${directReports.length} team member${directReports.length === 1 ? '' : 's'}`}
            status="complete"
            headerIcon="group"
            footerIcon="group"
            pressed={activeQueue === 'all'}
            onClick={() => selectQueue('all')}
          />
          <PerformanceDashboardKpiCard
            title="With employee"
            pressed={activeQueue === 'with_employee'}
            onClick={() => selectQueue('with_employee')}
            value={queueCounts.with_employee}
            valueTone="warning"
            metricLabel="Still with the employee"
            footerLabel={
              queueCounts.with_employee > 0
                ? `${queueCounts.with_employee} waiting on the employee`
                : 'None waiting on employees'
            }
            status={queueCounts.with_employee > 0 ? 'badge' : 'complete'}
            badgeLabel="Pending"
            badgeColor="warning"
            footerIcon="group"
          />
          <PerformanceDashboardKpiCard
            title="Your review"
            pressed={activeQueue === 'manager_action'}
            onClick={() => selectQueue('manager_action')}
            value={queueCounts.manager_action}
            valueTone="danger"
            metricLabel="Requiring your review"
            footerLabel={
              queueCounts.manager_action === 0
                ? 'No reviews due'
                : queueCounts.manager_action === 1
                  ? '1 review needs action'
                  : `${queueCounts.manager_action} reviews need action`
            }
            status={queueCounts.manager_action > 0 ? 'badge' : 'complete'}
            badgeLabel="Pending"
            badgeColor="warning"
            footerIcon="calendar_clock"
          />
          <PerformanceDashboardKpiCard
            title="Acknowledgement"
            pressed={activeQueue === 'acknowledgement'}
            onClick={() => selectQueue('acknowledgement')}
            value={queueCounts.acknowledgement}
            valueTone="warning"
            metricLabel="Awaiting employee sign-off"
            footerLabel={
              queueCounts.acknowledgement > 0
                ? `${queueCounts.acknowledgement} awaiting acknowledgement`
                : 'All acknowledgements complete'
            }
            status={queueCounts.acknowledgement > 0 ? 'badge' : 'complete'}
            badgeLabel="Pending"
            badgeColor="warning"
            footerIcon="warning"
          />
          <PerformanceDashboardKpiCard
            title="Completed"
            pressed={activeQueue === 'complete'}
            onClick={() => selectQueue('complete')}
            value={queueCounts.complete}
            valueTone="success"
            metricLabel="Finished reviews"
            footerLabel={
              queueCounts.complete > 0
                ? `${queueCounts.complete} completed`
                : 'None completed yet'
            }
            status="badge"
            badgeLabel="Completed"
            footerIcon="check_circle"
          />
        </div>

        <PerformanceDashboardFilterBar
          filters={filters}
          counts={reviewCounts}
          reviewCycleOptions={reviewCycleOptions}
          activeFilterCount={activeFilterCount}
          filterFieldsKey={filterFieldsKey}
          viewMode={viewMode}
          statusFilterMode="managerTeam"
          showStatusChips={hiddenStatusChips !== 'all'}
          hiddenStatusIds={hiddenStatusChips === 'all' ? undefined : hiddenStatusChips}
          showFilterPanel={false}
          searchAriaLabel="Search by employee name, review cycle, department, or cost center"
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
          onViewModeChange={setViewMode}
        />

        <div
          hidden={!teamReviewsFilteredEmpty}
          aria-hidden={!teamReviewsFilteredEmpty}
          className={teamReviewsFilteredEmpty ? 'flex flex-col gap-2' : undefined}
        >
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <TeamReviewsSectionTitle />
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
          </ModusWcCard>
        </div>

        <div
          hidden={viewMode !== 'card' || teamReviewsFilteredEmpty}
          aria-hidden={viewMode !== 'card' || teamReviewsFilteredEmpty}
          className={
            viewMode === 'card' && !teamReviewsFilteredEmpty ? 'flex flex-col gap-2' : undefined
          }
        >
          <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
            <TeamReviewsSectionTitle />
            <div className="flex flex-col gap-2">
              {filteredTeamReviews.map((review) => renderReviewRow(review, true))}
            </div>
          </ModusWcCard>
        </div>

        {viewMode === 'table' && !teamReviewsFilteredEmpty ? (
          <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
            <TeamReviewsSectionTitle />
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
