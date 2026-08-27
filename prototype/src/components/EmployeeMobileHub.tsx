import { ModusWcAvatar, ModusWcIcon } from '@trimble-oss/moduswebcomponents-react'
import { EMPLOYEE_MOBILE_HUB_ITEMS, formatEmployeeCode, type EmployeeMobileHubSection } from './employeeMobileConstants'

type EmployeeMobileHubProps = {
  person: {
    id: string
    name: string
    title: string
  }
  supervisorName?: string
  onSelectSection: (section: EmployeeMobileHubSection) => void
}

export function EmployeeMobileHub({ person, supervisorName, onSelectSection }: EmployeeMobileHubProps) {
  return (
    <div className="tq-employee-mobile-hub tq-employee-view px-4 pb-4 pt-4">
      <section
        className="tq-employee-mobile-profile-card mb-3 rounded-[8px] border border-[#e0e1e9] bg-white p-4 shadow-sm"
        aria-label="Employee profile"
      >
        <div className="flex items-start gap-3">
          <ModusWcAvatar
            imgSrc={`https://i.pravatar.cc/240?u=${encodeURIComponent(person.id)}`}
            alt={`${person.name} profile photo`}
            shape="circle"
            size="lg"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[14px] font-bold uppercase leading-[20px] tracking-[0.01em] text-[#252a2e]">
              {person.name}
            </p>
            <p className="mt-0.5 text-[12px] font-semibold leading-[16px] text-[#6a6e79]">
              {formatEmployeeCode(person.id)}
            </p>
            <p className="mt-1 text-[13px] leading-[18px] text-[#252a2e]">{person.title}</p>
            {supervisorName && (
              <p className="mt-1 text-[12px] leading-[16px] text-[#6a6e79]">
                Supervisor: {supervisorName}
              </p>
            )}
          </div>
        </div>
      </section>

      <nav aria-label="My Info sections" className="flex flex-col gap-2">
        {EMPLOYEE_MOBILE_HUB_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="tq-employee-mobile-nav-row"
            onClick={() => onSelectSection(item.id)}
          >
            <span className="tq-employee-mobile-nav-row__icon" aria-hidden>
              <ModusWcIcon name={item.icon} size="sm" decorative customClass="text-white" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[14px] font-bold leading-[20px] text-[#0063a3]">
                {item.label}
              </span>
              <span className="mt-0.5 block text-[12px] leading-[16px] text-[#6a6e79]">
                {item.description}
              </span>
            </span>
            <ModusWcIcon
              name="chevron_right"
              size="sm"
              decorative
              customClass="shrink-0 text-[#0063a3]/50"
            />
          </button>
        ))}
      </nav>
    </div>
  )
}
