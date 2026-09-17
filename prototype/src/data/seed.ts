import type {
  Person,
  PerformanceReview,
  Question,
  ReviewCycle,
  ReviewEmployeeGroup,
  ReviewTemplate,
  RatingScaleConfig,
  WorkflowStep,
  WorkflowStepType,
} from '../types'
import { createDefaultWorkflowSteps, workflowFromLegacy } from '../utils/workflow'

function workflowWithDeadlines(
  steps: WorkflowStep[],
  deadlines: Partial<Record<WorkflowStepType, string>>,
): WorkflowStep[] {
  return steps.map((step) => ({
    ...step,
    deadline: deadlines[step.type] ?? step.deadline,
  }))
}

export const DEFAULT_RATING_SCALE: RatingScaleConfig = {
  min: 1,
  max: 5,
  labels: ['Unsatisfactory', 'Needs improvement', 'Meets expectations', 'Exceeds', 'Outstanding'],
}

const defaultRatingScale = DEFAULT_RATING_SCALE

const annualQuestions: Question[] = [
  { id: 'q1', label: 'What were your key accomplishments this period?', required: true, weight: 25, order: 1, type: 'textarea' },
  { id: 'q2', label: 'Which goals did you not meet, and why?', required: true, weight: 25, order: 2, type: 'textarea' },
  { id: 'q3', label: 'How did you collaborate across teams?', required: false, weight: 15, order: 3, type: 'textarea' },
  { id: 'q4', label: 'What skills would you like to develop next?', required: true, weight: 35, order: 4, type: 'textarea' },
]

const newHireCheckInQuestions: Question[] = [
  {
    id: 'nh1',
    label: 'How are you settling into your role and team?',
    required: true,
    weight: 25,
    order: 1,
    type: 'textarea',
  },
  {
    id: 'nh2',
    label: 'What tools, training, or resources do you need right now?',
    required: true,
    weight: 25,
    order: 2,
    type: 'textarea',
  },
  {
    id: 'nh3',
    label: 'What questions do you have about role expectations or company culture?',
    required: true,
    weight: 25,
    order: 3,
    type: 'textarea',
  },
  {
    id: 'nh4',
    label: 'What would make your first month more successful?',
    required: true,
    weight: 25,
    order: 4,
    type: 'textarea',
  },
]

const ninetyDayQuestions: Question[] = [
  {
    id: '90d1',
    label: 'What are your key accomplishments in your first 90 days?',
    required: true,
    weight: 20,
    order: 1,
    type: 'textarea',
  },
  {
    id: '90d2',
    label: 'Which onboarding goals are on track, and which need adjustment?',
    required: true,
    weight: 20,
    order: 2,
    type: 'textarea',
  },
  {
    id: '90d3',
    label: 'What skills or knowledge would help you perform at the next level?',
    required: true,
    weight: 20,
    order: 3,
    type: 'textarea',
  },
  {
    id: '90d4',
    label: 'How effective is collaboration with your manager and teammates?',
    required: true,
    weight: 20,
    order: 4,
    type: 'textarea',
  },
  {
    id: '90d5',
    label: 'What support do you need for the next phase of your role?',
    required: true,
    weight: 20,
    order: 5,
    type: 'textarea',
  },
]

export const DEPRECATED_TEMPLATE_IDS = ['tpl-goals'] as const

export const seedTemplates: ReviewTemplate[] = [
  {
    id: 'tpl-annual',
    name: 'Annual Performance Review',
    description: 'Standard year-end review with accomplishments, goals, and development focus.',
    questions: annualQuestions,
    createdBy: 'Hannah Reed',
    createdAt: '2024-02-10',
  },
  {
    id: 'tpl-new-hire',
    name: 'New Hire Check-In',
    description: 'Early onboarding conversation to support new employees in their first weeks.',
    questions: newHireCheckInQuestions,
    isPrebuilt: true,
    createdBy: 'Traqspera',
    createdAt: '2023-06-01',
  },
  {
    id: 'tpl-90-days',
    name: '90 Days at Work',
    description: 'Structured check-in at the 90-day mark to review progress, goals, and support needs.',
    questions: ninetyDayQuestions,
    isPrebuilt: true,
    createdBy: 'Traqspera',
    createdAt: '2023-06-01',
  },
]

function assignPersonUnion(person: Omit<Person, 'union'>): string {
  if (person.role !== 'employee') return 'Non-union'
  if (
    person.department === 'Operations' &&
    ['Field Coordinator', 'Logistics Specialist', 'Site Supervisor', 'Safety Officer'].includes(
      person.title,
    )
  ) {
    return 'CUPE'
  }
  if (
    person.department === 'Finance' &&
    ['Accounts Payable Clerk', 'Payroll Specialist'].includes(person.title)
  ) {
    return 'CSU'
  }
  if (person.department === 'Information Technology' && person.title === 'Help Desk Technician') {
    return 'IBEW'
  }
  return 'Non-union'
}

