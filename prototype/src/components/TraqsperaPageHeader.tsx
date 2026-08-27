import type { ReactNode } from 'react'
import { toTitleCase } from '../utils/text'
import { PageBackButton } from './PageBackButton'

export function TraqsperaPageHeader({
  title,
  subtitle,
  leadingActions,
  actions,
  onBack,
  backAriaLabel,
}: {
  title: string
  subtitle?: string
  leadingActions?: ReactNode
  actions?: ReactNode
  onBack?: () => void
  backAriaLabel?: string
}) {
  const hasLeading = onBack || leadingActions

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-[12px]">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {hasLeading && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {onBack && <PageBackButton onBack={onBack} ariaLabel={backAriaLabel} />}
            {leadingActions}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-[22px] font-bold text-[#252a2e] leading-[32px]">{toTitleCase(title)}</h1>
          {subtitle && <p className="text-[11px] text-[#6a6e79] mt-[1px]">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function TraqsperaPageBody({ children }: { children: ReactNode }) {
  return (
    <div className="tq-performance-surface bg-[#f1f1f6] px-[24px] py-[20px] pb-[40px] min-h-full">
      {children}
    </div>
  )
}

export function TraqsperaSectionBar({ title }: { title: string }) {
  return (
    <div className="rounded-t-[4px] bg-[#0d3560] px-4 py-2">
      <h2 className="text-[14px] font-bold text-white leading-[20px]">{toTitleCase(title)}</h2>
    </div>
  )
}
