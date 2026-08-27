import { useEffect } from 'react'
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
import { CycleDetailView } from './components/CycleDetailView'
import { EmployeeDetails } from './components/EmployeeDetails'
import { PerformanceReviewDetails } from './components/PerformanceReviewDetails'
import { navPageFromView, navTargetFromNavPage } from './navigation'
import type { TraqsperaNavPage } from './layouts/traqsperaShellConstants'

function PerformanceApp() {
  const { state, setView, setEmployeeDetailsTab, selectPerson } = usePerformance()

  useEffect(() => {
    if (state.demoRole === 'employee' && state.view === 'employee_dashboard') {
      selectPerson(state.activePersonId)
      if (state.layoutMode !== 'mobile') {
        setEmployeeDetailsTab('performance')
      }
      setView('employee_details')
    }
  }, [
    state.demoRole,
    state.view,
    state.activePersonId,
    state.layoutMode,
    selectPerson,
    setEmployeeDetailsTab,
    setView,
  ])

  const activeNavPage = navPageFromView(state.view, state.demoRole, {
    selectedPersonId: state.selectedPersonId,
    activePersonId: state.activePersonId,
    employeeDetailsTab: state.employeeDetailsTab,
  })

  const handleNavigate = (page: TraqsperaNavPage) => {
    const target = navTargetFromNavPage(page, state.demoRole, state.activePersonId)
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
    viewingOwnEmployeeDetails &&
    state.demoRole === 'employee' &&
    state.layoutMode === 'mobile'

  const content = (() => {
    switch (state.view) {
      case 'hr_dashboard':
        return <HRAdminDashboard />
      case 'cycle_details':
        return <CycleDetailView />
      case 'employee_details':
        return <EmployeeDetails />
      case 'templates':
        return <TemplateList />
      case 'template_editor':
        return <TemplateEditor />
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