const BULK_EMPLOYEE_PROFILES: Omit<Person, 'union' | 'id' | 'name' | 'role'>[] = [
  { department: 'Operations', costCenter: 'CC-100', title: 'Field Coordinator', managerId: 'mgr-1' },
  { department: 'Operations', costCenter: 'CC-150', title: 'Logistics Specialist', managerId: 'mgr-1' },
  { department: 'Operations', costCenter: 'CC-100', title: 'Project Analyst', managerId: 'mgr-1' },
  { department: 'Operations', costCenter: 'CC-150', title: 'Scheduling Coordinator', managerId: 'mgr-1' },
  { department: 'Finance', costCenter: 'CC-200', title: 'Staff Accountant', managerId: 'mgr-2' },
  { department: 'Finance', costCenter: 'CC-250', title: 'Financial Analyst', managerId: 'mgr-2' },
  { department: 'Finance', costCenter: 'CC-200', title: 'Accounts Payable Clerk', managerId: 'mgr-2' },
  { department: 'Finance', costCenter: 'CC-250', title: 'Budget Analyst', managerId: 'mgr-2' },
  { department: 'Information Technology', costCenter: 'CC-400', title: 'Software Engineer', managerId: 'mgr-3' },
  { department: 'Information Technology', costCenter: 'CC-450', title: 'Systems Administrator', managerId: 'mgr-3' },
  { department: 'Information Technology', costCenter: 'CC-400', title: 'Business Analyst', managerId: 'mgr-3' },
  { department: 'Information Technology', costCenter: 'CC-400', title: 'Help Desk Technician', managerId: 'mgr-3' },
  { department: 'Sales', costCenter: 'CC-500', title: 'Account Executive', managerId: 'mgr-1' },
  { department: 'Sales', costCenter: 'CC-550', title: 'Sales Coordinator', managerId: 'mgr-1' },
  { department: 'Human Resources', costCenter: 'CC-300', title: 'Benefits Coordinator', managerId: 'mgr-2' },
  { department: 'Human Resources', costCenter: 'CC-300', title: 'Recruiting Specialist', managerId: 'mgr-2' },
]

const BULK_FIRST_NAMES = [
  'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Cameron', 'Drew',
  'Hayden', 'Jamie', 'Kendall', 'Logan', 'Parker', 'Reese', 'Sage', 'Skyler', 'Terry', 'Blake',
  'Dana', 'Ellis', 'Finley', 'Harper', 'Jesse', 'Kai', 'Lane', 'Micah', 'Noel', 'Remy',
]

const BULK_LAST_NAMES = [
  'Anderson', 'Baker', 'Campbell', 'Diaz', 'Edwards', 'Fisher', 'Garcia', 'Hayes', 'Ingram', 'Jensen',
  'Keller', 'Lopez', 'Mitchell', 'Nguyen', 'Owens', 'Price', 'Reed', 'Stewart', 'Turner', 'Vasquez',
  'Walker', 'Young', 'Zimmerman', 'Bennett', 'Cooper', 'Dixon', 'Evans', 'Foster', 'Gray', 'Hughes',
]

/** Not in any review group or active/draft cycle — powers the Review Groups unassigned panel. */
export const UNASSIGNED_DEMO_EMPLOYEE_IDS = [
  'emp-51',
  'emp-52',
  'emp-53',
  'emp-54',
  'emp-55',
] as const

const UNASSIGNED_DEMO_EMPLOYEES: Omit<Person, 'union'>[] = [
  {
    id: 'emp-51',
    name: 'Priya Sharma',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Quality Inspector',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-52',
    name: 'Marcus Bell',
    role: 'employee',
    department: 'Finance',
    costCenter: 'CC-200',
    title: 'Payroll Analyst',
    managerId: 'mgr-2',
  },
  {
    id: 'emp-53',
    name: 'Elena Vasquez',
    role: 'employee',
    department: 'Information Technology',
    costCenter: 'CC-400',
    title: 'Data Analyst',
    managerId: 'mgr-3',
  },
  {
    id: 'emp-54',
    name: "Tyler O'Neill",
    role: 'employee',
    department: 'Sales',
    costCenter: 'CC-500',
    title: 'Inside Sales Representative',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-55',
    name: 'Hannah Kim',
    role: 'employee',
    department: 'Human Resources',
    costCenter: 'CC-300',
    title: 'HR Coordinator',
    managerId: 'mgr-2',
  },
]

