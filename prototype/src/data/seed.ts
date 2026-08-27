import type {
  Person,
  PerformanceReview,
  Question,
  ReviewCycle,
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

const defaultRatingScale: RatingScaleConfig = {
  min: 1,
  max: 5,
  labels: ['Unsatisfactory', 'Needs improvement', 'Meets expectations', 'Exceeds', 'Outstanding'],
}

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
  },
  {
    id: 'tpl-new-hire',
    name: 'New Hire Check-In',
    description: 'Early onboarding conversation to support new employees in their first weeks.',
    questions: newHireCheckInQuestions,
    isPrebuilt: true,
  },
  {
    id: 'tpl-90-days',
    name: '90 Days at Work',
    description: 'Structured check-in at the 90-day mark to review progress, goals, and support needs.',
    questions: ninetyDayQuestions,
    isPrebuilt: true,
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

function generateAdditionalEmployees(): Omit<Person, 'union'>[] {
  return Array.from({ length: 30 }, (_, index) => {
    const id = index + 21
    const profile = BULK_EMPLOYEE_PROFILES[index % BULK_EMPLOYEE_PROFILES.length]
    return {
      id: `emp-${id}`,
      name: `${BULK_FIRST_NAMES[index]} ${BULK_LAST_NAMES[index]}`,
      role: 'employee',
      ...profile,
    }
  })
}

const ADDITIONAL_EMPLOYEES = generateAdditionalEmployees()

const CYCLE_2025_EMPLOYEE_IDS = Array.from({ length: 50 }, (_, index) => `emp-${index + 1}`)

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
    const status = statusPlan[index]
    const review: PerformanceReview = {
      id: `rev-2025-${String(index + 1).padStart(2, '0')}`,
      cycleId: 'cycle-2025',
      employeeId,
      managerId: person?.managerId ?? 'mgr-1',
      status,
    }

    if (status === 'manager_pending' || status === 'acknowledgement_pending' || status === 'completed') {
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

const cycle2025Reviews = create2025AnnualReviews(seedPeople)

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
    employeeIds: ['emp-1', 'emp-2', 'emp-3'],
  },
  {
    id: 'cycle-2025',
    name: '2025 Annual Review',
    description: 'Year-end performance reviews with self-evaluation and manager feedback.',
    createdBy: 'Hannah Reed',
    templateId: 'tpl-annual',
    startDate: '2025-10-01',
    dueDate: '2025-12-15',
    includesSelfEvaluation: true,
    workflow: workflowWithDeadlines(createDefaultWorkflowSteps(), {
      employee: '2025-10-31',
      manager: '2025-11-30',
      acknowledgement: '2025-12-10',
    }),
    ratingScale: defaultRatingScale,
    status: 'active',
    employeeIds: CYCLE_2025_EMPLOYEE_IDS,
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
    employeeIds: ['emp-4', 'emp-5', 'emp-6'],
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
    status: 'self_eval_pending',
  },
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
