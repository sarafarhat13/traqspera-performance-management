import { useState } from 'react'
import { PerformanceProvider, usePerformance } from './context/PerformanceContext'
import { TraqsperaShell } from './layouts/TraqsperaShell'
import { PerformanceViewRouter } from './components/PerformanceViewRouter'
import { navPageFromView, navTargetFromNavPage } from './navigation'
import type { TraqsperaNavPage } from './layouts/traqsperaShellConstants'
import { PerformanceRouterShell } from './routing/PerformanceRouterShell'
import { PerformanceUrlSync } from './routing/PerformanceUrlSync'

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

  return (
    <TraqsperaShell
      activePage={activeNavPage}
      onNavigate={handleNavigate}
      minimalChrome={
        (state.view === 'employee_details' && !viewingOwnEmployeeDetails) || employeeMobileOwnView
      }
      fullScreenContent={employeeMobileOwnView}
    >
      <PerformanceViewRouter myPerformanceVisit={myPerformanceVisit} />
    </TraqsperaShell>
  )
}

export default function App() {
  return (
    <PerformanceRouterShell mode="browser">
      <PerformanceProvider>
        <PerformanceUrlSync />
        <PerformanceApp />
      </PerformanceProvider>
    </PerformanceRouterShell>
  )
}