function generateAdditionalEmployees(): Omit<Person, 'union'>[] {
  return Array.from({ length: 35 }, (_, index) => {
    const id = index + 21
    const profile = BULK_EMPLOYEE_PROFILES[index % BULK_EMPLOYEE_PROFILES.length]
    const first = BULK_FIRST_NAMES[index % BULK_FIRST_NAMES.length]
    const last = BULK_LAST_NAMES[index % BULK_LAST_NAMES.length]
    return {
      id: `emp-${id}`,
      name: `${first} ${last}`,
      role: 'employee',
      ...profile,
    }
  })
}

const UNASSIGNED_DEMO_BY_ID = new Map(UNASSIGNED_DEMO_EMPLOYEES.map((person) => [person.id, person]))

const ADDITIONAL_EMPLOYEES = generateAdditionalEmployees().map((person) => {
  const unassignedDemo = UNASSIGNED_DEMO_BY_ID.get(person.id)
  if (unassignedDemo) return unassignedDemo

  // Demo: keep each manager dashboard (Team Reviews) at 15+ direct-report reviews.
  if (person.id === 'emp-21' || person.id === 'emp-22' || person.id === 'emp-23') {
    return {
      ...person,
      department: 'Information Technology',
      costCenter: 'CC-450',
      title: 'Software Engineer',
      managerId: 'mgr-3',
    }
  }
  return person
})

const CYCLE_2025_EMPLOYEE_IDS = Array.from({ length: 50 }, (_, index) => `emp-${index + 1}`)

/** Mike Chen (mgr-1) direct reports used for rich manager-dashboard demo data. */
const MGR1_CORE_TEAM_EMPLOYEE_IDS = [
  'emp-1',
  'emp-2',
  'emp-3',
  'emp-4',
  'emp-5',
  'emp-6',
  'emp-7',
  'emp-16',
  'emp-17',
  'emp-18',
] as const

/**
 * Primary 2025 review status shown on Mike Chen's manager dashboard (one row per direct report;
 * highest-priority review across cycles wins — keep older cycle reviews completed when needed).
 */
const MGR1_2025_DASHBOARD_STATUS: Partial<Record<string, PerformanceReview['status']>> = {
  'emp-1': 'manager_pending',
  'emp-2': 'manager_pending',
  'emp-4': 'acknowledgement_pending',
  'emp-5': 'manager_pending',
  'emp-6': 'not_started',
  'emp-7': 'manager_pending',
  'emp-3': 'not_started',
  'emp-16': 'completed',
  'emp-17': 'acknowledgement_pending',
  'emp-18': 'acknowledgement_pending',
  'emp-24': 'completed',
  'emp-25': 'not_started',
  'emp-30': 'completed',
  'emp-31': 'not_started',
}

function create2025AnnualReviews(people: Person[]): PerformanceReview[] {
  const statusPlan: PerformanceReview['status'][] = [
    ...Array(12).fill('completed'),
    ...Array(8).fill('not_started'),
    ...Array(10).fill('self_eval_pending'),
    ...Array(11).fill('manager_pending'),
    ...Array(9).fill('acknowledgement_pending'),
  ]

  const sampleSelfEval = {
    answers: {
      q1: 'Delivered strong results against annual goals and team priorities.',
      q2: 'One cross-functional initiative slipped due to resource constraints.',
      q3: 'Collaborated regularly with peer teams and stakeholders.',
      q4: 'Focused on leadership and technical skills for the next year.',
    },
    completedAt: '2025-10-20T14:00:00Z',
  }

  const sampleManagerReview = {
    answers: {
      q1: 'Consistently met expectations with reliable follow-through.',
      q2: 'Should prioritize the delayed initiative in the next quarter.',
      q3: 'Effective partner across departments.',
      q4: 'Support development goals discussed in the review.',
    },
    completedAt: '2025-11-05T16:00:00Z',
  }

  return CYCLE_2025_EMPLOYEE_IDS.map((employeeId, index) => {
    const person = people.find((entry) => entry.id === employeeId)
    let status = statusPlan[index]
    const mgr1Status = MGR1_2025_DASHBOARD_STATUS[employeeId]
    if (mgr1Status) {
      status = mgr1Status
    }
    const review: PerformanceReview = {
      id: `rev-2025-${String(index + 1).padStart(2, '0')}`,
      cycleId: 'cycle-2025',
      employeeId,
      managerId: person?.managerId ?? 'mgr-1',
      status,
    }

    if (
      status === 'manager_pending' ||
      status === 'acknowledgement_pending' ||
      status === 'completed' ||
      status === 'self_eval_pending'
    ) {
      review.selfEval = sampleSelfEval
    }

    if (status === 'acknowledgement_pending' || status === 'completed') {
      review.managerReview = sampleManagerReview
    }

    if (status === 'completed') {
      review.acknowledgement = {
        acknowledged: true,
        completedAt: '2025-11-18T10:00:00Z',
      }
    }

    return review
  })
}

