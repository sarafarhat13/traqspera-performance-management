import { useState } from 'react'
import {
  ModusWcButton,
  ModusWcIcon,
  ModusWcInputLabel,
  ModusWcSelect,
  ModusWcTextInput,
} from '@trimble-oss/moduswebcomponents-react'
import { DashboardViewModeSegmentedControl } from './DashboardViewModeSegmentedControl'
import { readInputString } from '../utils/modusFormEvents'
import type {
  DashboardFilters,
  DashboardPackageCounts,
  DashboardPackageStatusFilter,
  DashboardReviewCounts,
  DashboardReviewStatusFilter,
} from '../utils/dashboardFilters'
import { countActivePanelFilters } from '../utils/dashboardFilters'

import type { DashboardViewMode } from './DashboardViewModeSegmentedControl'

const PACKAGE_STATUS_FILTERS: {
  id: DashboardPackageStatusFilter
  label: string
  countClass: string
}[] = [
  { id: 'all', label: 'All', countClass: 'tq-dashboard-filter-chip__count--primary' },
  { id: 'draft', label: 'Draft', countClass: 'tq-dashboard-filter-chip__count--draft' },
  { id: 'active', label: 'Active', countClass: 'tq-dashboard-filter-chip__count--primary' },
  { id: 'completed', label: 'Complete', countClass: 'tq-dashboard-filter-chip__count--success' },
]

const REVIEW_STATUS_FILTERS: {
  id: DashboardReviewStatusFilter
  label: string
  countClass: string
}[] = [
  { id: 'all', label: 'All', countClass: 'tq-dashboard-filter-chip__count--primary' },
  { id: 'draft', label: 'Draft', countClass: 'tq-dashboard-filter-chip__count--draft' },
  { id: 'pending', label: 'Pending', countClass: 'tq-dashboard-filter-chip__count--warning' },
  { id: 'completed', label: 'Completed', countClass: 'tq-dashboard-filter-chip__count--success' },
  { id: 'overdue', label: 'Overdue', countClass: 'tq-dashboard-filter-chip__count--danger' },
]

const MANAGER_TEAM_STATUS_FILTERS: {
  id: DashboardReviewStatusFilter
  label: string
  countClass: string
}[] = [
  { id: 'all', label: 'All', countClass: 'tq-dashboard-filter-chip__count--primary' },
  { id: 'pending', label: 'Pending', countClass: 'tq-dashboard-filter-chip__count--warning' },
  { id: 'completed', label: 'Completed', countClass: 'tq-dashboard-filter-chip__count--success' },
  { id: 'overdue', label: 'Overdue', countClass: 'tq-dashboard-filter-chip__count--danger' },
]

const CYCLE_DETAIL_STATUS_FILTERS: {
  id: DashboardReviewStatusFilter
  label: string
  countClass: string
}[] = [
  { id: 'all', label: 'All', countClass: 'tq-dashboard-filter-chip__count--primary' },
  { id: 'pending', label: 'Pending', countClass: 'tq-dashboard-filter-chip__count--warning' },
  { id: 'overdue', label: 'Overdue', countClass: 'tq-dashboard-filter-chip__count--danger' },
  { id: 'completed', label: 'Complete', countClass: 'tq-dashboard-filter-chip__count--success' },
]

type PerformanceDashboardFilterBarProps = {
  filters: DashboardFilters
  counts?: DashboardPackageCounts | DashboardReviewCounts
  departmentOptions?: { label: string; value: string }[]
  costCenterOptions?: { label: string; value: string }[]
  titleOptions?: { label: string; value: string }[]
  unionOptions?: { label: string; value: string }[]
  reviewerOptions?: { label: string; value: string }[]
  ratingOptions?: { label: string; value: string }[]
  activeFilterCount: number
  filterFieldsKey: number
  viewMode?: DashboardViewMode
  showViewToggle?: boolean
  showStatusChips?: boolean
  showFilterPanel?: boolean
  showReviewerInBar?: boolean
  statusFilterMode?: 'package' | 'review' | 'managerTeam' | 'cycleDetail'
  searchAriaLabel?: string
  filterPanelId?: string
  onFiltersChange: (patch: Partial<DashboardFilters>) => void
  onClearFilters: () => void
  onViewModeChange?: (mode: DashboardViewMode) => void
}

