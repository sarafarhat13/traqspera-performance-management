import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react'
import {
  ModusWcAutocomplete,
  ModusWcButton,
  ModusWcChip,
  ModusWcIcon,
  ModusWcModal,
  ModusWcSelect,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { EmployeeReviewerAssignment, Person, ReviewerRoleType } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import { readTableSelectedRowIds } from '../utils/tableRowSelection'
import { createNeutralTagBadge, createReviewerAssignmentCell } from '../utils/modusTableCells'
import {
  defaultReviewerAssignment,
  isReviewerAssignmentValid,
  isSupervisorAssignmentMissing,
  resolveEffectiveSupervisorId,
  REVIEWER_TYPE_OPTIONS,
} from '../utils/reviewer'
import { formatEmployeeNameWithCode } from '../utils/employeeCode'
import { useModusDialog } from '../utils/useModusDialog'
import { PerformanceDataTable } from './PerformanceDataTable'

const PARTICIPANT_PICKER_MODAL_ID = 'launch-wizard-participant-picker'

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

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort()
}

type ReviewerRowRecord = {
  id: string
  name: string
  reviewerType: string
  reviewerCustomManagerId: string
  reviewerSupervisorId: string
  supervisorMissing: boolean
}

export type LaunchCycleParticipantPickerModalProps = {
  open: boolean
  excludedIds: string[]
  employeePool: Person[]
  managerOptions: { label: string; value: string }[]
  getPerson: (id: string) => Person | undefined
  onCancel: () => void
  onConfirm: (ids: string[], assignments: Record<string, EmployeeReviewerAssignment>) => void
}

