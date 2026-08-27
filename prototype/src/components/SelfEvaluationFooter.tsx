import { ModusWcButton, ModusWcIcon } from '@trimble-oss/moduswebcomponents-react'

type SelfEvaluationFooterProps = {
  onSaveForLater: () => void
  onSubmit: () => void
}

export function SelfEvaluationFooter({ onSaveForLater, onSubmit }: SelfEvaluationFooterProps) {
  return (
    <footer className="tq-self-eval-page__footer">
      <div className="tq-self-eval-page__footer-inner">
        <ModusWcButton variant="outlined" color="tertiary" size="sm" onButtonClick={onSaveForLater}>
          Save for later
        </ModusWcButton>
        <ModusWcButton variant="filled" color="primary" size="sm" onButtonClick={onSubmit}>
          <ModusWcIcon name="send" size="xs" decorative />
          Submit
        </ModusWcButton>
      </div>
    </footer>
  )
}
