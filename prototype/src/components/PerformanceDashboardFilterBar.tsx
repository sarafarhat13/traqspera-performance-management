import { useState } from 'react'
import {
  ModusWcButton,
  ModusWcIcon,
  ModusWcSelect,
  ModusWcTextInput,
} from '@trimble-oss/moduswebcomponents-react'
import { readInputString } from '../utils/modusFormEvents'
import type { DashboardFilters, DashboardReviewCounts, DashboardStatusFilter } from '../utils/dashboardFilters'
import { countActivePanelFilters } from '../utils/dashboardFilters'

type DashboardViewMode = 'card' | 'table'

const STATUS_FILTERS: { id: DashboardStatusFilter; label: string; countClass: string }[] = [
  { id: 'all', label: 'All', countClass: 'tq-dashboard-filter-chip__count--primary' },
  { id: 'draft', label: 'Draft', countClass: 'tq-dashboard-filter-chip__count--draft' },
  { id: 'pending', label: 'Pending', countClass: 'tq-dashboard-filter-chip__count--warning' },
  { id: 'completed', label: 'Completed', countClass: 'tq-dashboard-filter-chip__count--success' },
  { id: 'overdue', label: 'Overdue', countClass: 'tq-dashboard-filter-chip__count--danger' },
]

type PerformanceDashboardFilterBarProps = {
  filters: DashboardFilters
  counts: DashboardReviewCounts
  departmentOptions: { label: string; value: string }[]
  costCenterOptions: { label: string; value: string }[]
  titleOptions: { label: string; value: string }[]
  unionOptions: { label: string; value: string }[]
  activeFilterCount: number
  filterFieldsKey: number
  viewMode?: DashboardViewMode
  showViewToggle?: boolean
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
  activeFilterCount,
  filterFieldsKey,
  viewMode = 'table',
  showViewToggle = true,
  searchAriaLabel = 'Search by cycle name, employee, department, or cost center',
  filterPanelId = 'dashboard-filter-panel',
  onFiltersChange,
  onClearFilters,
  onViewModeChange,
}: PerformanceDashboardFilterBarProps) {
  const [panelOpen, setPanelOpen] = useState(false)
  const panelFilterCount = countActivePanelFilters(filters)

  return (
    <div className="tq-dashboard-filter">
      <div className="tq-dashboard-filter-bar" role="search">
        <div className="tq-dashboard-filter-bar__search">
          <ModusWcIcon name="search" size="sm" decorative customClass="tq-dashboard-filter-bar__search-icon" />
          <ModusWcTextInput
            key={`dashboard-search-${filterFieldsKey}`}
            size="sm"
            placeholder="Search"
            aria-label={searchAriaLabel}
            value={filters.search}
            onInputChange={(e) => onFiltersChange({ search: readInputString(e as CustomEvent) })}
          />
        </div>

        <div className="tq-dashboard-filter-bar__chips" role="group" aria-label="Filter by review status">
          {STATUS_FILTERS.map(({ id, label, countClass }) => {
            const active = filters.status === id
            const count = counts[id]
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

        {showViewToggle && onViewModeChange && (
          <div className="tq-dashboard-filter-bar__view-toggle" role="group" aria-label="View mode">
            <ModusWcButton
              variant={viewMode === 'card' ? 'filled' : 'outlined'}
              color={viewMode === 'card' ? 'primary' : 'tertiary'}
              shape="square"
              size="sm"
              aria-label="Card view"
              aria-pressed={viewMode === 'card'}
              onButtonClick={() => onViewModeChange('card')}
            >
              <ModusWcIcon name="view_grid" size="xs" decorative />
            </ModusWcButton>
            <ModusWcButton
              variant={viewMode === 'table' ? 'filled' : 'outlined'}
              color={viewMode === 'table' ? 'primary' : 'tertiary'}
              shape="square"
              size="sm"
              aria-label="Table view"
              aria-pressed={viewMode === 'table'}
              onButtonClick={() => onViewModeChange('table')}
            >
              <ModusWcIcon name="view_list" size="xs" decorative />
            </ModusWcButton>
          </div>
        )}
      </div>

      {panelOpen && (
        <div id={filterPanelId} className="tq-dashboard-filter-panel">
          <div key={filterFieldsKey} className="tq-dashboard-filter-panel__fields">
            <ModusWcSelect
              size="sm"
              label="Department"
              value={filters.department}
              options={departmentOptions}
              onInputChange={(e) => onFiltersChange({ department: readInputString(e as CustomEvent) })}
            />
            <ModusWcSelect
              size="sm"
              label="Cost center"
              value={filters.costCenter}
              options={costCenterOptions}
              onInputChange={(e) => onFiltersChange({ costCenter: readInputString(e as CustomEvent) })}
            />
            <ModusWcSelect
              size="sm"
              label="Title"
              value={filters.title}
              options={titleOptions}
              onInputChange={(e) => onFiltersChange({ title: readInputString(e as CustomEvent) })}
            />
            <ModusWcSelect
              size="sm"
              label="Union"
              value={filters.union}
              options={unionOptions}
              onInputChange={(e) => onFiltersChange({ union: readInputString(e as CustomEvent) })}
            />
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
