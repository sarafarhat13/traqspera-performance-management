/** Read selected row ids from modus-wc-table rowSelectionChange (1.15+). */
export function readTableSelectedRowIds(event: CustomEvent): string[] {
  const detail = event.detail as
    | { selectedRowIds?: string[]; selectedRows?: Array<Record<string, unknown>> }
    | undefined
  if (Array.isArray(detail?.selectedRowIds)) {
    return detail.selectedRowIds
  }
  if (Array.isArray(detail?.selectedRows)) {
    return detail.selectedRows
      .map((row) => (row?.id != null ? String(row.id) : ''))
      .filter(Boolean)
  }
  return []
}

export function rowIdSetEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((id) => rightSet.has(id))
}
