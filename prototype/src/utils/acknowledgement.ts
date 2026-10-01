import type { PerformanceReview, ReviewAcknowledgement, ReviewAcceptanceSubmission } from '../types'

export const REVIEW_ACCEPTANCE_COMMENT_MAX = 1000

export function isReviewAcknowledgementComplete(ack?: ReviewAcknowledgement): boolean {
  if (!ack?.acknowledged) return false
  if (ack.decision && ack.signature?.trim() && ack.signedDate?.trim()) return true
  return Boolean(ack.completedAt)
}

export function reviewRequiresHrEscalation(review: PerformanceReview): boolean {
  const ack = review.acknowledgement
  if (!ack) return false
  if (ack.hrEscalationRequired) return true
  return ack.decision === 'disagree'
}

export function buildReviewAcknowledgement(
  submission: ReviewAcceptanceSubmission,
): ReviewAcknowledgement {
  const decision = submission.decision
  const comment = submission.comment.trim().slice(0, REVIEW_ACCEPTANCE_COMMENT_MAX)
  return {
    acknowledged: true,
    completedAt: new Date().toISOString(),
    decision,
    comment: comment || undefined,
    signature: submission.signature.trim(),
    signedDate: submission.signedDate.trim(),
    hrEscalationRequired: decision === 'disagree',
  }
}

export function legacyAutoAcknowledgement(): ReviewAcknowledgement {
  return {
    acknowledged: true,
    completedAt: new Date().toISOString(),
    decision: 'agree',
    signature: 'System',
    signedDate: new Date().toISOString().slice(0, 10),
  }
}
