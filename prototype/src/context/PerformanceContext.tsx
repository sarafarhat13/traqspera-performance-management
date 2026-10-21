import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createEmptyTemplate,
  DEMO_LISA_FINAL_APPROVAL_CYCLE_ID,
  DEPRECATED_TEMPLATE_IDS,
  isMyPerformanceWalkthroughEmployee,
  myPerformanceWalkthroughReviews,
  seedCycles,
  seedPeople,
  seedReviewGroups,
  seedReviews,
  enrichReviewsWithOverallRatings,
  seedTemplates,
  UNASSIGNED_DEMO_EMPLOYEE_IDS,
} from '../data/seed'
import type {
  AppState,
  EmployeeDetailsTab,
  EmployeeReviewerAssignment,
  PerformanceReview,
  Person,
  ReviewCycle,
  ReviewCycleCompletionAttestation,
  ReviewAcceptanceSubmission,
  ReviewEmployeeGroup,
  ReviewTemplate,
  ReviewStatus,
  SupportingDocumentAttachment,
  ViewId,
} from '../types'
import {
  cycleIncludesAcknowledgement,
  initialStatusFromWorkflow,
  includesSelfEvaluationFromWorkflow,
  statusAfterEmployeePhaseComplete,
  statusAfterManagerPhaseComplete,
  workflowFromLegacy,
} from '../utils/workflow'
import { buildReviewAcknowledgement, legacyAutoAcknowledgement } from '../utils/acknowledgement'
import {
  canReturnReviewToEmployee,
  statusForEmployeeRework,
} from '../utils/reviewPushBack'
import { resolveManagerDashboardPersonId } from '../utils/managerDashboardContext'
import {
  type PersistedPerformancePayload,
  savePerformanceState,
} from '../api/performanceApi'
import {
  buildArchivedName,
  buildDuplicateName,
  normalizeTemplateLifecycle,
  PUBLISHED_TEMPLATE_SAVE_NOTICE,
  syncPublishedTemplatesFromCycles,
} from '../utils/templateLifecycle'

const STORAGE_KEY = 'traqspera-performance-management-v3'
/** Bump when bundled seed cycles/reviews change so stale localStorage is refreshed. */
const SEED_VERSION = 28

const UNASSIGNED_DEMO_ID_SET = new Set<string>(UNASSIGNED_DEMO_EMPLOYEE_IDS)

/** Traqspera “My Info → My Performance” always opens Hannah Reed’s walkthrough reviews. */
const TRAQSPERA_MY_PERFORMANCE_PERSON_ID = 'hr-1'

const DEFAULT_ACTIVE_PERSON_ID = 'mgr-1'

function templateActorName(s: AppState): string {
  const activePerson = s.people.find((p) => p.id === s.activePersonId)
  return activePerson?.name ?? 'HR Admin'
}

const SEED_CYCLE_IDS = new Set(seedCycles.map((cycle) => cycle.id))

type PersistedState = Pick<
  AppState,
  'templates' | 'reviewGroups' | 'cycles' | 'reviews' | 'activePersonId'
> & {
  seedVersion?: number
}

function normalizeTemplate(template: ReviewTemplate): ReviewTemplate {
  return normalizeTemplateLifecycle({
    ...template,
    questions: template.questions.map((q, i) => ({
      ...q,
      weight: q.weight ?? 100,
      order: q.order ?? i + 1,
    })),
  })
}

function normalizeCycle(cycle: ReviewCycle): ReviewCycle {
  const deprecatedTemplateIds = new Set<string>(DEPRECATED_TEMPLATE_IDS)
  const templateId = deprecatedTemplateIds.has(cycle.templateId) ? 'tpl-90-days' : cycle.templateId
  let normalized: ReviewCycle =
    templateId !== cycle.templateId ? { ...cycle, templateId } : cycle

  if (!normalized.startDate) {
    const due = new Date(normalized.dueDate)
    const start = new Date(due)
    if (!Number.isNaN(start.getTime())) {
      start.setDate(start.getDate() - 30)
    }
    normalized = {
      ...normalized,
      startDate: Number.isNaN(start.getTime())
        ? normalized.dueDate
        : start.toISOString().slice(0, 10),
    }
  }

  const seed = seedCycles.find((c) => c.id === normalized.id)
  const allowSupportingDocuments =
    normalized.allowSupportingDocuments ?? seed?.allowSupportingDocuments

  return {
    ...normalized,
    ...(allowSupportingDocuments !== undefined ? { allowSupportingDocuments } : {}),
  }
}

function resolveTemplates(
  persisted?: ReviewTemplate[],
  cycles?: ReviewCycle[],
): ReviewTemplate[] {
  const deprecatedIds = new Set<string>(DEPRECATED_TEMPLATE_IDS)
  const seedIds = new Set(seedTemplates.map((t) => t.id))
  const stored = (persisted ?? []).filter(
    (t) => t.name?.trim().length > 0 && !deprecatedIds.has(t.id),
  )
  const custom = stored.filter((t) => !seedIds.has(t.id))
  const merged = [...seedTemplates, ...custom].map(normalizeTemplate)
  return cycles ? syncPublishedTemplatesFromCycles(merged, cycles) : merged
}

