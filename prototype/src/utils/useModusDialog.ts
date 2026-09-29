import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'

export function getModusDialog(modalId: string): HTMLDialogElement | null {
  const direct = document.getElementById(modalId)
  if (direct instanceof HTMLDialogElement) return direct

  for (const host of document.querySelectorAll('modus-wc-modal')) {
    const inShadow = host.shadowRoot?.querySelector(
      `dialog#${CSS.escape(modalId)}`,
    ) as HTMLDialogElement | null
    if (inShadow instanceof HTMLDialogElement) return inShadow

    const inLight = host.querySelector(`dialog#${CSS.escape(modalId)}`)
    if (inLight instanceof HTMLDialogElement) return inLight
  }

  return null
}

function runDialogOpen(dialog: HTMLDialogElement) {
  if (dialog.open) return
  try {
    dialog.showModal()
  } catch {
    // Another dialog may still be in the top layer — caller can retry.
  }
}

/**
 * Sync React `open` state with Modus modus-wc-modal's inner native <dialog>.
 * Always dismiss via `requestClose()` so the top layer is released before paint.
 */
export function useModusDialog(modalId: string, open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const syncingCloseRef = useRef(false)

  useEffect(() => {
    const dialog = getModusDialog(modalId)
    if (!dialog) return
    const handleClose = () => {
      if (syncingCloseRef.current) return
      onCloseRef.current()
    }
    dialog.addEventListener('close', handleClose)
    return () => dialog.removeEventListener('close', handleClose)
  }, [modalId])

  useLayoutEffect(() => {
    const dialog = getModusDialog(modalId)
    if (!dialog) {
      if (!open) return
      const retry = () => {
        const retryDialog = getModusDialog(modalId)
        if (!retryDialog || !open) return
        runDialogOpen(retryDialog)
      }
      const id = requestAnimationFrame(() => requestAnimationFrame(retry))
      return () => cancelAnimationFrame(id)
    }

    if (open) {
      runDialogOpen(dialog)
      return
    }

    if (dialog.open) {
      syncingCloseRef.current = true
      dialog.close()
      syncingCloseRef.current = false
    }
  }, [open, modalId])

  const requestClose = useCallback(() => {
    const dialog = getModusDialog(modalId)
    if (dialog?.open) {
      dialog.close()
      return
    }
    onCloseRef.current()
  }, [modalId])

  const requestOpen = useCallback(() => {
    const dialog = getModusDialog(modalId)
    if (dialog) {
      runDialogOpen(dialog)
      return
    }
    requestAnimationFrame(() => {
      const retryDialog = getModusDialog(modalId)
      if (retryDialog) runDialogOpen(retryDialog)
    })
  }, [modalId])

  return { requestClose, requestOpen }
}

export function closeModusDialog(modalId: string) {
  const dialog = getModusDialog(modalId)
  if (dialog?.open) dialog.close()
}
