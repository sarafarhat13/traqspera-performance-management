import { usePerformance } from '../context/PerformanceContext'
import { HRAdminDashboard } from './HRAdminDashboard'
import { TemplateList } from './TemplateList'
import { TemplateEditor } from './TemplateEditor'
import { EmployeeDashboard } from './EmployeeDashboard'
import { SelfEvaluationForm } from './SelfEvaluationForm'
import { AcknowledgementScreen } from './AcknowledgementScreen'
import { ManagerDashboard } from './ManagerDashboard'
import { ManagerReviewForm } from './ManagerReviewForm'
import { LaunchCycleWizard } from './LaunchCycleWizard'
import { ReviewGroupsAdmin } from './ReviewGroupsAdmin'
import { CycleDetailView } from './CycleDetailView'
import { EmployeeDetails } from './EmployeeDetails'
import { PerformanceReviewDetails } from './PerformanceReviewDetails'

export function PerformanceViewRouter({ myPerformanceVisit = 0 }: { myPerformanceVisit?: number }) {
  const { state } = usePerformance()

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
      return <LaunchCycleWizard key={state.editingCycleId ?? 'new'} />
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
}