/** Keeps the Review Groups unassigned panel populated for the demo roster. */
function pinUnassignedDemoReviewGroups(groups: ReviewEmployeeGroup[]): ReviewEmployeeGroup[] {
  return groups.map((group) => ({
    ...group,
    memberIds: group.memberIds.filter((id) => !UNASSIGNED_DEMO_ID_SET.has(id)),
  }))
}

function pinUnassignedDemoCycles(cycles: ReviewCycle[]): ReviewCycle[] {
  return cycles.map((cycle) => {
    if (cycle.status !== 'active' && cycle.status !== 'draft') return cycle
    return {
      ...cycle,
      employeeIds: cycle.employeeIds.filter((id) => !UNASSIGNED_DEMO_ID_SET.has(id)),
    }
  })
}

function resolveReviewGroups(persisted: Partial<PersistedState>): ReviewEmployeeGroup[] {
  const seedIds = new Set(seedReviewGroups.map((g) => g.id))
  let groups: ReviewEmployeeGroup[]
  if (shouldRefreshSeedData(persisted)) {
    const custom = (persisted.reviewGroups ?? []).filter((g) => !seedIds.has(g.id))
    groups = [...seedReviewGroups, ...custom]
  } else {
    const stored = persisted.reviewGroups ?? []
    groups = stored.length > 0 ? stored : seedReviewGroups
  }
  return pinUnassignedDemoReviewGroups(groups)
}

function shouldRefreshSeedData(persisted: Partial<PersistedState>): boolean {
  return (persisted.seedVersion ?? 0) < SEED_VERSION
}

function mergeMissingSeedCycles(stored: ReviewCycle[]): ReviewCycle[] {
  const storedIds = new Set(stored.map((cycle) => cycle.id))
  const missing = seedCycles.filter((cycle) => !storedIds.has(cycle.id))
  return missing.length > 0 ? [...stored, ...missing] : stored
}

/** Keeps the Lisa final-approval walkthrough cycle active until HR completes it in-session. */
function pinLisaFinalApprovalDemoCycle(stored: ReviewCycle[]): ReviewCycle[] {
  const seedDemo = seedCycles.find((cycle) => cycle.id === DEMO_LISA_FINAL_APPROVAL_CYCLE_ID)
  if (!seedDemo) return stored
  const hasDemo = stored.some((cycle) => cycle.id === DEMO_LISA_FINAL_APPROVAL_CYCLE_ID)
  const merged = hasDemo ? stored : [...stored, seedDemo]
  return merged.map((cycle) =>
    cycle.id === DEMO_LISA_FINAL_APPROVAL_CYCLE_ID ? { ...seedDemo } : cycle,
  )
}

function resolveCycles(persisted: Partial<PersistedState>): ReviewCycle[] {
  let cycles: ReviewCycle[]
  if (shouldRefreshSeedData(persisted)) {
    const customCycles = (persisted.cycles ?? []).filter((cycle) => !SEED_CYCLE_IDS.has(cycle.id))
    cycles = pinLisaFinalApprovalDemoCycle([...seedCycles, ...customCycles]).map(normalizeCycle)
  } else {
    const stored = persisted.cycles ?? []
    cycles =
      stored.length === 0
        ? seedCycles.map(normalizeCycle)
        : pinLisaFinalApprovalDemoCycle(mergeMissingSeedCycles(stored)).map(normalizeCycle)
  }
  return pinUnassignedDemoCycles(pinWalkthroughSupportingDocuments(cycles))
}

/** Demo annual cycles always allow uploads unless HR explicitly disabled on a custom cycle. */
function pinWalkthroughSupportingDocuments(cycles: ReviewCycle[]): ReviewCycle[] {
  const demoCycleIds = new Set(['cycle-2024', 'cycle-2025'])
  return cycles.map((cycle) =>
    demoCycleIds.has(cycle.id) ? { ...cycle, allowSupportingDocuments: true } : cycle,
  )
}

function mergeMissingSeedReviews(stored: PerformanceReview[]): PerformanceReview[] {
  const storedIds = new Set(stored.map((review) => review.id))
  const missing = seedReviews.filter((review) => !storedIds.has(review.id))
  return missing.length > 0 ? [...stored, ...missing] : stored
}

function pinMyPerformanceWalkthroughReviews(stored: PerformanceReview[]): PerformanceReview[] {
  if (myPerformanceWalkthroughReviews.length === 0) return stored
  const withoutWalkthroughEmployees = stored.filter(
    (review) => !isMyPerformanceWalkthroughEmployee(review.employeeId),
  )
  return [...withoutWalkthroughEmployees, ...myPerformanceWalkthroughReviews]
}

function pinLisaFinalApprovalDemoReviews(stored: PerformanceReview[]): PerformanceReview[] {
  const demoReviews = seedReviews.filter(
    (review) => review.cycleId === DEMO_LISA_FINAL_APPROVAL_CYCLE_ID,
  )
  if (demoReviews.length === 0) return stored
  const withoutDemo = stored.filter(
    (review) => review.cycleId !== DEMO_LISA_FINAL_APPROVAL_CYCLE_ID,
  )
  return [...withoutDemo, ...demoReviews]
}