const SEED_PEOPLE_BASE: Omit<Person, 'union'>[] = [
  {
    id: 'hr-1',
    name: 'Hannah Reed',
    role: 'hr_admin',
    department: 'Human Resources',
    costCenter: 'CC-300',
    title: 'HR Specialist',
  },
  {
    id: 'mgr-1',
    name: 'Mike Chen',
    role: 'manager',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Operations Manager',
    managerId: 'sup-1',
  },
  {
    id: 'mgr-2',
    name: 'Lisa Wong',
    role: 'manager',
    department: 'Finance',
    costCenter: 'CC-200',
    title: 'Finance Director',
  },
  {
    id: 'mgr-3',
    name: 'James Rivera',
    role: 'manager',
    department: 'Information Technology',
    costCenter: 'CC-400',
    title: 'IT Director',
  },
  {
    id: 'sup-1',
    name: 'Greg Thompson',
    role: 'manager',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Field Operations Supervisor',
  },
  // Operations — Mike Chen
  {
    id: 'emp-1',
    name: 'Jane Alvarez',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Field Coordinator',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-2',
    name: 'David Park',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Project Analyst',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-4',
    name: 'Carlos Mendez',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Logistics Specialist',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-5',
    name: 'Emily Tran',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-150',
    title: 'Scheduling Coordinator',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-6',
    name: 'Robert Kim',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-150',
    title: 'Site Supervisor',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-7',
    name: 'Aisha Johnson',
    role: 'employee',
    department: 'Operations',
    costCenter: 'CC-100',
    title: 'Safety Officer',
    managerId: 'mgr-1',
  },
  // Finance — Lisa Wong & cross-team under Mike
  {
    id: 'emp-3',
    name: 'Sarah Miller',
    role: 'employee',
    department: 'Finance',
    costCenter: 'CC-200',
    title: 'Staff Accountant',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-8',
    name: 'Thomas Wright',
    role: 'employee',
    department: 'Finance',
    costCenter: 'CC-200',
    title: 'Financial Analyst',
    managerId: 'mgr-2',
  },
  {
    id: 'emp-9',
    name: 'Nina Patel',
    role: 'employee',
    department: 'Finance',
    costCenter: 'CC-200',
    title: 'Accounts Payable Clerk',
    managerId: 'mgr-2',
  },
  {
    id: 'emp-10',
    name: 'Marcus Lee',
    role: 'employee',
    department: 'Finance',
    costCenter: 'CC-250',
    title: 'Budget Analyst',
    managerId: 'mgr-2',
  },
  {
    id: 'emp-11',
    name: 'Olivia Brooks',
    role: 'employee',
    department: 'Finance',
    costCenter: 'CC-250',
    title: 'Payroll Specialist',
    managerId: 'mgr-2',
  },
  // Information Technology — James Rivera
  {
    id: 'emp-12',
    name: "Kevin O'Brien",
    role: 'employee',
    department: 'Information Technology',
    costCenter: 'CC-400',
    title: 'Software Engineer',
    managerId: 'mgr-3',
  },
  {
    id: 'emp-13',
    name: 'Priya Sharma',
    role: 'employee',
    department: 'Information Technology',
    costCenter: 'CC-400',
    title: 'Systems Administrator',
    managerId: 'mgr-3',
  },
  {
    id: 'emp-14',
    name: 'Daniel Foster',
    role: 'employee',
    department: 'Information Technology',
    costCenter: 'CC-450',
    title: 'Business Analyst',
    managerId: 'mgr-3',
  },
  {
    id: 'emp-15',
    name: 'Rachel Green',
    role: 'employee',
    department: 'Information Technology',
    costCenter: 'CC-400',
    title: 'Help Desk Technician',
    managerId: 'mgr-3',
  },
  // Sales
  {
    id: 'emp-16',
    name: 'Jason Coleman',
    role: 'employee',
    department: 'Sales',
    costCenter: 'CC-500',
    title: 'Account Executive',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-17',
    name: 'Megan Sullivan',
    role: 'employee',
    department: 'Sales',
    costCenter: 'CC-500',
    title: 'Sales Coordinator',
    managerId: 'mgr-1',
  },
  {
    id: 'emp-18',
    name: 'Andre Williams',
    role: 'employee',
    department: 'Sales',
    costCenter: 'CC-550',
    title: 'Regional Sales Manager',
    managerId: 'mgr-1',
  },
  // Human Resources
  {
    id: 'emp-19',
    name: 'Grace Huang',
    role: 'employee',
    department: 'Human Resources',
    costCenter: 'CC-300',
    title: 'Benefits Coordinator',
    managerId: 'mgr-2',
  },
  {
    id: 'emp-20',
    name: 'Ethan Moore',
    role: 'employee',
    department: 'Human Resources',
    costCenter: 'CC-300',
    title: 'Recruiting Specialist',
    managerId: 'mgr-2',
  },
  ...ADDITIONAL_EMPLOYEES,
]

