export function readInputString(e: CustomEvent): string {
  return String((e as CustomEvent<{ target?: { value?: string } }>).detail?.target?.value ?? '')
}

export function readInputChecked(e: CustomEvent): boolean {
  return Boolean((e as CustomEvent<{ target?: { checked?: boolean } }>).detail?.target?.checked)
}
