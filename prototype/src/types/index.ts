export type DemoRole = 'hr_admin' | 'employee' | 'manager'

export type ReviewStatus =
  | 'not_started'
  | 'self_eval_pending'
  | 'manager_pending'
  | 'parallel_review_pending'
  | 'acknowledgement_pending'
  | 'completed'

/** Whether self-evaluation and manager evaluation run in sequence or may start together. */
export type WorkflowKickoffMode = 'sequential' | 'parallel'

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
  | 'review_groups'
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

export type TemplateLifecycleStatus = 'draft' | 'published'

export interface ReviewTemplate {
  id: string
  name: string
  description: string
  questions: Question[]
  isPrebuilt?: boolean
  createdBy?: string
  /** ISO date (YYYY-MM-DD) */
  createdAt?: string
  /** Person who last saved or archived the template. */
  updatedBy?: string
  /** Draft until used by an active review cycle; published templates are locked. */
  lifecycleStatus?: TemplateLifecycleStatus
  /** Hidden from Launch Cycle template step; still visible in template admin. */
  isArchived?: boolean
  /** ISO date (YYYY-MM-DD); updated on save and archive. */
  updatedAt?: string
}

export interface ReviewCycle {
  id: string
  name: string
  /** Optional message for participants; included in launch notification email */
  description?: string
  createdBy?: string
  templateId: string
  /** When the review cycle opens for participants (set to publish date on launch) */
  startDate: string
  /** Final due date for the cycle (end of review period) */
  dueDate: string
  /** ISO date (YYYY-MM-DD) when the cycle was published; drives dashboard start date */
  publishedAt?: string
  includesSelfEvaluation: boolean
  workflow?: WorkflowStep[]
  /** When both self-evaluation and manager evaluation are enabled, controls simultaneous vs ordered kickoff. */
  workflowKickoffMode?: WorkflowKickoffMode
  ratingScale?: RatingScaleConfig
  status: CycleStatus
  employeeIds: string[]
  /** Library groups attached when the cycle was configured */
  attachedGroupIds?: string[]
  /** Saved reviewer picks when cycle is still a draft */
  reviewerAssignments?: Record<string, EmployeeReviewerAssignment>
  /** When true, participants can attach supporting files at the end of each review form. */
  allowSupportingDocuments?: boolean
  /** Person who performs final approval and closes the cycle */
  finalApproverId?: string
  /** When the final approver closed the cycle (ISO timestamp) */
  finalApprovalCompletedAt?: string
  /** Typed signature captured at cycle completion */
  finalApprovalSignature?: string
  /** Date of final approval signature (YYYY-MM-DD) */
  finalApprovalSignedDate?: string
}

export interface ReviewCycleCompletionAttestation {
  signature: string
  signedDate: string
}

export interface ReviewEmployeeGroup {
  id: string
  name: string
  description?: string
  memberIds: string[]
  defaultReviewerAssignment: EmployeeReviewerAssignment
  createdBy?: string
  /** ISO date (YYYY-MM-DD) */
  createdAt?: string
  updatedAt?: string
}

export type ReviewerRoleType = 'crew_manager' | 'supervisor' | 'custom'

export interface EmployeeReviewerAssignment {
  type: ReviewerRoleType
  /** Selected manager when type is `custom` */
  customManagerId?: string
  /** Cycle-specific supervisor when type is `supervisor` (falls back to employee record) */
  supervisorId?: string
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

export interface SupportingDocumentAttachment {
  id: string
  fileName: string
  sizeBytes: number
  mimeType?: string
  uploadedAt: string
}

export interface PhaseAnswers {
  answers: Record<string, string>
  completedAt?: string
  /** Set when answers are saved without submitting (manager draft / live save). */
  savedAt?: string
  supportingDocuments?: SupportingDocumentAttachment[]
}

export type ReviewAcceptanceDecision = 'agree' | 'disagree'

export interface ReviewAcceptanceSubmission {
  decision: ReviewAcceptanceDecision
  comment: string
  signature: string
  /** YYYY-MM-DD */
  signedDate: string
  supportingDocuments?: SupportingDocumentAttachment[]
}

export interface ReviewAcknowledgement {
  acknowledged: boolean
  completedAt?: string
  decision?: ReviewAcceptanceDecision
  comment?: string
  signature?: string
  signedDate?: string
  /** True when the employee disagreed — HR should follow up. */
  hrEscalationRequired?: boolean
  supportingDocuments?: SupportingDocumentAttachment[]
}

/** Admin or manager sent the review back for employee self-evaluation updates. */
export interface ReviewReturnedToEmployee {
  returnedAt: string
  returnedByPersonId: string
  note?: string
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
  acknowledgement?: ReviewAcknowledgement
  returnedToEmployee?: ReviewReturnedToEmployee
}

export interface AppState {
  activePersonId: string
  view: ViewId
  selectedTemplateId: string | null
  selectedCycleId: string | null
  selectedPersonId: string | null
  employeeDetailsTab: EmployeeDetailsTab
  selectedReviewId: string | null
  editingTemplateId: string | null
  /** Draft cycle reopened in the launch wizard; null when launching a new cycle. */
  editingCycleId: string | null
  layoutMode: 'desktop' | 'mobile'
  templates: ReviewTemplate[]
  reviewGroups: ReviewEmployeeGroup[]
  cycles: ReviewCycle[]
  reviews: PerformanceReview[]
  people: Person[]
  /** One-shot message after saving a published template (not persisted). */
  templateSaveNotice: string | null
}

export const PUSH_LAYOUT_MIN_PX = 1024
export const SIDE_NAV_MIN_WIDTH = '4rem'
export const SIDE_NAV_MAX_WIDTH = '16rem'
