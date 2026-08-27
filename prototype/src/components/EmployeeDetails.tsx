import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Paperclip, Trash2 } from 'lucide-react'
import {
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcIcon,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import { usePerformance } from '../context/PerformanceContext'
import type { EmployeeDetailsTab } from '../types'
import { formatReviewPeriod } from '../utils/status'
import { isReviewManager } from '../utils/viewerContext'
import { CurrentStageDueLine } from './CurrentStageDueLine'
import { StatusBadge } from './StatusBadge'
import { PerformanceReviewDetailContent } from './PerformanceReviewDetailContent'
import { EmployeeSideNav } from './EmployeeSideNav'
import { EmployeeMyReviewsPanel } from './EmployeeMyReviewsPanel'
import { EmployeeSelfEvalPanel } from './EmployeeSelfEvalPanel'
import { EmployeeAcknowledgementPanel } from './EmployeeAcknowledgementPanel'
import { TRAQ_CARD_CLASS } from '../layouts/traqsperaShellConstants'
import { PageBackButton } from './PageBackButton'
import { EmployeeMobileHub } from './EmployeeMobileHub'
import { EmployeeMobileShell } from './EmployeeMobileShell'
import {
  EMPLOYEE_MOBILE_HUB_TITLE,
  EMPLOYEE_MOBILE_SECTION_TITLES,
  type EmployeeMobileHubSection,
} from './employeeMobileConstants'

type EmployeePerformanceMode = 'list' | 'self_eval' | 'acknowledgement' | 'detail'

function splitName(fullName: string): { first: string; middle: string; last: string } {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { first: parts[0], middle: '', last: '' }
  if (parts.length === 2) return { first: parts[0], middle: '', last: parts[1] }
  return { first: parts[0], middle: parts.slice(1, -1).join(' '), last: parts[parts.length - 1] }
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold leading-[16px] text-[#6a6e79]">{label}</p>
      <p className="mt-[2px] text-[13px] font-normal leading-[20px] text-[#252a2e]">{value || '—'}</p>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={`tq-section-card rounded-[4px] border border-[#e0e1e9] bg-white p-4 shadow-sm ${TRAQ_CARD_CLASS}`}>
      <h2 className="mb-4 text-left text-[14px] font-bold leading-[20px] text-[#252a2e]">{title}</h2>
      {children}
    </section>
  )
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <SectionCard title={title}>
      <p className="text-[13px] text-[#6a6e79]">{title} is not part of this performance prototype.</p>
    </SectionCard>
  )
}


function tabFromMobileSection(section: EmployeeMobileHubSection): EmployeeDetailsTab {
  if (section === 'my_earnings' || section === 'direct_deposits') {
    return 'additional'
  }
  return section
}

function mobileSectionTitle(section: EmployeeMobileHubSection): string {
  return EMPLOYEE_MOBILE_SECTION_TITLES[section]
}

