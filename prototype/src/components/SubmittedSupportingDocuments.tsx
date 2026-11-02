import { useId } from 'react'
import { ModusWcButton, ModusWcIcon, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { SupportingDocumentAttachment } from '../types'
import { formatDate } from '../utils/status'
import {
  downloadSupportingDocument,
  formatSupportingDocumentSize,
} from '../utils/supportingDocuments'

type SubmittedSupportingDocumentsProps = {
  documents: SupportingDocumentAttachment[]
  ownerName: string
  heading?: string
  attachedWith?: string
}

/** Read-only list of files someone else attached, with a download action per file. */
export function SubmittedSupportingDocuments({
  documents,
  ownerName,
  heading = 'Employee supporting documents',
  attachedWith = 'their self-evaluation',
}: SubmittedSupportingDocumentsProps) {
  const headingId = `submitted-supporting-documents-${useId()}`

  return (
    <section
      className="tq-submitted-supporting-documents flex flex-col gap-3"
      aria-labelledby={headingId}
    >
      <div className="flex flex-col gap-1">
        <ModusWcTypography id={headingId} hierarchy="p" size="sm" weight="semibold" label={heading} />
        <ModusWcTypography
          hierarchy="p"
          size="xs"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={
            documents.length > 0
              ? `${ownerName} attached ${documents.length} file${documents.length === 1 ? '' : 's'} with ${attachedWith}.`
              : `${ownerName} did not attach any files.`
          }
        />
      </div>

      {documents.length > 0 ? (
        <ul className="tq-submitted-supporting-documents__list">
          {documents.map((doc) => (
            <li key={doc.id} className="tq-submitted-supporting-documents__item">
              <div className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-[var(--modus-wc-color-base-200)] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <ModusWcIcon name="document" size="sm" decorative />
                  <div className="flex min-w-0 flex-col">
                    <ModusWcTypography
                      hierarchy="p"
                      size="sm"
                      weight="semibold"
                      customClass="!m-0 truncate"
                      label={doc.fileName}
                    />
                    <ModusWcTypography
                      hierarchy="p"
                      size="xs"
                      customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
                      label={`${formatSupportingDocumentSize(doc.sizeBytes)} · Uploaded ${formatDate(doc.uploadedAt)}`}
                    />
                  </div>
                </div>
                <ModusWcButton
                  variant="outlined"
                  color="tertiary"
                  size="sm"
                  customClass="shrink-0"
                  aria-label={`Download ${doc.fileName}`}
                  onButtonClick={() => downloadSupportingDocument(doc, ownerName)}
                >
                  <ModusWcIcon name="download" size="xs" decorative />
                  Download
                </ModusWcButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
