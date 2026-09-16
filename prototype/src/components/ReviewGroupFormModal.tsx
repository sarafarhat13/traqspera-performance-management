import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ModusWcAutocomplete,
  ModusWcButton,
  ModusWcIcon,
  ModusWcModal,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTextarea,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { EmployeeReviewerAssignment, Person, ReviewEmployeeGroup, ReviewerRoleType } from '../types'
import { readInputString } from '../utils/modusFormEvents'
import {
  REVIEWER_TYPE_OPTIONS,
  buildManagerOptions,
  defaultReviewerAssignment,
  isReviewerAssignmentValid,
} from '../utils/reviewer'
import { PerformanceDataTable } from './PerformanceDataTable'

const FILTER_ALL = '__all__'

export type ReviewGroupFormValues = {
  name: string
  description: string
  memberIds: string[]
  defaultReviewerAssignment: EmployeeReviewerAssignment
}

type ReviewGroupFormModalProps = {
  modalId: string
  open: boolean
  title: string
  submitLabel: string
  people: Person[]
  initial?: ReviewGroupFormValues
  onClose: () => void
  onSubmit: (values: ReviewGroupFormValues) => void
}

function emptyForm(): ReviewGroupFormValues {
  return {
    name: '',
    description: '',
    memberIds: [],
    defaultReviewerAssignment: defaultReviewerAssignment(),
  }
}

export function formValuesFromGroup(group: ReviewEmployeeGroup): ReviewGroupFormValues {
  return {
    name: group.name,
    description: group.description ?? '',
    memberIds: [...group.memberIds],
    defaultReviewerAssignment: { ...group.defaultReviewerAssignment },
  }
}

