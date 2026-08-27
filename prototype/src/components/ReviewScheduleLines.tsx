import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react'
import type { DemoRole, PerformanceReview, ReviewCycle } from '../types'
import { usePerformance } from '../context/PerformanceContext'
import { formatReviewPeriod } from '../utils/status'
import { CurrentStageDueLine } from './CurrentStageDueLine'

type ReviewScheduleLinesProps = {
  cycle: ReviewCycle
  review: PerformanceReview
  demoRole?: DemoRole
  activePersonId?: string
}

/** Review period plus the due date for the employee's current workflow stage. */
export function ReviewScheduleLines({
  cycle,
  review,
  demoRole: demoRoleProp,
  activePersonId: activePersonIdProp,
}: ReviewScheduleLinesProps) {
  const { state } = usePerformance()
  const demoRole = demoRoleProp ?? state.demoRole
  const activePersonId = activePersonIdProp ?? state.activePersonId

  return (
    <div className="flex flex-col gap-0.5">
      <ModusWcTypography hierarchy="p" size="sm" label={formatReviewPeriod(cycle.startDate, cycle.dueDate)} />
      <CurrentStageDueLine
        cycle={cycle}
        review={review}
        demoRole={demoRole}
        activePersonId={activePersonId}
      />
    </div>
  )
}
