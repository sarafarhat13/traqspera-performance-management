import { useState } from 'react'
import { PerformanceProvider, usePerformance } from './context/PerformanceContext'
import { TraqsperaShell } from './layouts/TraqsperaShell'
import { HRAdminDashboard } from './components/HRAdminDashboard'
import { TemplateList } from './components/TemplateList'
import { TemplateEditor } from './components/TemplateEditor'
import { EmployeeDashboard } from './components/EmployeeDashboard'
import { SelfEvaluationForm } from './components/SelfEvaluationForm'
import { AcknowledgementScreen } from './components/AcknowledgementScreen'
import { ManagerDashboard } from './components/ManagerDashboard'
import { ManagerReviewForm } from './components/ManagerReviewForm'
import { LaunchCycleWizard } from './components/LaunchCycleWizard'
import { ReviewGroupsAdmin } from './components/ReviewGroupsAdmin'
import { CycleDetailView } from './components/CycleDetailView'
import { EmployeeDetails } from './components/EmployeeDetails'
import { PerformanceReviewDetails } from './components/PerformanceReviewDetails'
import { navPageFromView, navTargetFromNavPage } from './navigation'
import type { TraqsperaNavPage } from './layouts/traqsperaShellConstants'

/** Demo persona for Performance admin surfaces (templates, cycles, review groups). */
const HR_ADMIN_DEMO_PERSON_ID = 'hr-1'

const HR_ADMIN_NAV_PAGES: ReadonlySet<TraqsperaNavPage> = new Set([
  'p_perf_dashboard',
  'p_perf_templates',
  'p_perf_review_groups',
])

function PerformanceApp() {
  const {
    state,
    setView,
    setEmployeeDetailsTab,
    selectPerson,
    openMyPerformance,
    openManagerTeamReviews,
    setActivePersonId,
  } = usePerformance()
  const [myPerformanceVisit, setMyPerformanceVisit] = useState(0)

  const activeNavPage = navPageFromView(state.view, {
    selectedPersonId: state.selectedPersonId,
    activePersonId: state.activePersonId,
    employeeDetailsTab: state.employeeDetailsTab,
    selectedCycleId: state.selectedCycleId,
  })

  const handleNavigate = (page: TraqsperaNavPage) => {
    if (page === 'my_info_performance') {
      openMyPerformance()
      setMyPerformanceVisit((visit) => visit + 1)
      return
    }

    if (page === 'p_perf_team') {
      openManagerTeamReviews()
      return
    }

    if (HR_ADMIN_NAV_PAGES.has(page)) {
      setActivePersonId(HR_ADMIN_DEMO_PERSON_ID)
    }

    const target = navTargetFromNavPage(page, state.activePersonId)
    if (!target) return
    if (target.selectedPersonId !== undefined) {
      selectPerson(target.selectedPersonId)
    }
    if (target.employeeDetailsTab) {
      setEmployeeDetailsTab(target.employeeDetailsTab)
    }
    setView(target.view)
  }

  const viewingOwnEmployeeDetails =
    state.view === 'employee_details' &&
    state.selectedPersonId !== null &&
    state.selectedPersonId === state.activePersonId

  const employeeMobileOwnView =
    viewingOwnEmployeeDetails && state.layoutMode === 'mobile'

  const content = (() => {
    switch (state.view) {
      case 'hr_dashboard':
        return <HRAdminDashboard />
      case 'cycle_details':
        return <CycleDetailView />
      case 'employee_details':
        return <EmployeeDetails myPerformanceVisit={myPerformanceVisit} />
      case 'templates':
        return <TemplateList />
      case 'template_editor':
        return <TemplateEditor />
      case 'review_groups':
        return <ReviewGroupsAdmin />
      case 'launch_cycle_wizard':
        return <LaunchCycleWizard />
      case 'employee_dashboard':
        return <EmployeeDashboard />
      case 'self_eval':
        return <SelfEvaluationForm />
      case 'acknowledgement':
        return <AcknowledgementScreen />
      case 'manager_dashboard':
        return <ManagerDashboard />
      case 'manager_review':
        return <ManagerReviewForm />
      case 'review_details':
        return <PerformanceReviewDetails />
      default:
        return <HRAdminDashboard />
    }
  })()

  return (
    <TraqsperaShell
      activePage={activeNavPage}
      onNavigate={handleNavigate}
      minimalChrome={
        (state.view === 'employee_details' && !viewingOwnEmployeeDetails) || employeeMobileOwnView
      }
      fullScreenContent={employeeMobileOwnView}
    >
      {content}
    </TraqsperaShell>
  )
}

export default function App() {
  return (
    <PerformanceProvider>
      <PerformanceApp />
    </PerformanceProvider>
  )
}