function resolveReviews(persisted: Partial<PersistedState>): PerformanceReview[] {
  if (shouldRefreshSeedData(persisted)) {
    const customReviews = (persisted.reviews ?? []).filter(
      (review) => !SEED_CYCLE_IDS.has(review.cycleId),
    )
    return pinMyPerformanceWalkthroughReviews(
      pinLisaFinalApprovalDemoReviews([...seedReviews, ...customReviews]),
    )
  }
  const stored = persisted.reviews ?? seedReviews
  if (stored.length === 0) {
    return pinMyPerformanceWalkthroughReviews(pinLisaFinalApprovalDemoReviews(seedReviews))
  }
  return pinMyPerformanceWalkthroughReviews(pinLisaFinalApprovalDemoReviews(mergeMissingSeedReviews(stored)))
}

function hydrateDraftCycleReviews(
  cycles: ReviewCycle[],
  reviews: PerformanceReview[],
  people: Person[],
): PerformanceReview[] {
  return cycles.reduce(
    (next, cycle) =>
      cycle.status === 'draft'
        ? reviewsForCycleLaunch(cycle, next, people, cycle.reviewerAssignments)
        : next,
    reviews,
  )
}

function loadPersisted(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as PersistedState
  } catch {
    return {}
  }
}

function initialStatusForCycle(cycle: ReviewCycle): ReviewStatus {
  if (cycle.workflow) {
    return initialStatusFromWorkflow(cycle.workflow, cycle.workflowKickoffMode ?? 'sequential')
  }
  return cycle.includesSelfEvaluation ? 'self_eval_pending' : 'manager_pending'
}

function resolveReviewerManagerId(
  person: Person | undefined,
  assignment: EmployeeReviewerAssignment,
): string {
  if (!person) return 'mgr-1'
  switch (assignment.type) {
    case 'supervisor':
      return person.supervisorId ?? person.managerId ?? 'mgr-1'
    case 'custom':
      return assignment.customManagerId ?? person.managerId ?? 'mgr-1'
    default:
      return person.managerId ?? 'mgr-1'
  }
}

function reviewsForCycleLaunch(
  cycle: ReviewCycle,
  existing: PerformanceReview[],
  people: AppState['people'],
  reviewerAssignments?: Record<string, EmployeeReviewerAssignment>,
): PerformanceReview[] {
  const newReviews: PerformanceReview[] = []
  for (const employeeId of cycle.employeeIds) {
    const person = people.find((p) => p.id === employeeId)
    const assignment = reviewerAssignments?.[employeeId] ?? { type: 'crew_manager' }
    const managerId = resolveReviewerManagerId(person, assignment)
    const duplicate = existing.some(
      (r) => r.cycleId === cycle.id && r.employeeId === employeeId,
    )
    if (duplicate) continue
    newReviews.push({
      id: `rev-${crypto.randomUUID().slice(0, 8)}`,
      cycleId: cycle.id,
      employeeId,
      managerId,
      reviewerType: assignment.type,
      customReviewerName:
        assignment.type === 'custom' && assignment.customManagerId
          ? people.find((p) => p.id === assignment.customManagerId)?.name
          : undefined,
      status: initialStatusForCycle(cycle),
    })
  }
  return [...existing, ...newReviews]
}

interface PerformanceContextValue {
  state: AppState
  setView: (view: ViewId) => void
  setActivePersonId: (personId: string) => void
  openManagerTeamReviews: () => void
  setLayoutMode: (mode: 'desktop' | 'mobile') => void
  selectTemplate: (id: string | null) => void
  selectCycle: (id: string | null) => void
  selectPerson: (id: string | null) => void
  setEmployeeDetailsTab: (tab: EmployeeDetailsTab) => void
  openMyPerformance: () => void
  openEmployeeReview: (reviewId: string) => void
  selectReview: (id: string | null) => void
  startNewTemplate: () => void
  saveTemplate: (template: ReviewTemplate, options?: { silent?: boolean }) => void
  clearTemplateSaveNotice: () => void
  deleteTemplate: (id: string) => void
  duplicateTemplate: (id: string) => void
  archiveTemplate: (id: string) => void
  unarchiveTemplate: (id: string) => void
  saveReviewGroup: (group: ReviewEmployeeGroup) => void
  deleteReviewGroup: (id: string) => void
  addEmployeesToReviewGroup: (groupId: string, employeeIds: string[]) => void
  addEmployeesToCycle: (cycleId: string, employeeIds: string[]) => void
  launchCycle: (
    cycle: Omit<ReviewCycle, 'id' | 'status'>,
    options?: { reviewerAssignments?: Record<string, EmployeeReviewerAssignment> },
  ) => void
  saveCycleDraft: (
    cycle: Omit<ReviewCycle, 'id' | 'status'>,
    options?: { reviewerAssignments?: Record<string, EmployeeReviewerAssignment> },
  ) => void
  updateCycle: (
    cycleId: string,
    patch: Pick<ReviewCycle, 'name' | 'dueDate'> & { workflow?: ReviewCycle['workflow'] },
  ) => void
  setCycleFinalApprover: (cycleId: string, finalApproverId: string | undefined) => void
  closeReviewCycle: (cycleId: string, attestation: ReviewCycleCompletionAttestation) => boolean
  saveSelfEval: (
    reviewId: string,
    answers: Record<string, string>,
    supportingDocuments?: SupportingDocumentAttachment[],
  ) => void
  saveManagerReview: (
    reviewId: string,
    answers: Record<string, string>,
    supportingDocuments?: SupportingDocumentAttachment[],
    options?: { navigate?: boolean },
  ) => void
  saveManagerReviewDraft: (
    reviewId: string,
    answers: Record<string, string>,
    supportingDocuments?: SupportingDocumentAttachment[],
  ) => void
  submitReviewAcceptance: (reviewId: string, submission: ReviewAcceptanceSubmission) => void
  returnReviewToEmployee: (reviewId: string, note?: string) => boolean
  updateReviewManager: (reviewId: string, managerId: string) => void
  getPerson: (id: string) => AppState['people'][0] | undefined
  getTemplate: (id: string) => ReviewTemplate | undefined
  getReviewGroup: (id: string) => ReviewEmployeeGroup | undefined
  getCycle: (id: string) => ReviewCycle | undefined
  getReview: (id: string) => PerformanceReview | undefined
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null)

