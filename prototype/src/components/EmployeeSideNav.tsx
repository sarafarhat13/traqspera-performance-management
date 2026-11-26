import {
  ModusWcAvatar,
  ModusWcButton,
  ModusWcIcon,
  ModusWcMenu,
  ModusWcMenuItem,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { EmployeeDetailsTab } from '../types'

const DETAIL_TABS: {
  id: EmployeeDetailsTab
  label: string
  icon: string
}[] = [
  { id: 'personal', label: 'Personal & Employment Info', icon: 'user_account' },
  { id: 'emergency_contact', label: 'Emergency Contact', icon: 'contacts' },
  { id: 'certifications', label: 'Certifications', icon: 'certificate' },
  { id: 'time_off_balance', label: 'Time Off Balance', icon: 'time_off_work' },
  { id: 'performance', label: 'Performance', icon: 'star' },
  { id: 'additional', label: 'Additional Info', icon: 'user_passkey' },
  { id: 'history', label: 'History', icon: 'history' },
]

const SELF_HIDDEN_TABS = new Set<EmployeeDetailsTab>(['additional', 'history'])

function formatEmployeeNumber(personId: string): string {
  const digits = personId.replace(/\D/g, '')
  return `# ${digits.padStart(5, '0')}`
}

type EmployeeSideNavProps = {
  person: {
    id: string
    name: string
    title: string
  }
  activeTab: EmployeeDetailsTab
  onSelectTab: (tab: EmployeeDetailsTab) => void
  /** Self view omits History and Additional Info. Manager view keeps the full list. */
  variant?: 'self' | 'manager'
}

export function EmployeeSideNav({
  person,
  activeTab,
  onSelectTab,
  variant = 'manager',
}: EmployeeSideNavProps) {
  const handleItemSelect = (e: CustomEvent<{ value: string }>) => {
    onSelectTab(e.detail.value as EmployeeDetailsTab)
  }

  const tabs =
    variant === 'self' ? DETAIL_TABS.filter((tab) => !SELF_HIDDEN_TABS.has(tab.id)) : DETAIL_TABS

  return (
    <aside className="employee-detail-sidenav w-full shrink-0 lg:w-[214px]">
      <div className="overflow-hidden border border-[#e0e1e9] bg-white">
        <div className="employee-detail-sidenav__profile flex flex-col items-center border-b border-[#e0e1e9] px-4 pb-5 pt-[18px] text-center">
          <ModusWcAvatar
            imgSrc={`https://i.pravatar.cc/240?u=${encodeURIComponent(person.id)}`}
            alt={`${person.name} profile photo`}
            shape="circle"
            size="xl"
          />

          <ModusWcButton
            variant="borderless"
            color="primary"
            size="sm"
            disabled
            customClass="mt-3"
          >
            <ModusWcIcon name="pencil" size="xs" decorative />
            Edit Photo
          </ModusWcButton>

          <ModusWcTypography
            hierarchy="p"
            size="sm"
            label={formatEmployeeNumber(person.id)}
            customClass="!mt-4 !mb-0 text-[#6a6e79]"
          />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            weight="semibold"
            label={person.name.toUpperCase()}
            customClass="!mt-1 !mb-0 uppercase tracking-[0.01em] text-[#252a2e]"
          />
          <ModusWcTypography
            hierarchy="p"
            size="sm"
            label={person.title}
            customClass="!mt-0.5 !mb-0 text-[#6a6e79]"
          />
        </div>

        <nav aria-label="Employee detail sections">
          <ModusWcMenu size="md" customClass="employee-detail-sidenav__menu">
            {tabs.map((tab) => (
              <ModusWcMenuItem
                key={tab.id}
                label={tab.label}
                value={tab.id}
                selected={activeTab === tab.id}
                size="md"
                onItemSelect={handleItemSelect}
              >
                <ModusWcIcon slot="start-icon" name={tab.icon} size="sm" decorative />
              </ModusWcMenuItem>
            ))}
          </ModusWcMenu>
        </nav>
      </div>
    </aside>
  )
}
