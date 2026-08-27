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
  DEPRECATED_TEMPLATE_IDS,
  seedCycles,
  seedPeople,
  seedReviews,
  seedTemplates,
} from '../data/seed'
import type {
  AppState,
  EmployeeDetailsTab,
  EmployeeReviewerAssignment,
  PerformanceReview,
  Person,
  ReviewCycle,
  ReviewTemplate,
  ReviewStatus,
  ViewId,
} from '../types'
import {
  cycleIncludesAcknowledgement,
  initialStatusFromWorkflow,
  includesSelfEvaluationFromWorkflow,
  workflowFromLegacy,
} from '../utils/workflow'

const STORAGE_KEY = 'traqspera-performance-management-v3'
/** Bump when bundled seed cycles/reviews change so stale localStorage is refreshed. */
const SEED_VERSION = 4

const DEFAULT_ACTIVE_PERSON_ID = 'mgr-1'

const SEED_CYCLE_IDS = new Set(seedCycles.map((cycle) => cycle.id))

type PersistedState = Pick<
  AppState,
  'templates' | 'cycles' | 'reviews' | 'activePersonId'
> & {
  seedVersion?: number
}

function normalizeTemplate(template: ReviewTemplate): ReviewTemplate {
  return {
    ...template,
    questions: template.questions.map((q, i) => ({
      ...q,
      weight: q.weight ?? 100,
      order: q.order ?? i + 1,
    })),
  }
}

function normalizeCycle(cycle: ReviewCycle): ReviewCycle {
  const deprecatedTemplateIds = new Set<string>(DEPRECATED_TEMPLATE_IDS)
  const templateId = deprecatedTemplateIds.has(cycle.templateId) ? 'tpl-90-days' : cycle.templateId
  const withTemplate = templateId !== cycle.templateId ? { ...cycle, templateId } : cycle

  if (withTemplate.startDate) return withTemplate
  const due = new Date(withTemplate.dueDate)
  const start = new Date(due)
  if (!Number.isNaN(start.getTime())) {
    start.setDate(start.getDate() - 30)
  }
  return {
    ...withTemplate,
    startDate: Number.isNaN(start.getTime())
      ? withTemplate.dueDate
      : start.toISOString().slice(0, 10),
  }
}

function resolveTemplates(persisted?: ReviewTemplate[]): ReviewTemplate[] {
  const deprecatedIds = new Set<string>(DEPRECATED_TEMPLATE_IDS)
  const seedIds = new Set(seedTemplates.map((t) => t.id))
  const stored = (persisted ?? []).filter(
    (t) => t.name?.trim().length > 0 && !deprecatedIds.has(t.id),
  )
  const custom = stored.filter((t) => !seedIds.has(t.id))
  return [...seedTemplates, ...custom].map(normalizeTemplate)
}

function shouldRefreshSeedData(persisted: Partial<PersistedState>): boolean {
  return (persisted.seedVersion ?? 0) < SEED_VERSION
}

function resolveCycles(persisted: Partial<PersistedState>): ReviewCycle[] {
  if (shouldRefreshSeedData(persisted)) {
    const customCycles = (persisted.cycles ?? []).filter((cycle) => !SEED_CYCLE_IDS.has(cycle.id))
    return [...seedCycles, ...customCycles].map(normalizeCycle)
  }
  return (persisted.cycles ?? seedCycles).map(normalizeCycle)
}

function resolveReviews(persisted: Partial<PersistedState>): PerformanceReview[] {
  if (shouldRefreshSeedData(persisted)) {
    const customReviews = (persisted.reviews ?? []).filter(
      (review) => !SEED_CYCLE_IDS.has(review.cycleId),
    )
    return [...seedReviews, ...customReviews]
  }
  return persisted.reviews ?? seedReviews
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
  if (cycle.workflow) return initialStatusFromWorkflow(cycle.workflow)
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
  deleteTemplate: (id: string) => void
  launchCycle: (
    cycle: Omit<ReviewCycle, 'id' | 'status'>,
    options?: { reviewerAssignments?: Record<string, EmployeeReviewerAssignment> },
  ) => void
  saveCycleDraft: (
    cycle: Omit<ReviewCycle, 'id' | 'status'>,
    options?: { reviewerAssignments?: Record<string, EmployeeReviewerAssignment> },
  ) => void
  updateCycle: (cycleId: string, patch: Pick<ReviewCycle, 'name' | 'dueDate'>) => void
  saveSelfEval: (reviewId: string, answers: Record<string, string>) => void
  saveManagerReview: (reviewId: string, answers: Record<string, string>) => void
  acknowledgeReview: (reviewId: string) => void
  updateReviewManager: (reviewId: string, managerId: string) => void
  getPerson: (id: string) => AppState['people'][0] | undefined
  getTemplate: (id: string) => ReviewTemplate | undefined
  getCycle: (id: string) => ReviewCycle | undefined
  getReview: (id: string) => PerformanceReview | undefined
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null)