function defaultSupervisorId(person: Omit<Person, 'union'>): string | undefined {
  if (person.role !== 'employee' || !person.managerId) return undefined
  if (person.managerId === 'mgr-1') return 'sup-1'
  return 'mgr-1'
}

export const seedPeople: Person[] = SEED_PEOPLE_BASE.map((person) => ({
  ...person,
  union: assignPersonUnion(person),
  supervisorId:
    person.supervisorId ??
    (person.role === 'employee' ? defaultSupervisorId(person) : undefined),
}))

export const seedReviewGroups: ReviewEmployeeGroup[] = [
  {
    id: 'rgrp-mgr1-core',
    name: 'Mike Chen — Core Team',
    description: 'Direct reports used for field operations reviews',
    memberIds: [...MGR1_CORE_TEAM_EMPLOYEE_IDS],
    defaultReviewerAssignment: { type: 'crew_manager' },
    createdBy: 'HR Admin',
    createdAt: '2025-01-10',
  },
  {
    id: 'rgrp-electrical-north',
    name: 'Electrical — North Region',
    description: 'Northern electrical crew cohort',
    memberIds: ['emp-1', 'emp-2', 'emp-3', 'emp-8', 'emp-9'],
    defaultReviewerAssignment: { type: 'supervisor' },
    createdBy: 'HR Admin',
    createdAt: '2025-02-01',
  },
  {
    id: 'rgrp-project-beta',
    name: 'Project Beta',
    description: 'Cross-functional project team',
    memberIds: ['emp-4', 'emp-5', 'emp-10', 'emp-11'],
    defaultReviewerAssignment: { type: 'custom', customManagerId: 'mgr-2' },
    createdBy: 'HR Admin',
    createdAt: '2025-02-15',
  },
]

const cycle2025Reviews = create2025AnnualReviews(seedPeople)

/** Lisa Wong final-approval demo — reset from seed on each load so the walkthrough stays available. */
export const DEMO_LISA_FINAL_APPROVAL_CYCLE_ID = 'cycle-final-pending'

/** Small roster for “ready for final approval” demo (Lisa Wong closes via signature). */
const FINAL_APPROVAL_PENDING_EMPLOYEE_IDS = ['emp-8', 'emp-9', 'emp-10', 'emp-11'] as const

function createFinalApprovalPendingReviews(people: Person[]): PerformanceReview[] {
  const selfEval = {
    answers: {
      q1: 'Met quarterly close and reporting deadlines.',
      q2: 'One automation backlog item carried to next quarter.',
      q3: 'Partnered with operations and HR on budget planning.',
      q4: 'Pursuing advanced Excel and FP&A coursework.',
    },
    completedAt: '2025-02-14T10:00:00Z',
  }
  const managerReview = {
    answers: {
      q1: 'Reliable contributor with strong attention to detail.',
      q2: 'Backlog item is tracked with a clear owner.',
      q3: 'Effective cross-functional communication.',
      q4: 'Support continued professional development.',
    },
    completedAt: '2025-02-28T14:00:00Z',
  }
  const acknowledgement = {
    acknowledged: true,
    completedAt: '2025-03-10T09:00:00Z',
  }

  return FINAL_APPROVAL_PENDING_EMPLOYEE_IDS.map((employeeId, index) => {
    const person = people.find((entry) => entry.id === employeeId)
    return {
      id: `rev-final-pending-${index + 1}`,
      cycleId: 'cycle-final-pending',
      employeeId,
      managerId: person?.managerId ?? 'mgr-2',
      status: 'completed' as const,
      selfEval,
      managerReview,
      acknowledgement,
    }
  })
}

const finalApprovalPendingReviews = createFinalApprovalPendingReviews(seedPeople)

