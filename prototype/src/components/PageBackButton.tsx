import { ModusWcButton, ModusWcIcon } from '@trimble-oss/moduswebcomponents-react'

type PageBackButtonProps = {
  onBack: () => void
  ariaLabel?: string
}

export function PageBackButton({ onBack, ariaLabel = 'Back' }: PageBackButtonProps) {
  return (
    <ModusWcButton
      variant="outlined"
      color="tertiary"
      shape="square"
      size="sm"
      aria-label={ariaLabel}
      onButtonClick={onBack}
    >
      <ModusWcIcon name="chevron_left" size="xs" decorative />
    </ModusWcButton>
  )
}