export function PerformanceDashboardFilterBar({
  filters,
  counts,
  departmentOptions,
  costCenterOptions,
  titleOptions,
  unionOptions,
  reviewerOptions,
  ratingOptions,
  activeFilterCount,
  filterFieldsKey,
  viewMode = 'table',
  showViewToggle = true,
  showStatusChips = true,
  showFilterPanel = true,
  showReviewerInBar = false,
  statusFilterMode = 'package',
  searchAriaLabel = 'Search by cycle name, employee, department, or cost center',
  filterPanelId = 'dashboard-filter-panel',
  onFiltersChange,
  onClearFilters,
  onViewModeChange,
}: PerformanceDashboardFilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const panelFilterCount = countActivePanelFilters(filters)
  const statusFilters =
    statusFilterMode === 'package'
      ? PACKAGE_STATUS_FILTERS
      : statusFilterMode === 'managerTeam'
        ? MANAGER_TEAM_STATUS_FILTERS
        : statusFilterMode === 'cycleDetail'
          ? CYCLE_DETAIL_STATUS_FILTERS
          : REVIEW_STATUS_FILTERS

  const searchInputId = `dashboard-search-${filterFieldsKey}`
  const compactBar = showReviewerInBar

  return (
    <div className="tq-dashboard-filter">
      <div
        className={`tq-dashboard-filter-bar${compactBar ? ' tq-dashboard-filter-bar--compact' : ''}`}
        role="search"
      >
        <div
          className={`tq-dashboard-filter-bar__field tq-dashboard-filter-bar__search${
            compactBar ? '' : ' tq-dashboard-filter-bar__search--pill'
          }`}
        >
          <ModusWcTextInput
            key={searchInputId}
            inputId={searchInputId}
            size="sm"
            label={compactBar ? 'Search' : undefined}
            includeSearch
            placeholder="Search"
            aria-label={searchAriaLabel}
            value={filters.search}
            onInputChange={(e) =>
              onFiltersChange({ search: readInputString(e as CustomEvent) })
            }
          />
        </div>

        {showReviewerInBar && reviewerOptions && reviewerOptions.length > 1 ? (
          <div className="tq-dashboard-filter-bar__field tq-dashboard-filter-bar__reviewer">
            <ModusWcSelect
              key={`dashboard-reviewer-${filterFieldsKey}`}
              size="sm"
              label="Reviewer"
              value={filters.reviewerId}
              options={reviewerOptions}
              onInputChange={(e) =>
                onFiltersChange({ reviewerId: readInputString(e as CustomEvent) })
              }
            />
          </div>
        ) : null}

        {showStatusChips && counts && (
          <div
            className="tq-dashboard-filter-bar__chips"
            role="group"
            aria-label={
              statusFilterMode === 'package' ? 'Filter by package status' : 'Filter by review status'
            }
          >
            {statusFilters.map(({ id, label, countClass }) => {
              const active = filters.status === id
              const count = counts[id as keyof typeof counts] ?? 0
              return (
                <button
                  key={id}
                  type="button"
                  className={`tq-dashboard-filter-chip${active ? ' tq-dashboard-filter-chip--active' : ''}`}
                  aria-pressed={active}
                  onClick={() => onFiltersChange({ status: id })}
                >
                  <span>{label}</span>
                  <span className={`tq-dashboard-filter-chip__count ${countClass}`}>{count}</span>
                </button>
              )
            })}
          </div>
        )}

        {showFilterPanel ? (
          <ModusWcButton
            variant={panelOpen ? 'filled' : 'outlined'}
            color={panelOpen ? 'primary' : 'tertiary'}
            size="sm"
            shape="square"
            customClass="tq-dashboard-filter-bar__filter-btn"
            aria-label={
              panelFilterCount > 0
                ? `Filters, ${panelFilterCount} active. ${panelOpen ? 'Collapse' : 'Expand'} filter panel`
                : `${panelOpen ? 'Collapse' : 'Expand'} filter panel`
            }
            aria-expanded={panelOpen}
            aria-controls={filterPanelId}
            onButtonClick={() => setPanelOpen((open) => !open)}
          >
            <ModusWcIcon name="filter" size="xs" decorative />
            {panelFilterCount > 0 ? String(panelFilterCount) : null}
          </ModusWcButton>
        ) : null}

        {compactBar && showViewToggle && onViewModeChange ? (
          <div className="tq-dashboard-filter-bar__grow" aria-hidden="true" />
        ) : null}

        {showViewToggle && onViewModeChange && (
          <div
            className={`tq-dashboard-filter-bar__field tq-dashboard-filter-bar__view${
              compactBar ? '' : ' tq-dashboard-filter-bar__view--inline'
            }`}
          >
            {compactBar ? <ModusWcInputLabel labelText="View" size="sm" /> : null}
            <DashboardViewModeSegmentedControl value={viewMode} onChange={onViewModeChange} />
          </div>
        )}
      </div>

      {showFilterPanel && panelOpen && (
        <div id={filterPanelId} className="tq-dashboard-filter-panel">
          <div key={filterFieldsKey} className="tq-dashboard-filter-panel__fields">
            {departmentOptions ? (
              <ModusWcSelect
                size="sm"
                label="Department"
                value={filters.department}
                options={departmentOptions}
                onInputChange={(e) =>
                  onFiltersChange({ department: readInputString(e as CustomEvent) })
                }
              />
            ) : null}
            {costCenterOptions ? (
              <ModusWcSelect
                size="sm"
                label="Cost center"
                value={filters.costCenter}
                options={costCenterOptions}
                onInputChange={(e) =>
                  onFiltersChange({ costCenter: readInputString(e as CustomEvent) })
                }
              />
            ) : null}
            {titleOptions ? (
              <ModusWcSelect
                size="sm"
                label="Title"
                value={filters.title}
                options={titleOptions}
                onInputChange={(e) =>
                  onFiltersChange({ title: readInputString(e as CustomEvent) })
                }
              />
            ) : null}
            {unionOptions ? (
              <ModusWcSelect
                size="sm"
                label="Union"
                value={filters.union}
                options={unionOptions}
                onInputChange={(e) =>
                  onFiltersChange({ union: readInputString(e as CustomEvent) })
                }
              />
            ) : null}
            {!showReviewerInBar && reviewerOptions && reviewerOptions.length > 1 ? (
              <ModusWcSelect
                size="sm"
                label="Reviewer"
                value={filters.reviewerId}
                options={reviewerOptions}
                onInputChange={(e) =>
                  onFiltersChange({ reviewerId: readInputString(e as CustomEvent) })
                }
              />
            ) : null}
            {ratingOptions && ratingOptions.length > 1 ? (
              <ModusWcSelect
                size="sm"
                label="Rating"
                value={filters.rating}
                options={ratingOptions}
                onInputChange={(e) =>
                  onFiltersChange({ rating: readInputString(e as CustomEvent) })
                }
              />
            ) : null}
          </div>
          <div className="tq-dashboard-filter-panel__actions">
            <ModusWcButton
              variant="outlined"
              color="tertiary"
              size="sm"
              disabled={activeFilterCount === 0}
              onButtonClick={onClearFilters}
            >
              Clear all filters
            </ModusWcButton>
          </div>
        </div>
      )}
    </div>
  )
}