export function LaunchCycleParticipantPickerModal({
  open,
  excludedIds,
  employeePool,
  managerOptions,
  getPerson,
  onCancel,
  onConfirm,
}: LaunchCycleParticipantPickerModalProps) {
  const [draftIds, setDraftIds] = useState<string[]>([])
  const [draftAssignments, setDraftAssignments] = useState<
    Record<string, EmployeeReviewerAssignment>
  >({})
  const [filterDepartments, setFilterDepartments] = useState<string[]>([])
  const [filterCostCenters, setFilterCostCenters] = useState<string[]>([])
  const [filterTitles, setFilterTitles] = useState<string[]>([])
  const [bulkReviewerType, setBulkReviewerType] = useState<ReviewerRoleType>('supervisor')
  const [bulkCustomManagerId, setBulkCustomManagerId] = useState('')
  const [reviewerTableKey, setReviewerTableKey] = useState(0)

  useEffect(() => {
    if (!open) return
    setDraftIds([])
    setDraftAssignments({})
    setFilterDepartments([])
    setFilterCostCenters([])
    setFilterTitles([])
    setBulkReviewerType('supervisor')
    setBulkCustomManagerId('')
    setReviewerTableKey((key) => key + 1)
  }, [open])

  const { requestClose } = useModusDialog(PARTICIPANT_PICKER_MODAL_ID, open, onCancel)

  const availableEmployees = useMemo(() => {
    const excluded = new Set(excludedIds)
    return employeePool.filter((p) => !excluded.has(p.id))
  }, [employeePool, excludedIds])

  const departmentValues = useMemo(
    () => uniqueSorted(availableEmployees.map((p) => p.department)),
    [availableEmployees],
  )
  const costCenterValues = useMemo(
    () => uniqueSorted(availableEmployees.map((p) => p.costCenter)),
    [availableEmployees],
  )
  const titleValues = useMemo(
    () => uniqueSorted(availableEmployees.map((p) => p.title)),
    [availableEmployees],
  )

  const filteredEmployees = useMemo(
    () =>
      availableEmployees.filter(
        (p) =>
          matchesMultiFilter(filterDepartments, p.department) &&
          matchesMultiFilter(filterCostCenters, p.costCenter) &&
          matchesMultiFilter(filterTitles, p.title),
      ),
    [availableEmployees, filterDepartments, filterCostCenters, filterTitles],
  )

  const filteredEmployeeIds = useMemo(
    () => filteredEmployees.map((person) => person.id),
    [filteredEmployees],
  )

  const assignmentForBulk = useCallback(
    (): EmployeeReviewerAssignment =>
      bulkReviewerType === 'custom'
        ? { type: 'custom', customManagerId: bulkCustomManagerId }
        : { type: bulkReviewerType },
    [bulkReviewerType, bulkCustomManagerId],
  )

  const getDraftAssignment = useCallback(
    (employeeId: string): EmployeeReviewerAssignment =>
      draftAssignments[employeeId] ?? defaultReviewerAssignment(),
    [draftAssignments],
  )

  const applyReviewerToFilteredEmployees = useCallback(
    (type: ReviewerRoleType, customManagerId: string) => {
      if (filteredEmployeeIds.length === 0) return
      setDraftAssignments((prev) => {
        const next = { ...prev }
        filteredEmployeeIds.forEach((id) => {
          next[id] = type === 'custom' ? { type: 'custom', customManagerId } : { type }
        })
        return next
      })
      setReviewerTableKey((key) => key + 1)
    },
    [filteredEmployeeIds],
  )

  const applyBulkReviewer = (type: ReviewerRoleType) => {
    setBulkReviewerType(type)
    applyReviewerToFilteredEmployees(type, bulkCustomManagerId)
  }

  const applyBulkCustomManager = (managerId: string) => {
    setBulkCustomManagerId(managerId)
    setBulkReviewerType('custom')
    applyReviewerToFilteredEmployees('custom', managerId)
  }

  const handleRowSelectionChange = useCallback(
    (event: CustomEvent<{ selectedRowIds: string[] }>) => {
      const visibleSelected = readTableSelectedRowIds(event)
      const visibleSet = new Set(filteredEmployeeIds)
      setDraftIds((prev) => {
        const hiddenSelected = prev.filter((id) => !visibleSet.has(id))
        const next = [...hiddenSelected, ...visibleSelected]
        const added = visibleSelected.filter((id) => !prev.includes(id))
        if (added.length > 0) {
          setDraftAssignments((assignments) => {
            const updated = { ...assignments }
            added.forEach((id) => {
              if (!updated[id]) updated[id] = assignmentForBulk()
            })
            return updated
          })
        }
        if (next.length === prev.length && next.every((id) => prev.includes(id))) return prev
        return next
      })
    },
    [assignmentForBulk, filteredEmployeeIds],
  )

  const ensureSelected = useCallback((employeeId: string) => {
    setDraftIds((prev) => (prev.includes(employeeId) ? prev : [...prev, employeeId]))
  }, [])

  const setReviewerType = useCallback(
    (employeeId: string, type: ReviewerRoleType) => {
      ensureSelected(employeeId)
      setDraftAssignments((prev) => {
        const previous = prev[employeeId] ?? defaultReviewerAssignment()
        return {
          ...prev,
          [employeeId]:
            type === 'custom'
              ? {
                  type: 'custom',
                  customManagerId: previous.customManagerId || bulkCustomManagerId || '',
                }
              : { type },
        }
      })
      setReviewerTableKey((key) => key + 1)
    },
    [bulkCustomManagerId, ensureSelected],
  )

  const setReviewerCustomManager = useCallback(
    (employeeId: string, customManagerId: string) => {
      ensureSelected(employeeId)
      setDraftAssignments((prev) => ({
        ...prev,
        [employeeId]: { type: 'custom', customManagerId },
      }))
      setReviewerTableKey((key) => key + 1)
    },
    [ensureSelected],
  )

  const renderReviewerCell = useCallback(
    (record: ReviewerRowRecord) => {
      const person = getPerson(record.id)
      const assignment: EmployeeReviewerAssignment = {
        type: record.reviewerType as ReviewerRoleType,
        customManagerId: record.reviewerCustomManagerId,
        supervisorId: record.reviewerSupervisorId || undefined,
      }
      const supervisorId = resolveEffectiveSupervisorId(person, assignment) ?? ''
      const supervisorName = supervisorId ? getPerson(supervisorId)?.name ?? '—' : ''
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
    [getPerson, managerOptions, setReviewerCustomManager, setReviewerType],
  )

  const tableColumns = useMemo(
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
        cellRenderer: (_value: unknown, row: unknown) =>
          renderReviewerCell(row as ReviewerRowRecord),
      },
    ],
    [renderReviewerCell],
  )

  const tableData = useMemo(
    () =>
      filteredEmployees
        .map((person) => {
          const assignment = getDraftAssignment(person.id)
          return {
            id: person.id,
            name: formatEmployeeNameWithCode(person.name, person.id),
            title: person.title,
            department: person.department,
            costCenter: person.costCenter,
            reviewerType: assignment.type,
            reviewerCustomManagerId: assignment.customManagerId ?? '',
            reviewerSupervisorId: resolveEffectiveSupervisorId(person, assignment) ?? '',
            supervisorMissing: isSupervisorAssignmentMissing(person, assignment),
          }
        })
        .sort((a, b) => {
          if (a.supervisorMissing !== b.supervisorMissing) return a.supervisorMissing ? -1 : 1
          return a.name.localeCompare(b.name)
        }),
    [filteredEmployees, getDraftAssignment],
  )

  const visibleSelectedIds = useMemo(() => {
    const visibleSet = new Set(filteredEmployeeIds)
    return draftIds.filter((id) => visibleSet.has(id))
  }, [draftIds, filteredEmployeeIds])

  const needsReviewerCount = useMemo(
    () =>
      draftIds.filter((id) => !isReviewerAssignmentValid(getDraftAssignment(id), getPerson(id)))
        .length,
    [draftIds, getDraftAssignment, getPerson],
  )

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

  const selectedCount = draftIds.length
  const countLabel = `${selectedCount === 1 ? '1 selected' : `${selectedCount} selected`}${
    needsReviewerCount > 0
      ? ` · ${needsReviewerCount === 1 ? '1 needs reviewer' : `${needsReviewerCount} need reviewer`}`
      : ''
  }`
  const confirmLabel = `Add ${selectedCount === 1 ? '1 employee' : `${selectedCount} employees`}`
  const hasActiveFilters =
    filterDepartments.length + filterCostCenters.length + filterTitles.length > 0

  const handleConfirm = () => {
    if (selectedCount === 0) return
    const assignments = Object.fromEntries(
      draftIds.map((id) => [id, getDraftAssignment(id)]),
    )
    onConfirm(draftIds, assignments)
  }

  return (
    <ModusWcModal
      modalId={PARTICIPANT_PICKER_MODAL_ID}
      backdrop="static"
      position="center"
      showClose={true}
      customClass="tq-launch-wizard-participant-picker-dialog"
      aria-label="Add employees to review"
    >
      <span slot="header">Add employees to review</span>
      <div slot="content" className="flex min-w-0 flex-col gap-3">
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
          <div hidden={bulkReviewerType !== 'custom'} aria-hidden={bulkReviewerType !== 'custom'}>
            <ModusWcAutocomplete
              label="Custom reviewer for all shown"
              size="sm"
              placeholder="Search managers"
              includeSearch
              showMenuOnFocus
              value={bulkCustomManagerLabel}
              items={bulkManagerItems}
              onItemSelect={(e) => {
                const managerId = (e as CustomEvent<{ value?: string }>).detail?.value ?? ''
                if (managerId) applyBulkCustomManager(managerId)
              }}
            />
          </div>
        </div>

        <div
          className="flex min-w-0 flex-wrap items-center gap-2"
          role="group"
          aria-label="Active participant filters"
          hidden={!hasActiveFilters}
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

        <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
            label={
              availableEmployees.length === 0
                ? 'Every employee is already in this review.'
                : 'Check employees to add them to the cycle and set each row’s reviewer. Employees already in the review are not listed.'
            }
          />
          <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label={countLabel} />
        </div>

        <PerformanceDataTable
          key={reviewerTableKey}
          caption="Employees available for this review cycle"
          columns={tableColumns}
          data={tableData}
          density="comfortable"
          selectable="multi"
          selectedRowIds={visibleSelectedIds}
          onRowSelectionChange={handleRowSelectionChange}
        />
      </div>
      <div slot="footer" className="flex w-full justify-end gap-2">
        <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={requestClose}>
          Cancel
        </ModusWcButton>
        <ModusWcButton
          variant="filled"
          color="primary"
          size="sm"
          {...(selectedCount === 0 ? { disabled: true } : {})}
          onButtonClick={handleConfirm}
        >
          <ModusWcIcon name="add" size="xs" decorative />
          {confirmLabel}
        </ModusWcButton>
      </div>
    </ModusWcModal>
  )
}