export function ReviewGroupFormModal({
  modalId,
  open,
  title,
  submitLabel,
  people,
  initial,
  onClose,
  onSubmit,
}: ReviewGroupFormModalProps) {
  const [form, setForm] = useState<ReviewGroupFormValues>(() => initial ?? emptyForm())
  const [filterDepartment, setFilterDepartment] = useState(FILTER_ALL)
  const [filterCostCenter, setFilterCostCenter] = useState(FILTER_ALL)
  const [nameError, setNameError] = useState('')
  const [membersError, setMembersError] = useState('')
  const [reviewerError, setReviewerError] = useState('')

  const employeePool = useMemo(
    () => people.filter((p) => p.role === 'employee'),
    [people],
  )

  useEffect(() => {
    if (open) {
      setForm(initial ?? emptyForm())
      setFilterDepartment(FILTER_ALL)
      setFilterCostCenter(FILTER_ALL)
      setNameError('')
      setMembersError('')
      setReviewerError('')
    }
  }, [open, initial])

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

  const departmentOptions = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.department))].sort()
    return [
      { label: 'All departments', value: FILTER_ALL },
      ...values.map((v) => ({ label: v, value: v })),
    ]
  }, [employeePool])

  const costCenterOptions = useMemo(() => {
    const values = [...new Set(employeePool.map((p) => p.costCenter))].sort()
    return [
      { label: 'All cost centers', value: FILTER_ALL },
      ...values.map((v) => ({ label: v, value: v })),
    ]
  }, [employeePool])

  const filteredEmployees = useMemo(
    () =>
      employeePool.filter((p) => {
        if (filterDepartment !== FILTER_ALL && p.department !== filterDepartment) return false
        if (filterCostCenter !== FILTER_ALL && p.costCenter !== filterCostCenter) return false
        return true
      }),
    [employeePool, filterDepartment, filterCostCenter],
  )

  const managerOptions = useMemo(() => buildManagerOptions(people), [people])

  const customManagerId = form.defaultReviewerAssignment.customManagerId ?? ''
  const managerItems = useMemo(
    () =>
      managerOptions.map((option) => ({
        label: option.label,
        value: option.value,
        visibleInMenu: true,
        selected: option.value === customManagerId,
      })),
    [managerOptions, customManagerId],
  )

  const customManagerLabel =
    managerOptions.find((option) => option.value === customManagerId)?.label ?? ''

  const tableData = useMemo(
    () =>
      filteredEmployees.map((person) => ({
        id: person.id,
        name: person.name,
        title: person.title,
        department: person.department,
      })),
    [filteredEmployees],
  )

  const handleMemberSelection = useCallback((event: CustomEvent<{ selectedRowIds: string[] }>) => {
    const ids = event.detail?.selectedRowIds ?? []
    setForm((prev) => ({ ...prev, memberIds: ids }))
    if (ids.length > 0) setMembersError('')
  }, [])

  const setReviewerType = (type: ReviewerRoleType) => {
    setForm((prev) => ({
      ...prev,
      defaultReviewerAssignment:
        type === 'custom'
          ? {
              type: 'custom',
              customManagerId: prev.defaultReviewerAssignment.customManagerId ?? '',
            }
          : { type },
    }))
    setReviewerError('')
  }

  const handleSave = () => {
    let valid = true
    if (!form.name.trim()) {
      setNameError('Enter a group name.')
      valid = false
    } else setNameError('')
    if (form.memberIds.length === 0) {
      setMembersError('Add at least one employee to this group.')
      valid = false
    } else setMembersError('')
    if (!isReviewerAssignmentValid(form.defaultReviewerAssignment)) {
      setReviewerError('Select a manager for Custom reviewer.')
      valid = false
    } else setReviewerError('')
    if (!valid) return
    onSubmit({
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
    })
  }

  return (
    <ModusWcModal modalId={modalId} backdrop="default" position="center" showClose aria-label={title}>
      <span slot="header">{title}</span>
      <div slot="content" className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto">
        <ModusWcTextInput
          label="Group name"
          size="sm"
          required
          value={form.name}
          onInputChange={(e) => {
            setForm((prev) => ({ ...prev, name: readInputString(e as CustomEvent) }))
            setNameError('')
          }}
        />
        {nameError ? (
          <ModusWcTypography
            hierarchy="p"
            size="xs"
            customClass="text-[var(--modus-wc-color-danger)]"
            label={nameError}
          />
        ) : null}
        <ModusWcTextarea
          label="Description"
          size="sm"
          value={form.description}
          onInputChange={(e) =>
            setForm((prev) => ({ ...prev, description: readInputString(e as CustomEvent) }))
          }
        />
        <ModusWcSelect
          label="Default reviewer"
          size="sm"
          value={form.defaultReviewerAssignment.type}
          options={REVIEWER_TYPE_OPTIONS}
          onInputChange={(e) =>
            setReviewerType(readInputString(e as CustomEvent) as ReviewerRoleType)
          }
        />
        <div
          hidden={form.defaultReviewerAssignment.type !== 'custom'}
          aria-hidden={form.defaultReviewerAssignment.type !== 'custom'}
        >
          <ModusWcAutocomplete
            label="Custom reviewer"
            size="sm"
            placeholder="Search managers"
            includeSearch
            showMenuOnFocus
            value={customManagerLabel}
            items={managerItems}
            onItemSelect={(e) => {
              const managerId = (e as CustomEvent<{ value?: string }>).detail?.value ?? ''
              if (managerId) {
                setForm((prev) => ({
                  ...prev,
                  defaultReviewerAssignment: { type: 'custom', customManagerId: managerId },
                }))
                setReviewerError('')
              }
            }}
          />
          {reviewerError ? (
            <ModusWcTypography
              hierarchy="p"
              size="xs"
              customClass="text-[var(--modus-wc-color-danger)]"
              label={reviewerError}
            />
          ) : null}
        </div>
        <ModusWcTypography hierarchy="p" size="sm" weight="semibold" label="Employees in this group" />
        <ModusWcTypography
          hierarchy="p"
          size="sm"
          customClass="text-[var(--modus-wc-color-base-content-low-contrast)]"
          label="Only employees with the employee role appear here."
        />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <ModusWcSelect
            label="Department"
            size="sm"
            value={filterDepartment}
            options={departmentOptions}
            onInputChange={(e) => setFilterDepartment(readInputString(e as CustomEvent))}
          />
          <ModusWcSelect
            label="Cost center"
            size="sm"
            value={filterCostCenter}
            options={costCenterOptions}
            onInputChange={(e) => setFilterCostCenter(readInputString(e as CustomEvent))}
          />
        </div>
        {membersError ? (
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            customClass="text-[var(--modus-wc-color-danger)]"
            label={membersError}
          />
        ) : null}
        <PerformanceDataTable
          caption="Employees for review group"
          columns={[
            { id: 'name', header: 'Employee', accessor: 'name', sortable: true },
            { id: 'title', header: 'Title', accessor: 'title', sortable: true },
            { id: 'department', header: 'Department', accessor: 'department', sortable: true },
          ]}
          data={tableData}
          density="comfortable"
          selectable="multi"
          selectedRowIds={form.memberIds}
          onRowSelectionChange={handleMemberSelection}
        />
      </div>
      <div slot="footer" className="flex justify-end gap-2">
        <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={onClose}>
          Cancel
        </ModusWcButton>
        <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={handleSave}>
          <ModusWcIcon name="save" size="xs" decorative />
          {submitLabel}
        </ModusWcButton>
      </div>
    </ModusWcModal>
  )
}
