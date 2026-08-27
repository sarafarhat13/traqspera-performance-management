import { ModusWcBadge, ModusWcSelect } from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import { readInputString } from '../utils/modusFormEvents'
import type { DemoRole } from '../types'

const ROLE_OPTIONS = [
  { label: 'HR Admin', value: 'hr_admin' },
  { label: 'Employee', value: 'employee' },
  { label: 'Manager', value: 'manager' },
]

export function RoleSwitcher() {
  const { state, setDemoRole } = usePerformance()

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--modus-wc-color-base-200)] bg-[var(--modus-wc-color-base-100)] p-3">
      <ModusWcBadge variant="filled" color="secondary" size="sm">Prototype demo</ModusWcBadge>
      <ModusWcSelect
        label="View as role"
        size="sm"
        value={state.demoRole}
        options={ROLE_OPTIONS}
        onInputChange={(e) => setDemoRole(readInputString(e as CustomEvent) as DemoRole)}
      />
      <span className="text-sm text-[var(--modus-wc-color-base-content-low-contrast)]">
        Signed in as {state.people.find((p) => p.id === state.activePersonId)?.name}
      </span>
    </div>
  )
}
