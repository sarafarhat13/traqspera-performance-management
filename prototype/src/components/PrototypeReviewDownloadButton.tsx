import { ModusWcButton, ModusWcIcon } from '@trimble-oss/moduswebcomponents-react'

/** Visual-only placeholder — print/download disabled in prototype (embedded browser crash). */
export function PrototypeReviewDownloadButton() {
  return (
    <ModusWcButton
      variant="outlined"
      color="tertiary"
      size="sm"
      disabled
      aria-label="Download (not available in prototype)"
    >
      <ModusWcIcon name="download" size="xs" decorative />
      Download
    </ModusWcButton>
  )
}