export function EmployeeDetails({ myPerformanceVisit = 0 }: { myPerformanceVisit?: number }) {
  const {
    state,
    setView,
    setEmployeeDetailsTab,
    setLayoutMode,
    selectReview,
    getPerson,
    getCycle,
    getTemplate,
  } = usePerformance()

  const person = state.selectedPersonId ? getPerson(state.selectedPersonId) : undefined
  const manager = person?.managerId ? getPerson(person.managerId) : undefined
  const activeTab = state.employeeDetailsTab
  const [detailReviewId, setDetailReviewId] = useState<string | null>(null)
  const [performanceMode, setPerformanceMode] = useState<EmployeePerformanceMode>('list')
  const [mobileSectionOpen, setMobileSectionOpen] = useState(false)
  const [mobileSection, setMobileSection] = useState<EmployeeMobileHubSection>('personal')
  const isOwnEmployeeView =
    person !== undefined && person.id === state.activePersonId
  const isMobileOwnView = isOwnEmployeeView && state.layoutMode === 'mobile'

  const resetPerformanceMode = () => {
    setPerformanceMode('list')
    setDetailReviewId(null)
    selectReview(null)
  }

  useEffect(() => {
    if (!isMobileOwnView) {
      setMobileSectionOpen(false)
    }
  }, [isMobileOwnView])

  useEffect(() => {
    if (myPerformanceVisit === 0) return
    resetPerformanceMode()
    setMobileSection('performance')
    setMobileSectionOpen(state.layoutMode === 'mobile')
  }, [myPerformanceVisit, state.layoutMode])

  const employeeReviews = useMemo(() => {
    if (!person) return []
    return state.reviews
      .filter((review) => review.employeeId === person.id)
      .map((review) => {
        const cycle = getCycle(review.cycleId)
        const template = cycle ? getTemplate(cycle.templateId) : undefined
        return { review, cycle, template }
      })
  }, [person, state.reviews, getCycle, getTemplate])

  const handleBack = () => {
    if (isMobileOwnView && mobileSectionOpen) {
      if (detailReviewId || (mobileSection === 'performance' && performanceMode !== 'list')) {
        resetPerformanceMode()
        return
      }
      setMobileSectionOpen(false)
      setEmployeeDetailsTab('personal')
      resetPerformanceMode()
      return
    }

    if (detailReviewId) {
      setDetailReviewId(null)
      selectReview(null)
      return
    }
    if (state.selectedCycleId) {
      setView('cycle_details')
      return
    }
    if (state.selectedPersonId === state.activePersonId) {
      if (activeTab === 'performance') {
        resetPerformanceMode()
      }
      if (activeTab !== 'personal') {
        setEmployeeDetailsTab('personal')
        resetPerformanceMode()
      }
      return
    }
    setView('manager_dashboard')
  }

  const selectTab = (tab: EmployeeDetailsTab) => {
    if (tab !== 'performance') {
      resetPerformanceMode()
    }
    setEmployeeDetailsTab(tab)
  }

  const ownPerformanceContent =
    performanceMode === 'self_eval' && state.selectedReviewId ? (
      <EmployeeSelfEvalPanel
        reviewId={state.selectedReviewId}
        onBack={resetPerformanceMode}
        onSubmitted={resetPerformanceMode}
      />
    ) : performanceMode === 'acknowledgement' && state.selectedReviewId ? (
      <EmployeeAcknowledgementPanel
        reviewId={state.selectedReviewId}
        onBack={resetPerformanceMode}
        onSubmitted={resetPerformanceMode}
      />
    ) : detailReviewId ? (
      <div className="flex flex-col gap-3">
        {(() => {
          const activeReview = employeeReviews.find(({ review }) => review.id === detailReviewId)
          if (!activeReview) return null
          const { review, cycle } = activeReview
          return (
            <div className="flex min-w-0 items-start gap-3">
              {!isMobileOwnView && (
                <PageBackButton onBack={resetPerformanceMode} ariaLabel="Back to performance reviews" />
              )}
              <div className="mb-1 flex min-w-0 flex-1 flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="text-[16px] font-bold text-[#252a2e]">{cycle?.name ?? 'Review cycle'}</h2>
                  {cycle && (
                    <div>
                      <p className="text-[13px] text-[#6a6e79]">
                        {formatReviewPeriod(cycle.startDate, cycle.dueDate)}
                      </p>
                      <CurrentStageDueLine
                        cycle={cycle}
                        review={review}
                        activePersonId={state.activePersonId}
                        size="sm"
                      />
                    </div>
                  )}
                </div>
                <StatusBadge status={review.status} />
              </div>
            </div>
          )
        })()}
        <PerformanceReviewDetailContent reviewId={detailReviewId} />
      </div>
    ) : (
      <EmployeeMyReviewsPanel
        reviews={employeeReviews}
        onSelfEval={(reviewId) => {
          selectReview(reviewId)
          setPerformanceMode('self_eval')
        }}
        onAcknowledge={(reviewId) => {
          selectReview(reviewId)
          setPerformanceMode('acknowledgement')
        }}
        onViewDetails={(reviewId) => {
          selectReview(reviewId)
          setDetailReviewId(reviewId)
          setPerformanceMode('detail')
        }}
      />
    )

  const layoutModeToggle = (
    <div className="flex shrink-0 gap-1">
      <ModusWcButton
        variant={state.layoutMode === 'desktop' ? 'filled' : 'outlined'}
        color={state.layoutMode === 'desktop' ? 'primary' : 'tertiary'}
        size="sm"
        onButtonClick={() => setLayoutMode('desktop')}
      >
        Desktop
      </ModusWcButton>
      <ModusWcButton
        variant={state.layoutMode === 'mobile' ? 'filled' : 'outlined'}
        color={state.layoutMode === 'mobile' ? 'primary' : 'tertiary'}
        size="sm"
        onButtonClick={() => setLayoutMode('mobile')}
      >
        Mobile
      </ModusWcButton>
    </div>
  )

  const openMobileSection = (section: EmployeeMobileHubSection) => {
    setMobileSection(section)
    setMobileSectionOpen(true)
    if (section !== 'performance') {
      resetPerformanceMode()
    }
    setEmployeeDetailsTab(tabFromMobileSection(section))
  }

  if (!person) {
    return (
      <div className="min-h-full bg-[#f1f1f6] p-6">
        <div className="mb-3 flex items-center gap-3">
          <PageBackButton onBack={handleBack} ariaLabel="Back" />
          <h1 className="text-[18px] font-bold leading-[28px] text-[#252a2e]">Employee Details</h1>
        </div>
        <ModusWcTypography hierarchy="p" size="md" label="Select an employee to view details." />
      </div>
    )
  }

  const { first, middle, last } = splitName(person.name)
  const location = person.department.includes('Operations')
    ? 'Seattle'
    : person.department.includes('Finance')
      ? 'Finance Hub'
      : person.department

  const isMobileSectionVisible = (section: EmployeeMobileHubSection | EmployeeDetailsTab) => {
    if (!isMobileOwnView) {
      return activeTab === section
    }
    if (!mobileSectionOpen) {
      return false
    }
    return mobileSection === section
  }

  const sectionPanels = (
    <>
      <div hidden={!isMobileSectionVisible('personal')} aria-hidden={!isMobileSectionVisible('personal')}>
        <div className="flex flex-col gap-3">
          <SectionCard title="Personal Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <InfoField label="First Name" value={first} />
              <InfoField label="Middle Name" value={middle} />
              <InfoField label="Last Name" value={last} />
              <InfoField label="Birthday" value="10/2/1976" />
              <InfoField label="Gender" value="Male" />
              <div className="hidden lg:block" aria-hidden />
              <InfoField label="Address" value="4567 12th Ave" />
              <InfoField label="City" value={location} />
              <InfoField label="Country" value="USA" />
              <InfoField label="Region" value="King County" />
              <InfoField label="Postal/Zip Code" value="98115" />
              <div className="hidden lg:block" aria-hidden />
              <InfoField label="Primary Phone" value="206-589-5874" />
              <InfoField label="Secondary phone" value="206-548-5789" />
            </div>
          </SectionCard>

          <SectionCard title="Employment Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <InfoField label="Cost Center" value={`${location} Cost Center`} />
              <InfoField label="Hire Date" value="11/11/2025" />
              <InfoField label="Current Location" value={location} />
              <div className="hidden lg:block" aria-hidden />
              <InfoField label="Union Code" value="23" />
              <InfoField label="Wage Code" value="23" />
              <InfoField label="Rate Level" value="P3" />
              <InfoField label="Department" value={person.department} />
              <InfoField label="Employment Status" value="Active" />
              <InfoField label="Status Comment" value="Great Hire!" />
              <div className="flex min-w-0 items-end">
                <ModusWcCheckbox label="Automatically Update Status" value={true} disabled />
              </div>
            </div>
            {manager && <p className="mt-4 text-[12px] text-[#6a6e79]">Manager: {manager.name}</p>}
          </SectionCard>
        </div>
      </div>

      <div hidden={!isMobileSectionVisible('emergency_contact')} aria-hidden={!isMobileSectionVisible('emergency_contact')}>
        <SectionCard title="Emergency Contact">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <InfoField label="Contact Name" value="Jordan Donin" />
            <InfoField label="Relationship" value="Spouse" />
            <InfoField label="Primary Phone" value="206-555-0142" />
            <InfoField label="Secondary Phone" value="—" />
            <InfoField label="Email" value="jordan.donin@example.com" />
            <InfoField label="Address" value="4567 12th Ave, Seattle, WA 98115" />
          </div>
        </SectionCard>
      </div>

      <div hidden={!isMobileSectionVisible('certifications')} aria-hidden={!isMobileSectionVisible('certifications')}>
        <PlaceholderTab title="Certifications" />
      </div>

      <div hidden={!isMobileSectionVisible('my_hours')} aria-hidden={!isMobileSectionVisible('my_hours')}>
        <PlaceholderTab title="My Hours (Timesheet Review)" />
      </div>

      <div hidden={!isMobileSectionVisible('time_off_balance')} aria-hidden={!isMobileSectionVisible('time_off_balance')}>
        <SectionCard title="Time Off Balance">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InfoField label="Vacation" value="80.0 hrs" />
            <InfoField label="Sick Leave" value="40.0 hrs" />
            <InfoField label="Personal" value="16.0 hrs" />
            <InfoField label="Floating Holiday" value="8.0 hrs" />
          </div>
        </SectionCard>
      </div>

      <div hidden={!isMobileSectionVisible('my_earnings')} aria-hidden={!isMobileSectionVisible('my_earnings')}>
        <PlaceholderTab title="My Earnings" />
      </div>

      <div hidden={!isMobileSectionVisible('direct_deposits')} aria-hidden={!isMobileSectionVisible('direct_deposits')}>
        <PlaceholderTab title="Direct Deposits" />
      </div>

      <div hidden={!isMobileSectionVisible('performance')} aria-hidden={!isMobileSectionVisible('performance')}>
        {isOwnEmployeeView ? (
          ownPerformanceContent
        ) : (
          <div className="flex flex-col gap-3">
            {employeeReviews.length === 0 ? (
              <SectionCard title="Performance Reviews">
                <p className="text-[13px] text-[#6a6e79]">
                  No performance reviews are assigned to this employee yet.
                </p>
              </SectionCard>
            ) : (
              employeeReviews.map(({ review, cycle, template }) => {
                const highlighted = review.id === state.selectedReviewId
                return (
                  <section
                    key={review.id}
                    className={`rounded-[4px] border bg-white p-4 shadow-sm ${
                      highlighted ? 'border-[#0d3560] ring-2 ring-[#0d3560]/20' : 'border-[#e0e1e9]'
                    }`}
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[14px] font-bold text-[#252a2e]">{cycle?.name ?? 'Review cycle'}</h3>
                      <StatusBadge status={review.status} />
                    </div>
                    <p className="text-[13px] text-[#252a2e]">{template?.name ?? '—'}</p>
                    {cycle && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        <p className="text-[13px] text-[#6a6e79]">
                          {formatReviewPeriod(cycle.startDate, cycle.dueDate)}
                        </p>
                        <CurrentStageDueLine
                          cycle={cycle}
                          review={review}
                          activePersonId={state.activePersonId}
                          size="sm"
                        />
                      </div>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {isReviewManager(state.activePersonId, review) &&
                        review.status === 'manager_pending' && (
                        <ModusWcButton
                          variant="filled"
                          color="primary"
                          size="sm"
                          onButtonClick={() => {
                            selectReview(review.id)
                            setView('manager_review')
                          }}
                        >
                          <ModusWcIcon name="pencil" size="xs" decorative />
                          Complete review
                        </ModusWcButton>
                      )}
                      <ModusWcButton
                        variant="outlined"
                        color="tertiary"
                        size="sm"
                        onButtonClick={() => {
                          selectReview(review.id)
                          setDetailReviewId(review.id)
                        }}
                      >
                        View review details
                      </ModusWcButton>
                    </div>
                  </section>
                )
              })
            )}
          </div>
        )}
      </div>

      <div hidden={!isMobileSectionVisible('additional')} aria-hidden={!isMobileSectionVisible('additional')}>
        <PlaceholderTab title="Additional Info" />
      </div>

      <div hidden={!isMobileSectionVisible('history')} aria-hidden={!isMobileSectionVisible('history')}>
        <PlaceholderTab title="History" />
      </div>
    </>
  )

  if (isMobileOwnView && mobileSectionOpen) {
    return (
      <EmployeeMobileShell
        title={mobileSectionTitle(mobileSection)}
        personName={person.name}
        showBack
        onBack={handleBack}
        layoutMode={state.layoutMode}
        onLayoutModeChange={setLayoutMode}
      >
        <div className="px-4 py-4 tq-employee-view">{sectionPanels}</div>
      </EmployeeMobileShell>
    )
  }

  if (isMobileOwnView) {
    return (
      <EmployeeMobileShell
        title={EMPLOYEE_MOBILE_HUB_TITLE}
        personName={person.name}
        layoutMode={state.layoutMode}
        onLayoutModeChange={setLayoutMode}
      >
        <EmployeeMobileHub
          person={person}
          supervisorName={manager?.name}
          onSelectSection={openMobileSection}
        />
      </EmployeeMobileShell>
    )
  }

  return (
    <div className="tq-performance-surface tq-employee-view min-h-full bg-[#f1f1f6]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e0e1e9] bg-[#f1f1f6] px-6 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <PageBackButton onBack={handleBack} ariaLabel="Back" />
          <h1 className="text-[18px] font-bold leading-[28px] text-[#252a2e]">Employee Details</h1>
        </div>
        {isOwnEmployeeView ? (
          layoutModeToggle
        ) : (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              className="inline-flex h-8 items-center gap-1.5 rounded-[4px] border border-[#e0e1e9] bg-white px-3 text-[12px] font-semibold text-[#6a6e79]"
            >
              <Trash2 size={14} aria-hidden />
              Delete Employee
            </button>
            <button
              type="button"
              disabled
              className="relative inline-flex h-8 items-center gap-1.5 rounded-[4px] bg-[#0063a3] px-3 text-[12px] font-semibold text-white"
            >
              <Paperclip size={14} aria-hidden />
              Attachments
              <span className="ml-1 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-[#0063a3]">
                1
              </span>
            </button>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <EmployeeSideNav person={person} activeTab={activeTab} onSelectTab={selectTab} />
          <div className="min-w-0 flex-1">{sectionPanels}</div>
        </div>
      </div>
    </div>
  )
}
