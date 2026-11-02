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

function isPdfAttachment(doc: SupportingDocumentAttachment): boolean {
  return doc.mimeType === 'application/pdf' || doc.fileName.toLowerCase().endsWith('.pdf')
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}

/** One-page PDF so the downloaded placeholder opens in a viewer. */
function buildPlaceholderPdf(lines: string[]): string {
  const text = lines
    .map((line, index) => `BT /F1 12 Tf 72 ${720 - index * 18} Td (${escapePdfText(line)}) Tj ET`)
    .join('\n')
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>',
    `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`
  })
  const xrefStart = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`
  return pdf
}

/**
 * Attachments only keep file metadata, so download a placeholder with the same name.
 * Non-PDF files get a `.txt` suffix so the placeholder still opens.
 */
export function downloadSupportingDocument(doc: SupportingDocumentAttachment, ownerName?: string) {
  const lines = [
    `Supporting document: ${doc.fileName}`,
    ...(ownerName ? [`Uploaded by: ${ownerName}`] : []),
    `Uploaded: ${new Date(doc.uploadedAt).toLocaleDateString()}`,
    `Original size: ${formatSupportingDocumentSize(doc.sizeBytes)}`,
    'Prototype placeholder - the original file is not stored in this demo.',
  ]
  const pdf = isPdfAttachment(doc)
  const blob = pdf
    ? new Blob([buildPlaceholderPdf(lines)], { type: 'application/pdf' })
    : new Blob([lines.join('\n')], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = pdf ? doc.fileName : `${doc.fileName}.txt`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
