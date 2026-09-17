import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcButton,
  ModusWcCard,
  ModusWcIcon,
  ModusWcModal,
  ModusWcSelect,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { ISelectOption } from '@trimble-oss/moduswebcomponents'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import type { Person, ReviewCycle, ReviewEmployeeGroup } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import { CYCLE_STATUS_LABELS } from '../utils/status'
import { getUnassignedEmployees } from '../utils/unassignedEmployees'
import { PerformanceDataTable } from './PerformanceDataTable'
import { TraqsperaPageBody, TraqsperaPageHeader } from './TraqsperaPageHeader'

const NONE = ''

type UnassignedEmployeesModalProps = {
  modalId: string
  open: boolean
  people: Person[]
  reviewGroups: ReviewEmployeeGroup[]
  cycles: ReviewCycle[]
  onClose: () => void
  onAssignToGroup: (groupId: string, employeeIds: string[]) => void
  onAssignToCycle: (cycleId: string, employeeIds: string[]) => void
}

export function UnassignedEmployeesModal({
  modalId,
  open,
  people,
  reviewGroups,
  cycles,
  onClose,
  onAssignToGroup,
  onAssignToCycle,
}: UnassignedEmployeesModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [groupId, setGroupId] = useState(NONE)
  const [cycleId, setCycleId] = useState(NONE)
  const [assignError, setAssignError] = useState('')

  useEffect(() => {
    const dialog = document.getElementById(modalId) as HTMLDialogElement | null
    if (!dialog) return
    const handleClose = () => onClose()
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [modalId, onClose])

  useEffect(() => {
    const dialog = document.getElementById(modalId) as HTMLDialogElement | null
    if (open) dialog?.showModal()
    else dialog?.close()
  }, [open, modalId])

  useEffect(() => {
    if (open) {
      setSelectedIds([])
      setGroupId(NONE)
      setCycleId(NONE)
      setAssignError('')
    }
  }, [open])

  const unassigned = useMemo(
    () => getUnassignedEmployees(people, reviewGroups, cycles),
    [people, reviewGroups, cycles],
  )

  const tableData = useMemo(
    () =>
      unassigned.map((person) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        department: person.department,
      })),
    [unassigned],
  )

  const groupOptions: ISelectOption[] = useMemo(
    () => [
      { label: 'Select review group', value: NONE },
      ...reviewGroups.map((g) => ({ label: g.name, value: g.id })),
    ],
    [reviewGroups],
  )

  const cycleOptions: ISelectOption[] = useMemo(() => {
    const assignable = cycles.filter((c) => c.status === 'active' || c.status === 'draft')
    return [
      { label: 'Select review cycle', value: NONE },
      ...assignable.map((c) => ({
        label: `${c.name} (${CYCLE_STATUS_LABELS[c.status]})`,
        value: c.id,
      })),
    ]
  }, [cycles])

  const handleSelection = useCallback((event: CustomEvent<{ selectedRowIds: string[] }>) => {
    setSelectedIds(event.detail?.selectedRowIds ?? [])
    setAssignError('')
  }, [])

  const handleAssign = () => {
    if (selectedIds.length === 0) {
      setAssignError('Select at least one employee.')
      return
    }
    if (groupId === NONE && cycleId === NONE) {
      setAssignError('Choose a review group, a review cycle, or both.')
      return
    }
    if (groupId !== NONE) onAssignToGroup(groupId, selectedIds)
    if (cycleId !== NONE) onAssignToCycle(cycleId, selectedIds)
    setSelectedIds([])
    setAssignError('')
  }

  const canAssign =
    selectedIds.length > 0 &&
    (groupId !== NONE || cycleId !== NONE) &&
    (groupId === NONE || reviewGroups.some((g) => g.id === groupId)) &&
    (cycleId === NONE || cycles.some((c) => c.id === cycleId))

  return (
    <ModusWcModal
      modalId={modalId}
      backdrop="default"
      position="top"
      fullscreen
      showClose
      aria-label="Unassigned employees"
    >
      <span slot="header">Unassigned employees</span>
      <div
        slot="content"
        className="review-group-members-modal-content min-h-0 min-w-0 flex-1 overflow-auto"
      >
        <TraqsperaPageBody>
          <div className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-3">
            <TraqsperaPageHeader
              title="Unassigned employees"
              subtitle="These employees are not in a review group and are not on an active or draft review cycle. Select people below and assign them to a group and/or cycle."
              onBack={onClose}
              backAriaLabel="Back to review groups"
            />

            {unassigned.length === 0 ? (
              <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
                <ModusWcTypography
                  hierarchy="p"
                  size="sm"
                  label="Everyone is assigned to at least one review group or an active/draft cycle."
                />
              </ModusWcCard>
            ) : (
              <>
                <ModusWcCard bordered padding="compact" customClass={TRAQ_CARD_CLASS}>
                  <div className="flex flex-col gap-3">
                    <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label="Assign selected" />
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <ModusWcSelect
                        label="Review group"
                        size="sm"
                        value={groupId}
                        options={groupOptions}
                        onInputChange={(e) => {
                          setGroupId(readInputString(e as CustomEvent))
                          setAssignError('')
                        }}
                      />
                      <ModusWcSelect
                        label="Review cycle"
                        size="sm"
                        value={cycleId}
                        options={cycleOptions}
                        onInputChange={(e) => {
                          setCycleId(readInputString(e as CustomEvent))
                          setAssignError('')
                        }}
                      />
                    </div>
                    {assignError ? (
                      <ModusWcTypography
                        hierarchy="p"
                        size="xs"
                        customClass="text-[var(--modus-wc-color-danger)]"
                        label={assignError}
                      />
                    ) : null}
                    <div className="flex flex-wrap items-center gap-2">
                      <ModusWcButton
                        variant="filled"
                        color="primary"
                        size="sm"
                        disabled={!canAssign}
                        onButtonClick={handleAssign}
                      >
                        <ModusWcIcon name="add" size="xs" decorative />
                        Assign {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                      </ModusWcButton>
                      <ModusWcTypography
                        hierarchy="p"
                        size="sm"
                        customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
                        label={`${selectedIds.length} selected`}
                      />
                    </div>
                  </div>
                </ModusWcCard>

                <ModusWcCard bordered padding="compact" customClass={`${TRAQ_CARD_CLASS} tq-table-card`}>
                  <div slot="title" className="flex w-full min-w-0 items-center gap-2 mb-4">
                    <ModusWcIcon name="people" decorative />
                    <ModusWcTypography
                      hierarchy="h4"
                      size="md"
                      weight="semibold"
                      label={`${unassigned.length} employee${unassigned.length === 1 ? '' : 's'}`}
                    />
                  </div>
                  <PerformanceDataTable
                    caption="Unassigned employees"
                    columns={[
                      { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
                      { id: 'title', header: 'Title', accessor: 'title', sortable: true },
                      { id: 'department', header: 'Department', accessor: 'department', sortable: true },
                    ]}
                    data={tableData}
                    density="comfortable"
                    selectable="multi"
                    selectedRowIds={selectedIds}
                    onRowSelectionChange={handleSelection}
                  />
                </ModusWcCard>
              </>
            )}
          </div>
        </TraqsperaPageBody>
      </div>
    </ModusWcModal>
  )
}