export type PerformanceDataSource = 'localStorage' | 'api'

export type PerformanceProviderProps = {
  children: ReactNode
  dataSource?: PerformanceDataSource
  apiBaseUrl?: string
  /** When set (Traqspera island), skips reading localStorage for domain data. */
  bootstrap?: Partial<PersistedState> & { people?: Person[] }
  initialView?: ViewId
  currentUserPersonId?: string
}

export function PerformanceProvider({
  children,
  dataSource = 'localStorage',
  apiBaseUrl,
  bootstrap,
  initialView,
  currentUserPersonId,
}: PerformanceProviderProps) {
  const persisted = bootstrap ?? loadPersisted()
  const initialCycles = resolveCycles(persisted)
  const initialReviews = hydrateDraftCycleReviews(
    initialCycles,
    enrichReviewsWithOverallRatings(resolveReviews(persisted), initialCycles),
    seedPeople,
  )

  const [state, setState] = useState<AppState>(() => ({
    activePersonId:
      currentUserPersonId ?? persisted.activePersonId ?? DEFAULT_ACTIVE_PERSON_ID,
    view: initialView ?? 'hr_dashboard',
    selectedTemplateId: null,
    selectedCycleId: null,
    selectedPersonId: null,
    employeeDetailsTab: 'personal',
    selectedReviewId: null,
    editingTemplateId: null,
    layoutMode: 'desktop',
    templates: resolveTemplates(persisted.templates, initialCycles),
    reviewGroups: resolveReviewGroups(persisted),
    cycles: initialCycles,
    reviews: initialReviews,
    people: bootstrap?.people ?? seedPeople,
    templateSaveNotice: null,
  }))

  useEffect(() => {
    const payload: PersistedPerformancePayload = {
      activePersonId: state.activePersonId,
      templates: state.templates,
      reviewGroups: state.reviewGroups,
      cycles: state.cycles,
      reviews: state.reviews,
      seedVersion: SEED_VERSION,
    }

    if (dataSource === 'api') {
      if (!apiBaseUrl) return
      const timer = window.setTimeout(() => {
        void savePerformanceState(apiBaseUrl, payload).catch((err) => {
          console.error(err)
        })
      }, 400)
      return () => window.clearTimeout(timer)
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [
    apiBaseUrl,
    dataSource,
    state.activePersonId,
    state.templates,
    state.reviewGroups,
    state.cycles,
    state.reviews,
  ])

  const setView = useCallback((view: ViewId) => {
    setState((s) => ({ ...s, view }))
  }, [])

  const setActivePersonId = useCallback((personId: string) => {
    setState((s) => ({ ...s, activePersonId: personId }))
  }, [])

  const openManagerTeamReviews = useCallback(() => {
    setState((s) => ({
      ...s,
      activePersonId: resolveManagerDashboardPersonId(s.people, s.activePersonId),
      view: 'manager_dashboard',
      selectedCycleId: null,
      selectedReviewId: null,
    }))
  }, [])

  const setLayoutMode = useCallback((layoutMode: 'desktop' | 'mobile') => {
    setState((s) => ({ ...s, layoutMode }))
  }, [])

  const selectTemplate = useCallback((id: string | null) => {
    setState((s) => ({
      ...s,
      selectedTemplateId: id,
      editingTemplateId: id,
    }))
  }, [])

  const selectCycle = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedCycleId: id }))
  }, [])

  const selectPerson = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedPersonId: id }))
  }, [])

  const setEmployeeDetailsTab = useCallback((employeeDetailsTab: EmployeeDetailsTab) => {
    setState((s) => ({ ...s, employeeDetailsTab }))
  }, [])

  const openMyPerformance = useCallback(() => {
    setState((s) => ({
      ...s,
      activePersonId: TRAQSPERA_MY_PERFORMANCE_PERSON_ID,
      view: 'employee_details',
      selectedPersonId: TRAQSPERA_MY_PERFORMANCE_PERSON_ID,
      employeeDetailsTab: 'performance',
      selectedReviewId: null,
      selectedCycleId: null,
    }))
  }, [])

  const openEmployeeReview = useCallback((reviewId: string) => {
    setState((s) => {
      const review = s.reviews.find((r) => r.id === reviewId)
      if (!review) return s
      return {
        ...s,
        selectedReviewId: reviewId,
        selectedPersonId: review.employeeId,
        employeeDetailsTab: 'performance',
        view: 'employee_details',
      }
    })
  }, [])

  const selectReview = useCallback((id: string | null) => {
    setState((s) => ({ ...s, selectedReviewId: id }))
  }, [])

  const startNewTemplate = useCallback(() => {
    const template = createEmptyTemplate()
    setState((s) => ({
      ...s,
      templates: [...s.templates, template],
      editingTemplateId: template.id,
      view: 'template_editor',
    }))
  }, [])

  const clearTemplateSaveNotice = useCallback(() => {
    setState((s) => ({ ...s, templateSaveNotice: null }))
  }, [])

  const saveTemplate = useCallback((template: ReviewTemplate, options?: { silent?: boolean }) => {
    setState((s) => {
      const existing = s.templates.find((t) => t.id === template.id)
      if (existing?.isArchived) return s
      const today = new Date().toISOString().slice(0, 10)
      const savingPublished = existing?.lifecycleStatus === 'published'
      const actor = templateActorName(s)
      const withMetadata: ReviewTemplate = {
        ...template,
        lifecycleStatus: existing?.lifecycleStatus ?? template.lifecycleStatus ?? 'draft',
        isArchived: existing?.isArchived ?? template.isArchived ?? false,
        createdBy: existing?.createdBy ?? template.createdBy ?? actor,
        createdAt:
          existing?.createdAt ??
          template.createdAt ??
          today,
        updatedAt: today,
        updatedBy: actor,
      }
      return {
        ...s,
        templates: s.templates.some((t) => t.id === template.id)
          ? s.templates.map((t) => (t.id === template.id ? withMetadata : t))
          : [...s.templates, withMetadata],
        editingTemplateId: options?.silent ? s.editingTemplateId : null,
        view: options?.silent ? s.view : 'templates',
        templateSaveNotice:
          !options?.silent && savingPublished ? PUBLISHED_TEMPLATE_SAVE_NOTICE : s.templateSaveNotice,
      }
    })
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setState((s) => {
      const existing = s.templates.find((t) => t.id === id)
      if (existing?.lifecycleStatus === 'published') return s
      return {
        ...s,
        templates: s.templates.filter((t) => t.id !== id),
        editingTemplateId: s.editingTemplateId === id ? null : s.editingTemplateId,
      }
    })
  }, [])

  const duplicateTemplate = useCallback((id: string) => {
    const today = new Date().toISOString().slice(0, 10)
    setState((s) => {
      const source = s.templates.find((t) => t.id === id)
      if (!source) return s
      const actor = templateActorName(s)
      const copy: ReviewTemplate = {
        ...source,
        id: `tpl-${crypto.randomUUID().slice(0, 8)}`,
        name: buildDuplicateName(source.name),
        lifecycleStatus: 'draft',
        isArchived: false,
        isPrebuilt: false,
        createdAt: today,
        updatedAt: today,
        createdBy: actor,
        updatedBy: actor,
        questions: source.questions.map((q, i) => ({
          ...q,
          id: `q-${crypto.randomUUID().slice(0, 8)}`,
          order: i + 1,
        })),
      }
      return {
        ...s,
        templates: [...s.templates, copy],
        editingTemplateId: copy.id,
        view: 'template_editor',
      }
    })
  }, [])

  const archiveTemplate = useCallback((id: string) => {
    const today = new Date().toISOString().slice(0, 10)
    setState((s) => {
      const actor = templateActorName(s)
      return {
      ...s,
      templates: s.templates.map((t) => {
        if (t.id !== id) return t
        return {
          ...t,
          isArchived: true,
          updatedAt: today,
          updatedBy: actor,
          name: buildArchivedName(t.name, today),
        }
      }),
      editingTemplateId: s.editingTemplateId === id ? null : s.editingTemplateId,
    }
    })
  }, [])

  const unarchiveTemplate = useCallback((id: string) => {
    const today = new Date().toISOString().slice(0, 10)
    setState((s) => {
      const actor = templateActorName(s)
      return {
        ...s,
        templates: s.templates.map((t) =>
          t.id === id
            ? { ...t, isArchived: false, updatedAt: today, updatedBy: actor }
            : t,
        ),
      }
    })
  }, [])

  const saveReviewGroup = useCallback((group: ReviewEmployeeGroup) => {
    const today = new Date().toISOString().slice(0, 10)
    setState((s) => {
      const existing = s.reviewGroups.find((g) => g.id === group.id)
      const normalized: ReviewEmployeeGroup = {
        ...group,
        name: group.name.trim(),
        memberIds: [...new Set(group.memberIds)],
        updatedAt: today,
        createdAt: existing?.createdAt ?? group.createdAt ?? today,
        createdBy: existing?.createdBy ?? group.createdBy ?? 'HR Admin',
      }
      const reviewGroups = existing
        ? s.reviewGroups.map((g) => (g.id === group.id ? normalized : g))
        : [...s.reviewGroups, normalized]
      return { ...s, reviewGroups }
    })
  }, [])

  const deleteReviewGroup = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      reviewGroups: s.reviewGroups.filter((g) => g.id !== id),
      cycles: s.cycles.map((cycle) =>
        cycle.attachedGroupIds?.includes(id)
          ? {
              ...cycle,
              attachedGroupIds: cycle.attachedGroupIds.filter((gid) => gid !== id),
            }
          : cycle,
      ),
    }))
  }, [])

  const addEmployeesToReviewGroup = useCallback((groupId: string, employeeIds: string[]) => {
    const unique = [...new Set(employeeIds)].filter(Boolean)
    if (unique.length === 0) return
    const today = new Date().toISOString().slice(0, 10)
    setState((s) => {
      const group = s.reviewGroups.find((g) => g.id === groupId)
      if (!group) return s
      const memberIds = [...new Set([...group.memberIds, ...unique])]
      const normalized: ReviewEmployeeGroup = {
        ...group,
        memberIds,
        updatedAt: today,
      }
      return {
        ...s,
        reviewGroups: s.reviewGroups.map((g) => (g.id === groupId ? normalized : g)),
      }
    })
  }, [])

  const addEmployeesToCycle = useCallback((cycleId: string, employeeIds: string[]) => {
    const unique = [...new Set(employeeIds)].filter(Boolean)
    if (unique.length === 0) return
    setState((s) => {
      const cycle = s.cycles.find((c) => c.id === cycleId)
      if (!cycle) return s
      const toAdd = unique.filter((id) => !cycle.employeeIds.includes(id))
      if (toAdd.length === 0) return s
      const updatedCycle: ReviewCycle = {
        ...cycle,
        employeeIds: [...cycle.employeeIds, ...toAdd],
      }
      const reviews =
        updatedCycle.status === 'active' || updatedCycle.status === 'draft'
          ? reviewsForCycleLaunch(
              updatedCycle,
              s.reviews,
              s.people,
              updatedCycle.reviewerAssignments,
            )
          : s.reviews
      return {
        ...s,
        cycles: s.cycles.map((c) => (c.id === cycleId ? updatedCycle : c)),
        reviews,
      }
    })
  }, [])

  const launchCycle = useCallback(
    (
      cycleInput: Omit<ReviewCycle, 'id' | 'status'>,
      options?: { reviewerAssignments?: Record<string, EmployeeReviewerAssignment> },
    ) => {
      const workflow =
        cycleInput.workflow ??
        workflowFromLegacy(cycleInput.includesSelfEvaluation ?? true)
      const includesSelfEvaluation = includesSelfEvaluationFromWorkflow(workflow)
      const cycle: ReviewCycle = {
        ...cycleInput,
        workflow,
        includesSelfEvaluation,
        id: `cycle-${crypto.randomUUID().slice(0, 8)}`,
        status: 'active',
        reviewerAssignments: undefined,
      }
      const today = new Date().toISOString().slice(0, 10)
      setState((s) => ({
        ...s,
        cycles: [...s.cycles, cycle],
        templates: s.templates.map((t) =>
          t.id === cycle.templateId
            ? {
                ...t,
                lifecycleStatus: 'published',
                updatedAt: today,
                updatedBy: templateActorName(s),
              }
            : t,
        ),
        reviews: reviewsForCycleLaunch(
          cycle,
          s.reviews,
          s.people,
          options?.reviewerAssignments,
        ),
        view: 'hr_dashboard',
      }))
    },
    [],
  )

  const saveCycleDraft = useCallback(
    (
      cycleInput: Omit<ReviewCycle, 'id' | 'status'>,
      options?: { reviewerAssignments?: Record<string, EmployeeReviewerAssignment> },
    ) => {
      const workflow =
        cycleInput.workflow ??
        workflowFromLegacy(cycleInput.includesSelfEvaluation ?? true)
      const includesSelfEvaluation = includesSelfEvaluationFromWorkflow(workflow)
      const cycle: ReviewCycle = {
        ...cycleInput,
        workflow,
        includesSelfEvaluation,
        id: `cycle-${crypto.randomUUID().slice(0, 8)}`,
        status: 'draft',
        reviewerAssignments: options?.reviewerAssignments,
      }
      setState((s) => ({
        ...s,
        cycles: [...s.cycles, cycle],
        reviews: reviewsForCycleLaunch(
          cycle,
          s.reviews,
          s.people,
          options?.reviewerAssignments,
        ),
        view: 'hr_dashboard',
      }))
    },
    [],
  )

  const updateCycle = useCallback(
    (
      cycleId: string,
      patch: Pick<ReviewCycle, 'name' | 'dueDate'> & { workflow?: ReviewCycle['workflow'] },
    ) => {
      setState((s) => ({
        ...s,
        cycles: s.cycles.map((cycle) => {
          if (cycle.id !== cycleId) return cycle
          return {
            ...cycle,
            name: patch.name.trim(),
            dueDate: patch.dueDate,
            ...(patch.workflow !== undefined ? { workflow: patch.workflow } : {}),
          }
        }),
      }))
    },
    [],
  )

  const setCycleFinalApprover = useCallback(
    (cycleId: string, finalApproverId: string | undefined) => {
      setState((s) => ({
        ...s,
        cycles: s.cycles.map((cycle) => {
          if (cycle.id !== cycleId) return cycle
          const nextApprover = finalApproverId || undefined
          const approverChanged = cycle.finalApproverId !== nextApprover
          return {
            ...cycle,
            finalApproverId: nextApprover,
            finalApprovalCompletedAt:
              approverChanged && cycle.status !== 'completed'
                ? undefined
                : cycle.finalApprovalCompletedAt,
          }
        }),
      }))
    },
    [],
  )

  const closeReviewCycle = useCallback(
    (cycleId: string, attestation: ReviewCycleCompletionAttestation): boolean => {
      const signature = attestation.signature.trim()
      const signedDate = attestation.signedDate.trim()
      if (!signature || !signedDate) return false

      let closed = false
      setState((s) => {
        const cycle = s.cycles.find((c) => c.id === cycleId)
        if (!cycle || cycle.status !== 'active') return s
        if (!cycle.finalApproverId) return s
        const cycleReviews = s.reviews.filter((r) => r.cycleId === cycleId)
        if (cycleReviews.length === 0 || !cycleReviews.every((r) => r.status === 'completed')) {
          return s
        }
        closed = true
        const completedAt = `${signedDate}T12:00:00.000Z`
        return {
          ...s,
          cycles: s.cycles.map((c) =>
            c.id === cycleId
              ? {
                  ...c,
                  status: 'completed',
                  finalApprovalCompletedAt: completedAt,
                  finalApprovalSignature: signature,
                  finalApprovalSignedDate: signedDate,
                }
              : c,
          ),
        }
      })
      return closed
    },
    [],
  )

  const saveSelfEval = useCallback(
    (
      reviewId: string,
      answers: Record<string, string>,
      supportingDocuments?: SupportingDocumentAttachment[],
    ) => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) => {
        if (r.id !== reviewId) return r
        const cycle = s.cycles.find((c) => c.id === r.cycleId)
        const nextReview: PerformanceReview = {
          ...r,
          selfEval: {
            answers,
            completedAt: new Date().toISOString(),
            supportingDocuments:
              supportingDocuments && supportingDocuments.length > 0
                ? supportingDocuments
                : undefined,
          },
        }
        let nextStatus: ReviewStatus = cycle
          ? statusAfterEmployeePhaseComplete(cycle, nextReview)
          : 'manager_pending'
        if (
          cycle &&
          nextReview.managerReview?.completedAt &&
          (nextStatus === 'manager_pending' || nextStatus === 'parallel_review_pending')
        ) {
          nextStatus = statusAfterManagerPhaseComplete(cycle, nextReview)
        }
        return { ...nextReview, status: nextStatus, returnedToEmployee: undefined }
      }),
      view: 'employee_details',
      selectedPersonId: s.activePersonId,
      employeeDetailsTab: 'performance',
      selectedReviewId: null,
    }))
  },
  [],
  )

  const saveManagerReviewDraft = useCallback(
    (
      reviewId: string,
      answers: Record<string, string>,
      supportingDocuments?: SupportingDocumentAttachment[],
    ) => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              managerReview: {
                answers,
                savedAt: new Date().toISOString(),
                ...(supportingDocuments !== undefined && {
                  supportingDocuments:
                    supportingDocuments.length > 0 ? supportingDocuments : undefined,
                }),
              },
            }
          : r,
      ),
    }))
  },
  [],
  )

  const saveManagerReview = useCallback(
    (
      reviewId: string,
      answers: Record<string, string>,
      supportingDocuments?: SupportingDocumentAttachment[],
      options?: { navigate?: boolean },
    ) => {
    const completedAt = new Date().toISOString()
    const navigate = options?.navigate !== false
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) => {
        if (r.id !== reviewId) return r
        const cycle = s.cycles.find((c) => c.id === r.cycleId)
        const nextReview: PerformanceReview = {
          ...r,
          managerReview: {
            answers,
            completedAt,
            savedAt: completedAt,
            supportingDocuments:
              supportingDocuments && supportingDocuments.length > 0
                ? supportingDocuments
                : undefined,
          },
        }
        const nextStatus: ReviewStatus = cycle
          ? statusAfterManagerPhaseComplete(cycle, nextReview)
          : 'completed'
        const autoAcknowledge = nextStatus === 'completed'
        return {
          ...nextReview,
          status: nextStatus,
          acknowledgement: autoAcknowledge ? legacyAutoAcknowledgement() : r.acknowledgement,
        }
      }),
      ...(navigate ? { view: 'manager_dashboard' as const } : {}),
    }))
  },
  [],
  )

  const submitReviewAcceptance = useCallback(
    (reviewId: string, submission: ReviewAcceptanceSubmission) => {
      const signature = submission.signature.trim()
      const signedDate = submission.signedDate.trim()
      if (!signature || !signedDate || !submission.decision) return

      setState((s) => ({
        ...s,
        reviews: s.reviews.map((r) =>
          r.id === reviewId
            ? {
                ...r,
                status: 'completed',
                acknowledgement: buildReviewAcknowledgement(submission),
              }
            : r,
        ),
        view: 'employee_details',
        selectedPersonId: s.activePersonId,
        employeeDetailsTab: 'performance',
        selectedReviewId: null,
      }))
    },
    [],
  )

  const returnReviewToEmployee = useCallback((reviewId: string, note?: string) => {
    let applied = false
    setState((s) => {
      const review = s.reviews.find((r) => r.id === reviewId)
      if (!review) return s
      const cycle = s.cycles.find((c) => c.id === review.cycleId)
      const viewer = s.people.find((p) => p.id === s.activePersonId)
      if (!canReturnReviewToEmployee(review, cycle, viewer, s.people)) return s
      const nextStatus = cycle ? statusForEmployeeRework(cycle) : null
      if (!nextStatus) return s

      const trimmedNote = note?.trim()
      applied = true
      return {
        ...s,
        reviews: s.reviews.map((r) => {
          if (r.id !== reviewId) return r
          const selfEval = r.selfEval
            ? { ...r.selfEval, completedAt: undefined }
            : r.selfEval
          return {
            ...r,
            status: nextStatus,
            selfEval,
            acknowledgement: undefined,
            returnedToEmployee: {
              returnedAt: new Date().toISOString(),
              returnedByPersonId: s.activePersonId,
              ...(trimmedNote ? { note: trimmedNote } : {}),
            },
          }
        }),
      }
    })
    return applied
  }, [])

  const updateReviewManager = useCallback((reviewId: string, managerId: string) => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) => (r.id === reviewId ? { ...r, managerId } : r)),
    }))
  }, [])

  const getPerson = useCallback(
    (id: string) => state.people.find((p) => p.id === id),
    [state.people],
  )

  const getTemplate = useCallback(
    (id: string) => state.templates.find((t) => t.id === id),
    [state.templates],
  )

  const getReviewGroup = useCallback(
    (id: string) => state.reviewGroups.find((g) => g.id === id),
    [state.reviewGroups],
  )

  const getCycle = useCallback(
    (id: string) => state.cycles.find((c) => c.id === id),
    [state.cycles],
  )

  const getReview = useCallback(
    (id: string) => state.reviews.find((r) => r.id === id),
    [state.reviews],
  )

  const value = useMemo(
    () => ({
      state,
      setView,
      setActivePersonId,
      openManagerTeamReviews,
      setLayoutMode,
      selectTemplate,
      selectCycle,
      selectPerson,
      setEmployeeDetailsTab,
      openMyPerformance,
      openEmployeeReview,
      selectReview,
      startNewTemplate,
      saveTemplate,
      clearTemplateSaveNotice,
      deleteTemplate,
      duplicateTemplate,
      archiveTemplate,
      unarchiveTemplate,
      saveReviewGroup,
      deleteReviewGroup,
      addEmployeesToReviewGroup,
      addEmployeesToCycle,
      launchCycle,
      saveCycleDraft,
      updateCycle,
      setCycleFinalApprover,
      closeReviewCycle,
      saveSelfEval,
      saveManagerReview,
      saveManagerReviewDraft,
      submitReviewAcceptance,
      returnReviewToEmployee,
      updateReviewManager,
      getPerson,
      getTemplate,
      getReviewGroup,
      getCycle,
      getReview,
    }),
    [
      state,
      setView,
      setActivePersonId,
      openManagerTeamReviews,
      setLayoutMode,
      selectTemplate,
      selectCycle,
      selectPerson,
      setEmployeeDetailsTab,
      openMyPerformance,
      openEmployeeReview,
      selectReview,
      startNewTemplate,
      saveTemplate,
      clearTemplateSaveNotice,
      deleteTemplate,
      duplicateTemplate,
      archiveTemplate,
      unarchiveTemplate,
      saveReviewGroup,
      deleteReviewGroup,
      addEmployeesToReviewGroup,
      addEmployeesToCycle,
      launchCycle,
      saveCycleDraft,
      updateCycle,
      setCycleFinalApprover,
      closeReviewCycle,
      saveSelfEval,
      saveManagerReview,
      saveManagerReviewDraft,
      submitReviewAcceptance,
      returnReviewToEmployee,
      updateReviewManager,
      getPerson,
      getTemplate,
      getReviewGroup,
      getCycle,
      getReview,
    ],
  )

  return (
    <PerformanceContext.Provider value={value}>{children}</PerformanceContext.Provider>
  )
}

export function usePerformance() {
  const ctx = useContext(PerformanceContext)
  if (!ctx) throw new Error('usePerformance must be used within PerformanceProvider')
  return ctx
}
