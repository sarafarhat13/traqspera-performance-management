import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { PerformanceReview, ReviewCycle } from '../types'
import { usePerformance } from '../context/PerformanceContext'
import { formatReviewPeriod } from '../utils/status'
import {
  getCycleDisplayEndDate,
  getCycleDisplayStartDate,
} from '../utils/cycleDisplay'
import { CurrentStageDueLine } from './CurrentStageDueLine'

type ReviewScheduleLinesProps = {
  cycle: ReviewCycle
  review: PerformanceReview
  activePersonId?: string
}

/** Review period plus the due date for the employee's current workflow stage. */
export function ReviewScheduleLines({
  cycle,
  review,
  activePersonId: activePersonIdProp,
}: ReviewScheduleLinesProps) {
  const { state } = usePerformance()
  const activePersonId = activePersonIdProp ?? state.activePersonId

  return (
    <div className="flex flex-col gap-0.5">
      <ModusWcTypography
        hierarchy="p"
        size="sm"
        label={formatReviewPeriod(getCycleDisplayStartDate(cycle), getCycleDisplayEndDate(cycle))}
      />
      <CurrentStageDueLine
        cycle={cycle}
        review={review}
        activePersonId={activePersonId}
      />
    </div>
  )
}
