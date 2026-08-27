import type { CycleStatus, DemoRole, PerformanceReview, ReviewCycle, ReviewStatus } from '../types'
import { CYCLE_STATUS_LABELS, cycleStatusBadgeColor, MANAGER_DASHBOARD_STATUS_LABELS, managerDashboardStatusBadgeColor, STATUS_LABELS, statusBadgeColor } from './status'
import { formatCurrentStageDue, isReviewActionRequired } from './workflow'

type TableButtonColor = 'primary' | 'tertiary' | 'danger'

export function createTableCheckbox(
  checked: boolean,
  onToggle: () => void,
  ariaLabel: string,
  indeterminate = false,
) {
  const checkbox = document.createElement('modus-wc-checkbox')
  checkbox.setAttribute('size', 'sm')
  checkbox.setAttribute('aria-label', ariaLabel)
  ;(checkbox as unknown as { value: boolean; indeterminate: boolean }).value = checked
  ;(checkbox as unknown as { indeterminate: boolean }).indeterminate = indeterminate
  checkbox.addEventListener('inputChange', (event) => {
    event.stopPropagation()
    onToggle()
  })
  return checkbox
}

export function createTableActionButton(
  label: string,
  onClick: () => void,
  color: TableButtonColor = 'primary',
  disabled = false,
) {
  const button = document.createElement('modus-wc-button')
  button.setAttribute('variant', 'borderless')
  button.setAttribute('color', color)
  button.setAttribute('size', 'sm')
  if (disabled) button.setAttribute('disabled', 'true')
  button.textContent = label
  button.addEventListener('buttonClick', (event) => {
    event.stopPropagation()
    if (!disabled) onClick()
  })
  return button
}

export function createCycleStatusBadge(status: CycleStatus) {
  const badge = document.createElement('modus-wc-badge')
  badge.setAttribute('variant', 'filled')
  badge.setAttribute('color', cycleStatusBadgeColor(status))
  badge.setAttribute('size', 'sm')
  if (status === 'draft') {
    badge.setAttribute('customClass', 'tq-cycle-status-badge--draft')
  }
  badge.textContent = CYCLE_STATUS_LABELS[status]
  return badge
}

export function createReviewStatusBadge(status: ReviewStatus) {
  const badge = document.createElement('modus-wc-badge')
  badge.setAttribute('variant', 'filled')
  badge.setAttribute('color', statusBadgeColor(status))
  badge.setAttribute('size', 'sm')
  badge.textContent = STATUS_LABELS[status]
  return badge
}

export function createManagerReviewStatusBadge(status: ReviewStatus) {
  const badge = document.createElement('modus-wc-badge')
  badge.setAttribute('variant', 'filled')
  badge.setAttribute('color', managerDashboardStatusBadgeColor(status))
  badge.setAttribute('size', 'sm')
  badge.textContent = MANAGER_DASHBOARD_STATUS_LABELS[status]
  return badge
}

export function createNeutralTagBadge(label: string) {
  const badge = document.createElement('modus-wc-badge')
  badge.setAttribute('variant', 'filled')
  badge.setAttribute('color', 'secondary')
  badge.setAttribute('size', 'sm')
  badge.textContent = label
  return badge
}

export function createTableActionGroup(children: HTMLElement[]) {
  const group = document.createElement('div')
  group.className = 'flex flex-wrap items-center gap-2'
  children.forEach((child) => group.appendChild(child))
  return group
}

