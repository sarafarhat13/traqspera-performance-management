import { useCallback, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { computeCycleStats } from '../utils/cycleStats'
import {
  countActiveDashboardFilters,
  costCenterOptionsFromPeople,
  createDefaultDashboardFilters,
  departmentOptionsFromPeople,
  filterDashboardCycles,
  computeDashboardReviewCounts,
  titleOptionsFromPeople,
  unionOptionsFromPeople,
  type DashboardFilters,
} from '../utils/dashboardFilters'
import { CYCLE_STATUS_LABELS, formatDate } from '../utils/status'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { ReviewCycleCard } from './ReviewCycleCard'
import { PerformanceDashboardKpiCard } from './PerformanceDashboardKpiCard'
import { PerformanceDashboardFilterBar } from './PerformanceDashboardFilterBar'
import { PerformanceDataTable } from './PerformanceDataTable'
import {
  createCycleStatusBadge,
  createTableActionButton,
} from '../utils/modusTableCells'
import type { CycleStatus } from '../types'

type DashboardViewMode = 'card' | 'table'

export function HRAdminDashboard() {
  const {
    state,
    setView,
    selectCycle,
    getTemplate,
  } = usePerformance()
  const [viewMode, setViewMode] = useState<DashboardViewMode>('card')
  const [filters, setFilters] = useState<DashboardFilters>(() => createDefaultDashboardFilters())
  const [filterFieldsKey, setFilterFieldsKey] = useState(0)

  const openCycle = useCallback(
    (cycleId: string) => {
      selectCycle(cycleId)
      setView('cycle_details')
    },
    [selectCycle, setView],
  )

  const departmentOptions = useMemo(
    () => departmentOptionsFromPeople(state.people),
    [state.people],
  )

  const costCenterOptions = useMemo(
    () => costCenterOptionsFromPeople(state.people),
    [state.people],
  )

  const titleOptions = useMemo(() => titleOptionsFromPeople(state.people), [state.people])

  const unionOptions = useMemo(() => unionOptionsFromPeople(state.people), [state.people])

  const reviewCounts = useMemo(
    () =>
      computeDashboardReviewCounts(state.cycles, state.reviews, state.people, {
        search: filters.search,
        department: filters.department,
        costCenter: filters.costCenter,
        title: filters.title,
        union: filters.union,
      }),
    [
      state.cycles,
      state.reviews,
      state.people,
      filters.search,
      filters.department,
      filters.costCenter,
      filters.title,
      filters.union,
    ],
  )

  const filteredCycles = useMemo(
    () => filterDashboardCycles(state.cycles, state.reviews, state.people, filters),
    [state.cycles, state.reviews, state.people, filters],
  )

  const activeFilterCount = useMemo(() => countActiveDashboardFilters(filters), [filters])

  const overdueReviewCount = useMemo(
    () =>
      state.cycles.reduce((sum, cycle) => {
        const stats = computeCycleStats(cycle, state.reviews)
        return sum + stats.overdue
      }, 0),
    [state.cycles, state.reviews],
  )

  const activeCycles = useMemo(
    () => state.cycles.filter((cycle) => cycle.status === 'active'),
    [state.cycles],
  )

  const pendingReviewCount = useMemo(
    () => state.reviews.filter((review) => review.status !== 'completed').length,
    [state.reviews],
  )

  const employeesInActiveCycles = useMemo(
    () => new Set(activeCycles.flatMap((cycle) => cycle.employeeIds)).size,
    [activeCycles],
  )

  const employeesWithOverdueReviews = useMemo(() => {
    const now = new Date()
    const ids = new Set<string>()
    for (const cycle of state.cycles) {
      for (const review of state.reviews) {
        if (review.cycleId !== cycle.id || review.status === 'completed') continue
        const due = new Date(cycle.dueDate)
        due.setHours(23, 59, 59, 999)
        if (due < now) ids.add(review.employeeId)
      }
    }
    return ids.size
  }, [state.cycles, state.reviews])

  const employeesWithPendingReviews = useMemo(() => {
    const ids = new Set<string>()
    for (const review of state.reviews) {
      if (review.status !== 'completed') ids.add(review.employeeId)
    }
    return ids.size
  }, [state.reviews])

  const tableData = useMemo(
    () =>
      filteredCycles.map((cycle) => {
        const stats = computeCycleStats(cycle, state.reviews)
        return {
          id: cycle.id,
          name: cycle.name,
          status: cycle.status,
          statusLabel: CYCLE_STATUS_LABELS[cycle.status],
          startDate: formatDate(cycle.startDate),
          dueDate: formatDate(cycle.dueDate),
          employees: String(stats.totalEmployees),
          completed: String(stats.completed),
          pending: String(stats.pending),
          overdue: String(stats.overdue),
          progress: `${stats.percentComplete}%`,
        }
      }),
    [filteredCycles, state.reviews],
  )

  const tableColumns = useMemo(
    () => [
      { id: 'name', header: 'Cycle', accessor: 'name', sortable: true },
      {
        id: 'status',
        header: 'Status',
        accessor: 'statusLabel',
        sortable: true,
        cellRenderer: (_value: unknown, row: unknown) =>
          createCycleStatusBadge((row as { status: CycleStatus }).status),
      },
      { id: 'start', header: 'Start', accessor: 'startDate', sortable: true },
      { id: 'due', header: 'End', accessor: 'dueDate', sortable: true },
      { id: 'employees', header: 'Employees', accessor: 'employees', sortable: true },
      { id: 'completed', header: 'Completed', accessor: 'completed', sortable: true },
      { id: 'pending', header: 'Pending', accessor: 'pending', sortable: true },
      { id: 'overdue', header: 'Overdue', accessor: 'overdue', sortable: true },
      { id: 'progress', header: 'Progress', accessor: 'progress', sortable: true },
      {
        id: 'actions',
        header: '',
        accessor: 'id',
        sortable: false,
        cellRenderer: (value: unknown) =>
          createTableActionButton('View details', () => openCycle(String(value))),
      },
    ],
    [openCycle],
  )

  const updateFilters = useCallback((patch: Partial<DashboardFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
  }, [])

  const clearFilters = useCallback(() => {
    // Defer so Modus controls finish their click handling before we unmount/update them.
    requestAnimationFrame(() => {
      setFilters(createDefaultDashboardFilters())
      setFilterFieldsKey((key) => key + 1)
    })
  }, [])

  return (
    <TraqsperaPageBody>
      <TraqsperaPageHeader
        title="Performance dashboard"
        subtitle="Monitor review cycles and track employee completion."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              onButtonClick={() => setView('templates')}
            >
              Templates
            </ModusWcButton>
            <ModusWcButton
              variant="filled"
              color="primary"
              size="sm"
              onButtonClick={() => setView('launch_cycle_wizard')}
            >
              <ModusWcIcon name="add" size="xs" decorative />
              Launch cycle
            </ModusWcButton>
          </div>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <PerformanceDashboardKpiCard
            title="Active Cycles"
            value={activeCycles.length}
            valueTone="primary"
            metricLabel="cycles in progress"
            footerLabel={`${employeesInActiveCycles} employee${employeesInActiveCycles === 1 ? '' : 's'}`}
            status={activeCycles.length > 0 ? 'complete' : 'badge'}
            badgeLabel="No active cycles"
          />
          <PerformanceDashboardKpiCard
            title="Overdue Reviews"
            value={overdueReviewCount}
            valueTone="danger"
            metricLabel="reviews overdue"
            footerLabel={`${employeesWithOverdueReviews} employee${employeesWithOverdueReviews === 1 ? '' : 's'}`}
            status={overdueReviewCount > 0 ? 'badge' : 'complete'}
            badgeLabel="Needs attention"
          />
          <PerformanceDashboardKpiCard
            title="Pending Reviews"
            value={pendingReviewCount}
            valueTone="warning"
            metricLabel="reviews pending"
            footerLabel={`${employeesWithPendingReviews} employee${employeesWithPendingReviews === 1 ? '' : 's'}`}
            status={pendingReviewCount > 0 ? 'badge' : 'complete'}
            badgeLabel="In progress"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <ModusWcIcon name="clipboard" decorative />
            <ModusWcTypography hierarchy="h4" size="md" weight="semibold" label="Review Cycles" />
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
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            onViewModeChange={setViewMode}
          />

          {filteredCycles.length === 0 ? (
            <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
              <ModusWcTypography
                hierarchy="p"
                size="sm"
                customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                label="No review cycles match the current filters. Try adjusting search, department, or status."
              />
              {activeFilterCount > 0 && (
                <div className="mt-3">
                  <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={clearFilters}>
                    Clear filters
                  </ModusWcButton>
                </div>
              )}
            </ModusWcCard>
          ) : viewMode === 'card' ? (
            <div className="flex flex-col gap-3">
              {filteredCycles.map((cycle) => (
                <ReviewCycleCard
                  key={cycle.id}
                  cycle={cycle}
                  reviews={state.reviews}
                  templateDescription={getTemplate(cycle.templateId)?.description}
                  onViewDetails={() => openCycle(cycle.id)}
                />
              ))}
            </div>
          ) : (
            <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
              <PerformanceDataTable
                key="review-cycles-table"
                caption="Filtered Performance Review Cycles"
                columns={tableColumns}
                data={tableData}
              />
            </ModusWcCard>
          )}
        </div>
      </div>
    </TraqsperaPageBody>
  )
}
