import { ModusWcButton, ModusWcIcon } from '@trimble-oss/moduswebcomponents-react'

type SelfEvaluationActionsProps = {
  onSaveForLater: () => void
  onSubmit: () => void
}

export function SelfEvaluationActions({ onSaveForLater, onSubmit }: SelfEvaluationActionsProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
      <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={onSaveForLater}>
        Save for later
      </ModusWcButton>
      <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={onSubmit}>
        <ModusWcIcon name="send" size="xs" decorative />
        Submit
      </ModusWcButton>
    </div>
  )
}
