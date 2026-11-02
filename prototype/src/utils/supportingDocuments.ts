import type { ReviewCycle, SupportingDocumentAttachment } from '../types'
import { cycleIncludesManagerEvaluation, cycleIncludesSelfEvaluation } from './workflow'

/** Supporting documents are part of every review template; only the workflow step must be enabled. */
export function selfEvalAllowsSupportingDocuments(cycle?: ReviewCycle): boolean {
  return Boolean(cycle && cycleIncludesSelfEvaluation(cycle))
}

export function managerReviewAllowsSupportingDocuments(cycle?: ReviewCycle): boolean {
  return Boolean(cycle && cycleIncludesManagerEvaluation(cycle))
}

export const SUPPORTING_DOCUMENT_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'
export const SUPPORTING_DOCUMENT_MAX_COUNT = 10
export const SUPPORTING_DOCUMENT_MAX_TOTAL_BYTES = 25 * 1024 * 1024

export function formatSupportingDocumentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function filesToSupportingAttachments(files: FileList | File[]): SupportingDocumentAttachment[] {
  return Array.from(files).map((file) => ({
    id: `doc-${crypto.randomUUID().slice(0, 8)}`,
    fileName: file.name,
    sizeBytes: file.size,
    mimeType: file.type || undefined,
    uploadedAt: new Date().toISOString(),
  }))
}

export function mergeSupportingAttachments(
  existing: SupportingDocumentAttachment[],
  incoming: SupportingDocumentAttachment[],
  maxCount: number = SUPPORTING_DOCUMENT_MAX_COUNT,
): SupportingDocumentAttachment[] {
  const combined = [...existing, ...incoming]
  return combined.slice(0, maxCount)
}

export function totalSupportingDocumentBytes(docs: SupportingDocumentAttachment[]): number {
  return docs.reduce((sum, doc) => sum + doc.sizeBytes, 0)
}