export const seedCycles: ReviewCycle[] = [
  {
    id: 'cycle-2024',
    name: '2024 Annual Review Cycle',
    description: 'Annual performance reviews for all employees',
    createdBy: 'HR Admin',
    templateId: 'tpl-annual',
    startDate: '2024-01-15',
    dueDate: '2024-03-30',
    includesSelfEvaluation: true,
    workflow: workflowWithDeadlines(createDefaultWorkflowSteps(), {
      employee: '2024-02-15',
      manager: '2024-03-01',
      acknowledgement: '2024-03-15',
    }),
    ratingScale: defaultRatingScale,
    status: 'active',
    employeeIds: [...MGR1_CORE_TEAM_EMPLOYEE_IDS, 'mgr-1'],
  },
  {
    id: 'cycle-final-pending',
    name: '2025 Finance Annual Review',
    description:
      'Finance team annual reviews — all participant work is complete; awaiting final approval to close.',
    createdBy: 'Hannah Reed',
    templateId: 'tpl-annual',
    startDate: '2025-01-15',
    dueDate: '2025-03-30',
    includesSelfEvaluation: true,
    workflow: workflowWithDeadlines(createDefaultWorkflowSteps(), {
      employee: '2025-02-15',
      manager: '2025-03-01',
      acknowledgement: '2025-03-15',
    }),
    ratingScale: defaultRatingScale,
    status: 'active',
    employeeIds: [...FINAL_APPROVAL_PENDING_EMPLOYEE_IDS],
    finalApproverId: 'mgr-2',
  },
  {
    id: 'cycle-2025',
    name: '2025 Annual Review',
    description: 'Year-end performance reviews with self-evaluation and manager feedback.',
    createdBy: 'Hannah Reed',
    templateId: 'tpl-annual',
    startDate: '2026-06-01',
    dueDate: '2026-12-15',
    includesSelfEvaluation: true,
    workflow: workflowWithDeadlines(createDefaultWorkflowSteps(), {
      employee: '2026-08-31',
      manager: '2026-10-31',
      acknowledgement: '2026-12-10',
    }),
    ratingScale: defaultRatingScale,
    status: 'active',
    employeeIds: [...CYCLE_2025_EMPLOYEE_IDS, 'mgr-1'],
  },
  {
    id: 'cycle-90-days',
    name: '90 Days at Work Check-in',
    description: 'Manager-led 90-day progress review for recent hires.',
    createdBy: 'HR Admin',
    templateId: 'tpl-90-days',
    startDate: '2025-10-15',
    dueDate: '2025-11-30',
    includesSelfEvaluation: false,
    workflow: workflowWithDeadlines(workflowFromLegacy(false), {
      manager: '2025-11-15',
      acknowledgement: '2025-11-25',
    }),
    ratingScale: defaultRatingScale,
    status: 'active',
    employeeIds: ['emp-1', 'emp-2'],
  },
  {
    id: 'cycle-2023',
    name: '2023 Annual Review',
    description: 'Completed annual review cycle for the prior fiscal year.',
    createdBy: 'HR Admin',
    templateId: 'tpl-annual',
    startDate: '2023-10-01',
    dueDate: '2023-12-31',
    includesSelfEvaluation: true,
    workflow: workflowWithDeadlines(createDefaultWorkflowSteps(), {
      employee: '2023-11-01',
      manager: '2023-12-01',
      acknowledgement: '2023-12-15',
    }),
    ratingScale: defaultRatingScale,
    status: 'completed',
    employeeIds: ['emp-4', 'emp-5', 'emp-6', 'mgr-1'],
  },
]

