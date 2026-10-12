import { useRef } from 'react'
import {
  ModusWcButton,
  ModusWcChip,
  ModusWcFileDropzone,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { SupportingDocumentAttachment } from '../types'
import {
  filesToSupportingAttachments,
  formatSupportingDocumentSize,
  mergeSupportingAttachments,
  SUPPORTING_DOCUMENT_ACCEPT,
  SUPPORTING_DOCUMENT_MAX_COUNT,
  SUPPORTING_DOCUMENT_MAX_TOTAL_BYTES,
  totalSupportingDocumentBytes,
} from '../utils/supportingDocuments'

type SupportingDocumentsSectionProps = {
  documents: SupportingDocumentAttachment[]
  onDocumentsChange: (documents: SupportingDocumentAttachment[]) => void
  disabled?: boolean
}

type FileDropzoneHost = HTMLElement & { reset: () => Promise<void> }

export function SupportingDocumentsSection({
  documents,
  onDocumentsChange,
  disabled = false,
}: SupportingDocumentsSectionProps) {
  const dropzoneRef = useRef<FileDropzoneHost | null>(null)

  const remainingSlots = Math.max(0, SUPPORTING_DOCUMENT_MAX_COUNT - documents.length)
  const totalBytes = totalSupportingDocumentBytes(documents)

  const handleFileSelect = async (e: CustomEvent<FileList>) => {
    if (disabled || remainingSlots === 0) return
    const incoming = filesToSupportingAttachments(e.detail).slice(0, remainingSlots)
    if (incoming.length === 0) return

    const nextTotal = totalBytes + incoming.reduce((sum, doc) => sum + doc.sizeBytes, 0)
    if (nextTotal > SUPPORTING_DOCUMENT_MAX_TOTAL_BYTES) {
      await dropzoneRef.current?.reset()
      return
    }

    onDocumentsChange(mergeSupportingAttachments(documents, incoming))
    await dropzoneRef.current?.reset()
  }

  const removeDocument = (id: string) => {
    onDocumentsChange(documents.filter((doc) => doc.id !== id))
  }

  return (
    <section className="flex flex-col gap-3" aria-labelledby="supporting-documents-heading">
      <div className="flex flex-col gap-1">
        <ModusWcTypography
          id="supporting-documents-heading"
          hierarchy="p"
          size="sm"
          weight="semibold"
          label="Supporting documents"
        />
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label="Optional — attach project summaries, certifications, feedback emails, or other evidence (PDF, Word, Excel, or images)."
        />
      </div>

      {documents.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {documents.map((doc) => (
            <li key={doc.id} className="flex min-w-0 items-center justify-between gap-2">
              <ModusWcChip
                label={`${doc.fileName} (${formatSupportingDocumentSize(doc.sizeBytes)})`}
                size="sm"
                variant="outline"
                showRemove={!disabled}
                onChipRemove={() => removeDocument(doc.id)}
                aria-label={`${doc.fileName}, remove attachment`}
              />
            </li>
          ))}
        </ul>
      ) : null}

      {!disabled && remainingSlots > 0 ? (
        <ModusWcFileDropzone
          ref={dropzoneRef}
          acceptFileTypes={SUPPORTING_DOCUMENT_ACCEPT}
          multiple
          maxFileCount={remainingSlots}
          maxTotalFileSizeBytes={SUPPORTING_DOCUMENT_MAX_TOTAL_BYTES - totalBytes}
          instructions="Drag files here or browse to upload supporting documents"
          fileDraggedOverInstructions="Drop files to attach"
          invalidFileTypeMessage="Use PDF, Word, Excel, or image files (.pdf, .doc, .docx, .xls, .xlsx, .png, .jpg)."
          disabled={disabled}
          onFileSelect={handleFileSelect}
        />
      ) : null}

      {!disabled && remainingSlots === 0 ? (
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={`Maximum of ${SUPPORTING_DOCUMENT_MAX_COUNT} files reached. Remove a file to add another.`}
        />
      ) : null}

      {documents.length > 0 && !disabled ? (
        <ModusWcButton
          variant="borderless"
          color="tertiary"
          size="sm"
          customClass="self-start"
          onButtonClick={() => onDocumentsChange([])}
        >
          Clear all attachments
        </ModusWcButton>
      ) : null}
    </section>
  )
}
