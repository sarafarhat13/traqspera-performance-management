/** Synthetic employee code for prototype display (derived from person id). */
export function formatEmployeeCode(personId: string): string {
  const digits = personId.replace(/\D/g, '')
  return `E${digits.padStart(4, '0')}`
}

export function formatEmployeeNameWithCode(name: string, personId: string): string {
  const trimmed = name.trim()
  if (!trimmed) return formatEmployeeCode(personId)
  return `${trimmed} (${formatEmployeeCode(personId)})`
}
