import { useEffect, useState } from 'react'
import {
  ModusWcButton,
  ModusWcIcon,
  ModusWcModal,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'

const DOWNLOAD_STUB_MODAL_ID = 'prototype-review-download-stub-modal'

/** Prototype download — enabled primary control; file export not implemented. */
export function PrototypeReviewDownloadButton() {
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const dialog = document.getElementById(DOWNLOAD_STUB_MODAL_ID) as HTMLDialogElement | null
    if (modalOpen) {
      dialog?.showModal()
      return
    }
    dialog?.close()
  }, [modalOpen])

  return (
    <>
      <ModusWcButton
        variant="filled"
        color="primary"
        size="sm"
        aria-label="Download review"
        onButtonClick={() => setModalOpen(true)}
      >
        <ModusWcIcon name="download" size="xs" decorative />
        Download
      </ModusWcButton>

      <ModusWcModal
        modalId={DOWNLOAD_STUB_MODAL_ID}
        backdrop="default"
        position="center"
        showClose
        aria-label="Download not available"
      >
        <span slot="header">Download</span>
        <div slot="content">
          <ModusWcTypography
            hierarchy="p"
            size="md"
            label="PDF download is not available in this prototype. In production, this button would export the completed review."
          />
        </div>
        <div slot="footer" className="flex w-full justify-end">
          <ModusWcButton
            variant="filled"
            color="primary"
            size="sm"
            onButtonClick={() => setModalOpen(false)}
          >
            OK
          </ModusWcButton>
        </div>
      </ModusWcModal>
    </>
  )
}
