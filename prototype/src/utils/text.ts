/** Capitalize the first letter of each word for UI titles. */
export function toTitleCase(value: string): string {
  return value.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

export function navPageToTitle(pageId: string): string {
  const normalized = pageId.replace(/^p_perf_/, '').replace(/_/g, ' ').trim()
  return toTitleCase(normalized)
}
