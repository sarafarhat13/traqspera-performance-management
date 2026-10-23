import type { ReviewCycle, ReviewTemplate, TemplateLifecycleStatus } from '../types'
import type { StatusBadgeSemanticColor } from './status'

export type TemplateDisplayStatus = 'archived' | 'draft' | 'published'

export const TEMPLATE_DISPLAY_STATUS_LABELS: Record<TemplateDisplayStatus, string> = {
  archived: 'Archived',
  draft: 'Draft',
  published: 'Published',
}

export function templateDisplayStatusBadgeColor(
  status: TemplateDisplayStatus,
): StatusBadgeSemanticColor {
  switch (status) {
    case 'published':
      return 'primary'
    case 'archived':
      return 'tertiary'
    case 'draft':
    default:
      return 'secondary'
  }
}

export function getTemplateDisplayStatus(template: ReviewTemplate): TemplateDisplayStatus {
  if (template.isArchived) return 'archived'
  if (template.lifecycleStatus === 'published') return 'published'
  return 'draft'
}

/** Draft templates may be edited; published and archived templates are read-only. */
export function isTemplateEditable(template: ReviewTemplate): boolean {
  if (template.isArchived) return false
  if (template.lifecycleStatus === 'published') return false
  return true
}

export function isTemplateVisibleInCycleWizard(template: ReviewTemplate): boolean {
  return template.name.trim().length > 0 && !template.isArchived
}

const ARCHIVE_SUFFIX_RE = / Archive \d{4}-\d{2}-\d{2}$/

export function buildArchivedName(name: string, updatedAt: string): string {
  const trimmed = name.trim()
  if (ARCHIVE_SUFFIX_RE.test(trimmed)) return trimmed
  return `${trimmed} Archive ${updatedAt}`
}

export function buildDuplicateName(name: string): string {
  return `Copy of ${name.trim()}`
}

export function syncPublishedTemplatesFromCycles(
  templates: ReviewTemplate[],
  cycles: ReviewCycle[],
): ReviewTemplate[] {
  const publishedIds = new Set(
    cycles.filter((c) => c.status === 'active').map((c) => c.templateId),
  )
  return templates.map((t) => {
    const lifecycleStatus: TemplateLifecycleStatus =
      publishedIds.has(t.id) ? 'published' : (t.lifecycleStatus ?? 'draft')
    return { ...t, lifecycleStatus }
  })
}

export function normalizeTemplateLifecycle(
  template: ReviewTemplate,
  today = new Date().toISOString().slice(0, 10),
): ReviewTemplate {
  return {
    ...template,
    lifecycleStatus: template.lifecycleStatus ?? 'draft',
    isArchived: template.isArchived ?? false,
    updatedAt: template.updatedAt ?? template.createdAt ?? today,
  }
}