export const seedReviews: PerformanceReview[] = [
  {
    id: 'rev-2024-1',
    cycleId: 'cycle-2024',
    employeeId: 'emp-1',
    managerId: 'mgr-1',
    status: 'completed',
    selfEval: {
      answers: {
        q1: 'Delivered two major site rollouts on schedule.',
        q2: 'Certification delayed due to travel.',
        q3: 'Partnered with safety and finance weekly.',
        q4: 'Interested in project management training.',
      },
      completedAt: '2024-02-15T10:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Strong delivery on rollout milestones.',
        q2: 'Certification should remain a priority.',
        q3: 'Excellent cross-team collaboration.',
        q4: 'Approve PM training request.',
      },
      completedAt: '2024-03-01T14:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2024-03-05T09:00:00Z',
    },
  },
  {
    id: 'rev-2024-2',
    cycleId: 'cycle-2024',
    employeeId: 'emp-2',
    managerId: 'mgr-1',
    status: 'manager_pending',
    selfEval: {
      answers: {
        q1: 'Supported three concurrent projects.',
        q2: 'Automation backlog item slipped one sprint.',
        q3: 'Coordinated with operations and IT.',
        q4: 'Want to grow data analysis skills.',
      },
      completedAt: '2024-02-20T11:00:00Z',
    },
  },
  {
    id: 'rev-2024-3',
    cycleId: 'cycle-2024',
    employeeId: 'emp-3',
    managerId: 'mgr-1',
    status: 'completed',
    selfEval: {
      answers: {
        q1: 'Closed monthly close on time each quarter.',
        q2: 'One reconciliation backlog item carried over.',
        q3: 'Partnered with operations on cost reporting.',
        q4: 'Pursuing CPA study hours.',
      },
      completedAt: '2024-02-11T10:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Reliable accounting support for the operations team.',
        q2: 'Backlog item tracked with clear owners.',
        q3: 'Strong cross-functional communication.',
        q4: 'Encourage CPA progress.',
      },
      completedAt: '2024-02-26T14:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2024-03-02T09:00:00Z',
    },
  },
  {
    id: 'rev-2024-4',
    cycleId: 'cycle-2024',
    employeeId: 'emp-4',
    managerId: 'mgr-1',
    status: 'acknowledgement_pending',
    selfEval: {
      answers: {
        q1: 'Kept inbound and outbound logistics on schedule through peak season.',
        q2: 'Vendor onboarding slipped by one week.',
        q3: 'Partnered with warehouse and finance teams daily.',
        q4: 'Interested in supply-chain certification.',
      },
      completedAt: '2024-02-12T10:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Reliable logistics execution with strong attention to detail.',
        q2: 'Vendor onboarding delay is documented with a recovery plan.',
        q3: 'Collaborates well across teams.',
        q4: 'Support certification goals next cycle.',
      },
      completedAt: '2024-02-28T16:00:00Z',
    },
  },
  {
    id: 'rev-2024-5',
    cycleId: 'cycle-2024',
    employeeId: 'emp-5',
    managerId: 'mgr-1',
    status: 'manager_pending',
    selfEval: {
      answers: {
        q1: 'Maintained crew schedules with fewer last-minute changes.',
        q2: 'Overtime crept up during two holiday weekends.',
        q3: 'Coordinated closely with field supervisors.',
        q4: 'Want to improve workforce planning tools.',
      },
      completedAt: '2024-02-19T09:00:00Z',
    },
  },
  {
    id: 'rev-2024-6',
    cycleId: 'cycle-2024',
    employeeId: 'emp-6',
    managerId: 'mgr-1',
    status: 'completed',
    selfEval: {
      answers: {
        q1: 'Maintained site safety metrics above target.',
        q2: 'Staffing gaps on night shift persisted in Q4.',
        q3: 'Coordinated with safety and HR on training.',
        q4: 'Focused on supervisor certification.',
      },
      completedAt: '2024-02-09T11:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Strong site leadership and safety culture.',
        q2: 'Night shift staffing plan approved for next quarter.',
        q3: 'Effective partner to HR and safety teams.',
        q4: 'Support certification timeline.',
      },
      completedAt: '2024-02-25T15:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2024-03-06T10:00:00Z',
    },
  },
  {
    id: 'rev-2024-7',
    cycleId: 'cycle-2024',
    employeeId: 'emp-7',
    managerId: 'mgr-1',
    status: 'manager_pending',
    selfEval: {
      answers: {
        q1: 'Led monthly safety stand-downs and reduced near-miss reports.',
        q2: 'Two audit findings remain open from Q3.',
        q3: 'Worked with operations and HR on compliance training.',
        q4: 'Focused on advanced safety leadership coursework.',
      },
      completedAt: '2024-02-21T11:30:00Z',
    },
  },
  {
    id: 'rev-2024-8',
    cycleId: 'cycle-2024',
    employeeId: 'emp-16',
    managerId: 'mgr-1',
    status: 'completed',
    selfEval: {
      answers: {
        q1: 'Exceeded quota on two enterprise accounts.',
        q2: 'Pipeline hygiene needs improvement in CRM.',
        q3: 'Partnered with marketing on regional campaigns.',
        q4: 'Building executive presentation skills.',
      },
      completedAt: '2024-02-10T14:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Strong sales outcomes with consistent client follow-up.',
        q2: 'CRM discipline should be a Q2 focus.',
        q3: 'Effective collaborator with marketing.',
        q4: 'Encourage continued presentation coaching.',
      },
      completedAt: '2024-02-27T13:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2024-03-04T10:00:00Z',
    },
  },
  {
    id: 'rev-2024-9',
    cycleId: 'cycle-2024',
    employeeId: 'emp-17',
    managerId: 'mgr-1',
    status: 'completed',
    selfEval: {
      answers: {
        q1: 'Supported four concurrent RFP responses on time.',
        q2: 'Handoff delays occurred on one enterprise deal.',
        q3: 'Aligned sales ops with account executives weekly.',
        q4: 'Interested in sales operations analytics.',
      },
      completedAt: '2024-02-22T08:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Dependable sales ops partner during a heavy RFP season.',
        q2: 'Handoff issue resolved with new checklist.',
        q3: 'Strong alignment with account executives.',
        q4: 'Analytics training approved.',
      },
      completedAt: '2024-03-01T12:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2024-03-07T09:30:00Z',
    },
  },
  {
    id: 'rev-2024-10',
    cycleId: 'cycle-2024',
    employeeId: 'emp-18',
    managerId: 'mgr-1',
    status: 'acknowledgement_pending',
    selfEval: {
      answers: {
        q1: 'Grew regional revenue 8% year over year.',
        q2: 'Two key accounts renewed late in the quarter.',
        q3: 'Coached two account executives through complex deals.',
        q4: 'Prioritizing strategic account planning.',
      },
      completedAt: '2024-02-14T12:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Solid regional leadership with measurable growth.',
        q2: 'Renewal timing created unnecessary end-of-quarter pressure.',
        q3: 'Strong coach to the sales team.',
        q4: 'Continue strategic planning focus.',
      },
      completedAt: '2024-03-03T15:00:00Z',
    },
  },
  ...finalApprovalPendingReviews,
  ...cycle2025Reviews,
  {
    id: 'rev-4',
    cycleId: 'cycle-90-days',
    employeeId: 'emp-1',
    managerId: 'mgr-1',
    status: 'completed',
    managerReview: {
      answers: {
        g1: 'Met rollout milestone ahead of schedule.',
        g2: 'On track; needs one more vendor sign-off.',
        g3: 'Completed safety audit remediation.',
        g4: 'Deferred — capacity redirected to rollout.',
        g5: 'Not applicable this quarter.',
      },
      completedAt: '2025-09-15T11:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2025-09-16T09:00:00Z',
    },
  },
  {
    id: 'rev-5',
    cycleId: 'cycle-90-days',
    employeeId: 'emp-2',
    managerId: 'mgr-1',
    status: 'manager_pending',
  },
  {
    id: 'rev-mgr1-2025-self',
    cycleId: 'cycle-2025',
    employeeId: 'mgr-1',
    managerId: 'sup-1',
    reviewerType: 'supervisor',
    status: 'self_eval_pending',
  },
  {
    id: 'rev-mgr1-2024-ack',
    cycleId: 'cycle-2024',
    employeeId: 'mgr-1',
    managerId: 'sup-1',
    reviewerType: 'supervisor',
    status: 'acknowledgement_pending',
    selfEval: {
      answers: {
        q1: 'Led operations through two major site expansions and improved on-time delivery by 12%.',
        q2: 'Delayed rollout of the new scheduling tool due to vendor timeline shifts.',
        q3: 'Partnered weekly with finance, HR, and field supervisors on staffing plans.',
        q4: 'Want to strengthen executive communication and strategic planning skills.',
      },
      completedAt: '2024-02-18T09:30:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Strong leadership on expansion projects with measurable operational gains.',
        q2: 'Scheduling tool delay was communicated early; recovery plan is in place.',
        q3: 'Highly effective cross-functional collaboration.',
        q4: 'Support leadership development goals for the next cycle.',
      },
      completedAt: '2024-03-02T15:00:00Z',
    },
  },
  {
    id: 'rev-mgr1-2023-done',
    cycleId: 'cycle-2023',
    employeeId: 'mgr-1',
    managerId: 'sup-1',
    reviewerType: 'supervisor',
    status: 'completed',
    selfEval: {
      answers: {
        q1: 'Stabilized crew scheduling after the regional reorganization.',
        q2: 'Missed Q3 training completion target for two direct reports.',
        q3: 'Worked closely with safety and logistics on compliance initiatives.',
        q4: 'Focused on coaching skills and workforce planning.',
      },
      completedAt: '2023-11-05T10:00:00Z',
    },
    managerReview: {
      answers: {
        q1: 'Delivered steady operational performance through a difficult transition.',
        q2: 'Training gaps are being addressed with a revised plan.',
        q3: 'Reliable partner to peer managers and corporate stakeholders.',
        q4: 'Continue building the leadership bench on the operations team.',
      },
      completedAt: '2023-12-03T14:00:00Z',
    },
    acknowledgement: {
      acknowledged: true,
      completedAt: '2023-12-08T11:00:00Z',
    },
  },
]

export function createEmptyQuestion(order: number): Question {
  return {
    id: `q-${crypto.randomUUID().slice(0, 8)}`,
    label: '',
    required: false,
    weight: 0,
    order,
    type: 'textarea',
    enableWeight: false,
    enableRatingScale: false,
  }
}

export function createEmptyTemplate(): ReviewTemplate {
  return {
    id: `tpl-${crypto.randomUUID().slice(0, 8)}`,
    name: '',
    description: '',
    questions: [createEmptyQuestion(1), createEmptyQuestion(2)],
  }
}
