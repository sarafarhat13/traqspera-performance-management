export type DemoRole = 'hr_admin' | 'employee' | 'manager'

export type ReviewStatus =
  | 'not_started'
  | 'self_eval_pending'
  | 'manager_pending'
  | 'acknowledgement_pending'
  | 'completed'

export type CycleStatus = 'draft' | 'active' | 'completed'

export type EmployeeDetailsTab =
  | 'personal'
  | 'emergency_contact'
  | 'certifications'
  | 'my_hours'
  | 'time_off_balance'
  | 'performance'
  | 'additional'
  | 'history'

export type ViewId =
  | 'hr_dashboard'
  | 'cycle_details'
  | 'employee_details'
  | 'templates'
  | 'template_editor'
  | 'launch_cycle_wizard'
  | 'employee_dashboard'
  | 'self_eval'
  | 'acknowledgement'
  | 'manager_dashboard'
  | 'manager_review'
  | 'review_details'

export type WorkflowStepType = 'employee' | 'manager' | 'acknowledgement' | 'rating_scale'

export interface WorkflowStep {
  id: string
  type: WorkflowStepType
  enabled: boolean
  order: number
  deadline: string
}

export interface RatingScaleConfig {
  min: number
  max: number
  labels: string[]
}

export interface Question {
  id: string
  label: string
  required: boolean
  weight: number
  order: number
  type: 'textarea'
  enableWeight?: boolean
  enableRatingScale?: boolean
}

export interface ReviewTemplate {
  id: string
  name: string
  description: string
  questions: Question[]
  isPrebuilt?: boolean
}

export interface ReviewCycle {
  id: string
  name: string
  description?: string
  createdBy?: string
  templateId: string
  /** When the review cycle opens for participants */
  startDate: string
  /** Final due date for the cycle (end of review period) */
  dueDate: string
  includesSelfEvaluation: boolean
  workflow?: WorkflowStep[]
  ratingScale?: RatingScaleConfig
  status: CycleStatus
  employeeIds: string[]
  /** Saved reviewer picks when cycle is still a draft */
  reviewerAssignments?: Record<string, EmployeeReviewerAssignment>
}

export type ReviewerRoleType = 'crew_manager' | 'supervisor' | 'custom'

export interface EmployeeReviewerAssignment {
  type: ReviewerRoleType
  /** Selected manager when type is `custom` */
  customManagerId?: string
}

export interface Person {
  id: string
  name: string
  role: DemoRole
  department: string
  costCenter: string
  title: string
  union: string
  /** Crew manager (direct line manager) */
  managerId?: string
  /** Field / department supervisor */
  supervisorId?: string
}

export interface PhaseAnswers {
  answers: Record<string, string>
  completedAt?: string
}

export interface PerformanceReview {
  id: string
  cycleId: string
  employeeId: string
  managerId: string
  reviewerType?: ReviewerRoleType
  customReviewerName?: string
  status: ReviewStatus
  selfEval?: PhaseAnswers
  managerReview?: PhaseAnswers
  acknowledgement?: { acknowledged: boolean; completedAt?: string }
}

export interface AppState {
  demoRole: DemoRole
  activePersonId: string
  view: ViewId
  selectedTemplateId: string | null
  selectedCycleId: string | null
  selectedPersonId: string | null
  employeeDetailsTab: EmployeeDetailsTab
  selectedReviewId: string | null
  editingTemplateId: string | null
  layoutMode: 'desktop' | 'mobile'
  templates: ReviewTemplate[]
  cycles: ReviewCycle[]
  reviews: PerformanceReview[]
  people: Person[]
}

export const PUSH_LAYOUT_MIN_PX = 1024
export const SIDE_NAV_MIN_WIDTH = '4rem'
export const SIDE_NAV_MAX_WIDTH = '16rem'