export function createReviewerAssignmentCell(
  assignment: { type: string; customManagerId?: string },
  managerOptions: { label: string; value: string }[],
  onTypeChange: (type: string) => void,
  onCustomManagerChange: (managerId: string) => void,
  ariaLabel: string,
) {
  const wrapper = document.createElement('div')
  wrapper.className = 'tq-table-reviewer-select flex min-w-[12rem] flex-col gap-1'
  wrapper.addEventListener('click', (event) => event.stopPropagation())
  wrapper.addEventListener('mousedown', (event) => event.stopPropagation())
  wrapper.addEventListener('pointerdown', (event) => event.stopPropagation())

  const select = document.createElement('modus-wc-select') as HTMLElement & {
    options: { label: string; value: string }[]
    value: string
  }
  select.setAttribute('size', 'sm')
  select.setAttribute('aria-label', ariaLabel)
  select.options = [
    { label: 'Crew Manager', value: 'crew_manager' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Custom (select manager)', value: 'custom' },
  ]
  select.value = assignment.type

  select.addEventListener('inputChange', (event) => {
    event.stopPropagation()
    const customEvent = event as CustomEvent<InputEvent>
    const nextType = (customEvent.detail?.target as HTMLSelectElement | null)?.value
    if (typeof nextType === 'string' && nextType && nextType !== assignment.type) {
      onTypeChange(nextType)
    }
  })

  wrapper.appendChild(select)

  if (assignment.type === 'custom') {
    const selectedManager = managerOptions.find((option) => option.value === assignment.customManagerId)
    const autocomplete = document.createElement('modus-wc-autocomplete') as HTMLElement & {
      items: Array<{
        label: string
        value: string
        visibleInMenu: boolean
        selected?: boolean
      }>
      value: string
    }
    autocomplete.setAttribute('size', 'sm')
    autocomplete.setAttribute('aria-label', `${ariaLabel} — search managers`)
    autocomplete.setAttribute('placeholder', 'Search managers')
    autocomplete.value = selectedManager?.label ?? ''
    autocomplete.items = managerOptions.map((option) => ({
      label: option.label,
      value: option.value,
      visibleInMenu: true,
      selected: option.value === assignment.customManagerId,
    }))

    autocomplete.addEventListener('itemSelect', (event) => {
      event.stopPropagation()
      const item = (event as CustomEvent<{ value?: string }>).detail
      const nextManagerId = item?.value
      if (typeof nextManagerId === 'string' && nextManagerId && nextManagerId !== assignment.customManagerId) {
        onCustomManagerChange(nextManagerId)
      }
    })
    autocomplete.addEventListener('inputChange', (event) => event.stopPropagation())

    wrapper.appendChild(autocomplete)
  }

  return wrapper
}

export function createManagerSelectCell(
  managerId: string,
  options: { label: string; value: string }[],
  onChange: (managerId: string) => void,
  ariaLabel: string,
) {
  const wrapper = document.createElement('div')
  wrapper.className = 'tq-table-manager-select min-w-[12rem]'

  const select = document.createElement('modus-wc-select') as HTMLElement & {
    options: { label: string; value: string }[]
    value: string
  }
  select.setAttribute('size', 'sm')
  select.setAttribute('aria-label', ariaLabel)
  select.options = options
  select.value = managerId

  select.addEventListener('inputChange', (event) => {
    event.stopPropagation()
    const customEvent = event as CustomEvent<InputEvent>
    const nextManagerId = (customEvent.detail?.target as HTMLSelectElement | null)?.value
    if (typeof nextManagerId === 'string' && nextManagerId && nextManagerId !== managerId) {
      onChange(nextManagerId)
    }
  })

  wrapper.appendChild(select)
  return wrapper
}

export function createStageDueCell(
  cycle: ReviewCycle,
  review: PerformanceReview,
  context?: { role?: DemoRole; personId?: string },
) {
  const label = formatCurrentStageDue(cycle, review)
  if (!label) {
    const empty = document.createElement('span')
    empty.textContent = '—'
    return empty
  }

  const actionRequired = isReviewActionRequired(review, context)
  const row = document.createElement('div')
  row.className = 'flex min-w-0 items-start gap-1.5'

  if (actionRequired) {
    const icon = document.createElement('modus-wc-icon')
    icon.setAttribute('name', 'warning')
    icon.setAttribute('size', 'xs')
    icon.setAttribute('aria-label', 'Action required')
    icon.className = 'shrink-0 text-[var(--modus-wc-color-warning)]'
    row.appendChild(icon)
  }

  const text = document.createElement('span')
  text.className = actionRequired
    ? 'min-w-0 text-sm font-semibold text-[var(--modus-wc-color-warning)]'
    : 'min-w-0 text-sm text-[var(--modus-wc-color-base-content-low-contrast)]'
  text.textContent = label
  row.appendChild(text)

  return row
}
