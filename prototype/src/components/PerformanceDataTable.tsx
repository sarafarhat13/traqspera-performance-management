import { ModusWcTable } from '@trimble-oss/moduswebcomponents-react'
import type { ComponentProps } from 'react'

type ModusTableProps = ComponentProps<typeof ModusWcTable>

export type PerformanceDataTableProps = Omit<
  ModusTableProps,
  'density' | 'hover' | 'sortable' | 'zebra' | 'customClass'
> & {
  density?: ModusTableProps['density']
  hover?: boolean
  sortable?: boolean
  zebra?: boolean
  customClass?: string
}

/**
 * Modus Docs MCP defaults for modus-modern-light data tables:
 * comfortable density, row hover, sortable columns, zebra striping.
 */
export function PerformanceDataTable({
  density = 'comfortable',
  hover = true,
  sortable = true,
  zebra = true,
  customClass = 'w-full',
  ...props
}: PerformanceDataTableProps) {
  return (
    <div className="tq-data-table min-w-0 w-full overflow-x-auto">
      <ModusWcTable
        density={density}
        hover={hover}
        sortable={sortable}
        zebra={zebra}
        customClass={customClass}
        {...props}
      />
    </div>
  )
}
