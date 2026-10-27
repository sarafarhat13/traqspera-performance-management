import type { CycleStatus, PerformanceReview, ReviewCycle, ReviewStatus } from '../types'
import { REVIEWER_TYPE_OPTIONS } from './reviewer'
import { reviewRequiresHrEscalation } from './acknowledgement'
import {
  CYCLE_STATUS_LABELS,
  cycleStatusBadgeColor,
  REVIEW_DISPLAY_STATUS_LABELS,
  reviewDisplayStatusBadgeColor,
  statusBadgeCustomClass,
  type ReviewDisplayStatus,
  type StatusBadgeSemanticColor,
} from './status'
import {
  formatCurrentStageDue,
  isReviewActionRequired,
  WORKFLOW_REVIEW_STAGE_LABELS,
  workflowReviewStageBadgeColor,
  type WorkflowReviewStage,
} from './workflow'
import {
  TEMPLATE_DISPLAY_STATUS_LABELS,
  templateDisplayStatusBadgeColor,
  type TemplateDisplayStatus,
} from './templateLifecycle'

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
  variant: 'borderless' | 'outlined' | 'filled' = 'borderless',
) {
  const button = document.createElement('modus-wc-button')
  button.setAttribute('variant', variant)
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

const TABLE_ICON_ACTION_CLASS = 'tq-table-icon-action-btn'

export function createTableIconActionButton(
  ariaLabel: string,
  iconName: string,
  onClick: () => void,
  color: TableButtonColor = 'tertiary',
  disabled = false,
) {
  const button = document.createElement('modus-wc-button')
  button.setAttribute('variant', 'filled')
  button.setAttribute('color', color)
  button.setAttribute('size', 'sm')
  button.setAttribute('shape', 'square')
  button.setAttribute('aria-label', ariaLabel)
  button.setAttribute('custom-class', TABLE_ICON_ACTION_CLASS)
  if (disabled) button.setAttribute('disabled', 'true')

  const icon = document.createElement('modus-wc-icon')
  icon.setAttribute('name', iconName)
  icon.setAttribute('size', 'xs')
  icon.setAttribute('decorative', 'true')
  button.appendChild(icon)

  button.addEventListener('buttonClick', (event) => {
    event.stopPropagation()
    if (!disabled) onClick()
  })
  return button
}

type ModusBadgeElement = HTMLElement & {
  variant?: string
  color?: string
  size?: string
  customClass?: string
}

function applyStatusBadgeStyle(badge: ModusBadgeElement, color: StatusBadgeSemanticColor, label: string) {
  const customClass = statusBadgeCustomClass(color)
  badge.variant = 'outlined'
  badge.color = color
  badge.size = 'sm'
  badge.customClass = customClass
  badge.setAttribute('variant', 'outlined')
  badge.setAttribute('color', color)
  badge.setAttribute('size', 'sm')
  badge.setAttribute('custom-class', customClass)
  badge.textContent = label
}

export function createCycleStatusBadge(status: CycleStatus) {
  const badge = document.createElement('modus-wc-badge')
  applyStatusBadgeStyle(badge, cycleStatusBadgeColor(status), CYCLE_STATUS_LABELS[status])
  return badge
}

export function createTemplateDisplayStatusBadge(status: TemplateDisplayStatus) {
  const badge = document.createElement('modus-wc-badge')
  applyStatusBadgeStyle(
    badge,
    templateDisplayStatusBadgeColor(status),
    TEMPLATE_DISPLAY_STATUS_LABELS[status],
  )
  return badge
}

function reviewDisplayStatusBadgeLabel(
  displayStatus: ReviewDisplayStatus,
  forTable = false,
): string {
  if (forTable && displayStatus === 'employee_acknowledgement') {
    return REVIEW_DISPLAY_STATUS_LABELS.pending
  }
  return REVIEW_DISPLAY_STATUS_LABELS[displayStatus]
}

export function createReviewDisplayStatusBadge(
  displayStatus: ReviewDisplayStatus,
  options?: { forTable?: boolean },
) {
  const badge = document.createElement('modus-wc-badge')
  applyStatusBadgeStyle(
    badge,
    reviewDisplayStatusBadgeColor(displayStatus),
    reviewDisplayStatusBadgeLabel(displayStatus, options?.forTable),
  )
  return badge
}

/** @deprecated Use `createReviewDisplayStatusBadge` with `getReviewDisplayStatus`. */
export function createReviewStatusBadge(status: ReviewStatus) {
  return createReviewDisplayStatusBadge(
    status === 'completed'
      ? 'complete'
      : status === 'not_started'
        ? 'not_started'
        : status === 'acknowledgement_pending'
          ? 'employee_acknowledgement'
          : 'pending',
  )
}

/** @deprecated Use `createReviewDisplayStatusBadge` with `getReviewDisplayStatus`. */
export function createManagerReviewStatusBadge(status: ReviewStatus) {
  return createReviewStatusBadge(status)
}

export function createWorkflowReviewStageBadge(stage: WorkflowReviewStage | 'complete') {
  const badge = document.createElement('modus-wc-badge')
  applyStatusBadgeStyle(
    badge,
    workflowReviewStageBadgeColor(stage),
    WORKFLOW_REVIEW_STAGE_LABELS[stage],
  )
  return badge
}

export function createTagBadge(label: string, color: StatusBadgeSemanticColor = 'tertiary') {
  const badge = document.createElement('modus-wc-badge')
  applyStatusBadgeStyle(badge, color, label)
  return badge
}

export function createNeutralTagBadge(label: string) {
  return createTagBadge(label, 'tertiary')
}

export function createTableActionGroup(children: HTMLElement[], iconRow = false) {
  const group = document.createElement('div')
  group.className = iconRow
    ? 'tq-table-action-icons flex flex-nowrap items-center justify-end gap-1'
    : 'flex flex-wrap items-center gap-2'
  children.forEach((child) => group.appendChild(child))
  return group
}

export function createReviewerAssignmentCell(
  assignment: { type: string; customManagerId?: string; supervisorId?: string },
  managerOptions: { label: string; value: string }[],
  onTypeChange: (type: string) => void,
  onCustomManagerChange: (managerId: string) => void,
  ariaLabel: string,
  supervisorOptions?: {
    effectiveSupervisorId: string
    supervisorMissing: boolean
    onSupervisorChange: (supervisorId: string) => void
  },
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
  select.options = REVIEWER_TYPE_OPTIONS.map((option) => ({
    label: option.label,
    value: option.value,
  }))
  select.value =
    assignment.type === 'crew_manager' ? 'supervisor' : assignment.type

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

  if (assignment.type === 'supervisor' && supervisorOptions) {
    const { effectiveSupervisorId, supervisorMissing, onSupervisorChange } = supervisorOptions

    const select = document.createElement('modus-wc-select') as HTMLElement & {
      options: { label: string; value: string }[]
      value: string
      feedback?: { level: 'error' | 'info' | 'success' | 'warning'; message?: string }
    }
    select.setAttribute('size', 'sm')
    select.setAttribute('aria-label', `${ariaLabel} — supervisor`)
    if (supervisorMissing) {
      select.setAttribute('input-aria-invalid', 'true')
      select.feedback = { level: 'error', message: 'Missing supervisor' }
    }
    select.options = [
      {
        label: supervisorMissing ? 'Missing supervisor' : 'Select supervisor…',
        value: '',
      },
      ...managerOptions,
    ]
    select.value = effectiveSupervisorId || ''

    select.addEventListener('inputChange', (event) => {
      event.stopPropagation()
      const customEvent = event as CustomEvent<InputEvent>
      const nextSupervisorId = (customEvent.detail?.target as HTMLSelectElement | null)?.value
      if (
        typeof nextSupervisorId === 'string' &&
        nextSupervisorId &&
        nextSupervisorId !== effectiveSupervisorId
      ) {
        onSupervisorChange(nextSupervisorId)
      }
    })

    wrapper.appendChild(select)
  }

  return wrapper
}

export function createManagerSelectCell(
  managerId: string,
  options: { label: string; value: string }[],
  onChange: (managerId: string) => void,
  ariaLabel: string,
  disabled = false,
) {
  const wrapper = document.createElement('div')
  wrapper.className = 'tq-table-manager-select min-w-[12rem]'

  const select = document.createElement('modus-wc-select') as HTMLElement & {
    options: { label: string; value: string }[]
    value: string
    disabled: boolean
  }
  select.setAttribute('size', 'sm')
  select.setAttribute('aria-label', ariaLabel)
  if (disabled) {
    select.setAttribute('disabled', 'true')
    select.disabled = true
  }
  select.options = options
  select.value = managerId

  select.addEventListener('inputChange', (event) => {
    if (disabled) return
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
  context?: { personId?: string },
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

export function createHrEscalationCell(review: PerformanceReview) {
  const wrap = document.createElement('div')
  wrap.className = 'flex min-w-0 items-center'
  if (!reviewRequiresHrEscalation(review)) {
    wrap.textContent = '—'
    return wrap
  }
  const badge = document.createElement('modus-wc-badge')
  applyStatusBadgeStyle(badge, 'danger', 'HR escalation')
  wrap.appendChild(badge)
  return wrap
}
