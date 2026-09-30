import { useEffect, useState } from 'react'
import { ModusWcButton, ModusWcModal } from '@trimble-oss/moduswebcomponents-react'
import type { RatingScaleConfig } from '../types'
import { isRatingScaleConfigValid, normalizeRatingScale } from '../utils/ratingScale'
import { useModusDialog } from '../utils/useModusDialog'
import { RatingScaleConfigEditor } from './RatingScaleConfigEditor'

export const WORKFLOW_RATING_SCALE_MODAL_ID = 'workflow-rating-scale-config-modal'

type RatingScaleConfigModalProps = {
  open: boolean
  ratingScale: RatingScaleConfig
  onClose: () => void
  onSave: (scale: RatingScaleConfig) => void
}

export function RatingScaleConfigModal({
  open,
  ratingScale,
  onClose,
  onSave,
}: RatingScaleConfigModalProps) {
  const { requestClose } = useModusDialog(WORKFLOW_RATING_SCALE_MODAL_ID, open, onClose)
  const [draft, setDraft] = useState<RatingScaleConfig>(() => normalizeRatingScale(ratingScale))

  useEffect(() => {
    if (open) {
      setDraft(normalizeRatingScale(ratingScale))
    }
  }, [open, ratingScale])

  const handleSave = () => {
    const normalized = normalizeRatingScale(draft)
    if (!isRatingScaleConfigValid(normalized)) return
    onSave(normalized)
    requestClose()
  }

  const canSave = isRatingScaleConfigValid(draft)

  return (
    <ModusWcModal
      modalId={WORKFLOW_RATING_SCALE_MODAL_ID}
      backdrop="default"
      position="center"
      showClose
      aria-label="Customize performance rating scale"
    >
      <span slot="header">Customize performance rating</span>
      <div slot="content" className="flex max-h-[70vh] flex-col overflow-y-auto">
        <RatingScaleConfigEditor ratingScale={draft} onChange={setDraft} />
      </div>
      <div slot="footer" className="tq-card-footer-actions flex justify-end gap-2">
        <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={requestClose}>
          Cancel
        </ModusWcButton>
        <ModusWcButton
          variant="filled"
          color="primary"
          size="sm"
          disabled={!canSave}
          onButtonClick={handleSave}
        >
          Save rating scale
        </ModusWcButton>
      </div>
    </ModusWcModal>
  )
}