export function PerformanceProvider({ children }: { children: ReactNode }) {
  const persisted = loadPersisted()
  const initialCycles = resolveCycles(persisted)
  const initialReviews = resolveReviews(persisted)

  const [state, setState] = useState<AppState>(() => ({
    activePersonId: persisted.activePersonId ?? DEFAULT_ACTIVE_PERSON_ID,
    view: 'hr_dashboard',
    selectedTemplateId: null,
    selectedCycleId: null,
    selectedPersonId: null,
    employeeDetailsTab: 'personal',
    selectedReviewId: null,
    editingTemplateId: null,
    layoutMode: 'desktop',
    templates: resolveTemplates(persisted.templates),
    cycles: initialCycles,
    reviews: initialReviews,
    people: seedPeople,
  }))

  useEffect(() => {
    const payload: PersistedState = {
      activePersonId: state.activePersonId,
      templates: state.templates,
      cycles: state.cycles,
      reviews: state.reviews,
      seedVersion: SEED_VERSION,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  }, [state.activePersonId, state.templates, state.cycles, state.reviews])

  const setView = useCallback((view: ViewId) => {
    setState((s) => ({ ...s, view }))
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
      view: 'employee_details',
      selectedPersonId: s.activePersonId,
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

  const saveTemplate = useCallback((template: ReviewTemplate, options?: { silent?: boolean }) => {
    setState((s) => ({
      ...s,
      templates: s.templates.some((t) => t.id === template.id)
        ? s.templates.map((t) => (t.id === template.id ? template : t))
        : [...s.templates, template],
      editingTemplateId: options?.silent ? s.editingTemplateId : null,
      view: options?.silent ? s.view : 'templates',
    }))
  }, [])

  const deleteTemplate = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      templates: s.templates.filter((t) => t.id !== id),
      editingTemplateId: s.editingTemplateId === id ? null : s.editingTemplateId,
    }))
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
        view: 'hr_dashboard',
      }))
    },
    [],
  )

  const updateCycle = useCallback(
    (cycleId: string, patch: Pick<ReviewCycle, 'name' | 'dueDate'>) => {
      setState((s) => ({
        ...s,
        cycles: s.cycles.map((cycle) =>
          cycle.id === cycleId
            ? { ...cycle, name: patch.name.trim(), dueDate: patch.dueDate }
            : cycle,
        ),
      }))
    },
    [],
  )

  const saveSelfEval = useCallback((reviewId: string, answers: Record<string, string>) => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              selfEval: { answers, completedAt: new Date().toISOString() },
              status: 'manager_pending',
            }
          : r,
      ),
      view: 'employee_details',
      selectedPersonId: s.activePersonId,
      employeeDetailsTab: 'performance',
      selectedReviewId: null,
    }))
  }, [])

  const saveManagerReview = useCallback((reviewId: string, answers: Record<string, string>) => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) => {
        if (r.id !== reviewId) return r
        const cycle = s.cycles.find((c) => c.id === r.cycleId)
        const nextStatus: ReviewStatus =
          cycle && cycleIncludesAcknowledgement(cycle)
            ? 'acknowledgement_pending'
            : 'completed'
        return {
          ...r,
          managerReview: { answers, completedAt: new Date().toISOString() },
          status: nextStatus,
          acknowledgement:
            nextStatus === 'completed'
              ? { acknowledged: true, completedAt: new Date().toISOString() }
              : r.acknowledgement,
        }
      }),
      view: 'manager_dashboard',
    }))
  }, [])

  const acknowledgeReview = useCallback((reviewId: string) => {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              status: 'completed',
              acknowledgement: { acknowledged: true, completedAt: new Date().toISOString() },
            }
          : r,
      ),
      view: 'employee_details',
      selectedPersonId: s.activePersonId,
      employeeDetailsTab: 'performance',
      selectedReviewId: null,
    }))
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
      deleteTemplate,
      launchCycle,
      saveCycleDraft,
      updateCycle,
      saveSelfEval,
      saveManagerReview,
      acknowledgeReview,
      updateReviewManager,
      getPerson,
      getTemplate,
      getCycle,
      getReview,
    }),
    [
      state,
      setView,
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
      deleteTemplate,
      launchCycle,
      saveCycleDraft,
      updateCycle,
      saveSelfEval,
      saveManagerReview,
      acknowledgeReview,
      updateReviewManager,
      getPerson,
      getTemplate,
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
