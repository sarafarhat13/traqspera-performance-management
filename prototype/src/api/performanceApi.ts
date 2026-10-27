import type { Person, ReviewCycle, ReviewEmployeeGroup, ReviewTemplate, PerformanceReview } from '../types'

export type PerformanceBootstrapPayload = {
  seedVersion?: number
  activePersonId: string
  templates: ReviewTemplate[]
  reviewGroups: ReviewEmployeeGroup[]
  cycles: ReviewCycle[]
  reviews: PerformanceReview[]
  people: Person[]
}

export type PersistedPerformancePayload = Pick<
  PerformanceBootstrapPayload,
  'activePersonId' | 'templates' | 'reviewGroups' | 'cycles' | 'reviews' | 'seedVersion'
>

function csrfToken(): string | undefined {
  const meta = document.querySelector('meta[name="csrf-token"]')
  return meta?.getAttribute('content') ?? undefined
}

export async function fetchPerformanceState(apiBaseUrl: string): Promise<PerformanceBootstrapPayload> {
  const res = await fetch(`${apiBaseUrl}/state`, {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
  if (!res.ok) {
    throw new Error(`Failed to load performance state (${res.status})`)
  }
  return (await res.json()) as PerformanceBootstrapPayload
}

export async function savePerformanceState(
  apiBaseUrl: string,
  payload: PersistedPerformancePayload,
): Promise<void> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const token = csrfToken()
  if (token) headers['X-CSRF-TOKEN'] = token

  const res = await fetch(`${apiBaseUrl}/state`, {
    method: 'PUT',
    credentials: 'include',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    throw new Error(`Failed to save performance state (${res.status})`)
  }
}
