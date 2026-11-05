import { useEffect, useRef, useState } from 'react'
import {
  ModusWcAvatar,
  ModusWcIcon,
  ModusWcProgress,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react'
import type { Person } from '../types'

const MAX_VISIBLE_RECIPIENTS = 5
const DELIVERY_STAGGER_MS = 450
const FLIGHT_MS = 900
const MIN_SENDING_MS = 2400
const SUCCESS_HOLD_MS = 1400

type PublishingReviewCycleScreenProps = {
  cycleName: string
  recipients: Person[]
  onComplete: () => void
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

export function PublishingReviewCycleScreen({
  cycleName,
  recipients,
  onComplete,
}: PublishingReviewCycleScreenProps) {
  const visibleRecipients = recipients.slice(0, MAX_VISIBLE_RECIPIENTS)
  const hiddenCount = recipients.length - visibleRecipients.length
  const sendingMs = Math.max(
    MIN_SENDING_MS,
    visibleRecipients.length * DELIVERY_STAGGER_MS + FLIGHT_MS,
  )

  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'sending' | 'done'>('sending')
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const totalSendingMs = prefersReducedMotion() ? 600 : sendingMs
    const startedAt = performance.now()
    const tick = window.setInterval(() => {
      const ratio = Math.min(1, (performance.now() - startedAt) / totalSendingMs)
      setProgress(Math.round(ratio * 100))
    }, 80)
    const done = window.setTimeout(() => {
      window.clearInterval(tick)
      setProgress(100)
      setPhase('done')
    }, totalSendingMs)
    const finish = window.setTimeout(
      () => onCompleteRef.current(),
      totalSendingMs + SUCCESS_HOLD_MS,
    )
    return () => {
      window.clearInterval(tick)
      window.clearTimeout(done)
      window.clearTimeout(finish)
    }
  }, [sendingMs])

  const recipientLabel =
    recipients.length === 1 ? '1 employee' : `${recipients.length} employees`

  return (
    <section
      className={`tq-publish-anim tq-publish-anim--${phase}`}
      aria-labelledby="tq-publish-anim-title"
    >
      <div className="tq-publish-anim__stage" aria-hidden="true">
        <div className="tq-publish-anim__hub">
          <span className="tq-publish-anim__ring" />
          <span className="tq-publish-anim__ring tq-publish-anim__ring--delayed" />
          <span className="tq-publish-anim__hub-icon tq-publish-anim__hub-icon--sending">
            <ModusWcIcon name="paper_plane" size="lg" decorative />
          </span>
          <span className="tq-publish-anim__hub-icon tq-publish-anim__hub-icon--done">
            <ModusWcIcon name="check_circle" size="lg" decorative />
          </span>
        </div>

        <ul className="tq-publish-anim__recipients">
          {visibleRecipients.map((person, index) => (
            <li
              key={person.id}
              className={`tq-publish-anim__recipient tq-publish-anim__recipient--${index}`}
            >
              <span className="tq-publish-anim__plane">
                <ModusWcIcon name="email" size="sm" decorative />
              </span>
              <ModusWcAvatar initials={person.name} alt={person.name} size="md" />
              <span className="tq-publish-anim__delivered">
                <ModusWcIcon name="check" size="xs" decorative />
              </span>
            </li>
          ))}
          {hiddenCount > 0 ? (
            <li className="tq-publish-anim__recipient tq-publish-anim__recipient--more">
              <ModusWcAvatar initials={`+ ${hiddenCount}`} alt="" size="md" />
            </li>
          ) : null}
        </ul>
      </div>

      <div className="tq-publish-anim__copy" role="status" aria-live="polite">
        <ModusWcTypography
          id="tq-publish-anim-title"
          hierarchy="h1"
          size="lg"
          weight="semibold"
          customClass="!m-0"
          label={phase === 'done' ? 'Review cycle published!' : 'Sending reviews…'}
        />
        <ModusWcTypography
          hierarchy="p"
          size="md"
          customClass="!m-0 text-[var(--modus-wc-color-base-content-low-contrast)]"
          label={
            phase === 'done'
              ? `${recipientLabel} ${recipients.length === 1 ? 'has' : 'have'} been notified. Taking you to the review details…`
              : `Notifying ${recipientLabel} and their reviewers about ${cycleName}.`
          }
        />
      </div>

      <ModusWcProgress
        value={progress}
        max={100}
        aria-label="Sending review notifications"
        customClass="tq-publish-anim__progress"
      />
    </section>
  )
}
