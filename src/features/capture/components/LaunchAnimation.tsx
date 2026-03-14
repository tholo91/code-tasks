import { useEffect, useRef, useState } from 'react'

export interface LaunchAnimationProps {
  /** The text content of the launched task */
  text: string
  /** Callback when the full animation sequence completes */
  onComplete: () => void
}

type AnimationPhase = 'ghost-rise' | 'landing' | 'done'

/**
 * LaunchAnimation renders a "ghost" task that rises upward and then
 * "lands" in the task list with a springy bounce.
 *
 * Animation sequence:
 * 1. Ghost rises upward (translateY) with fade
 * 2. Task card lands in place with a spring bounce
 *
 * Only transform and opacity are animated for 60 FPS performance.
 */
export function LaunchAnimation({ text, onComplete }: LaunchAnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('ghost-rise')
  const ghostRef = useRef<HTMLDivElement>(null)
  const landingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ghost = ghostRef.current
    if (!ghost || phase !== 'ghost-rise') return

    // Use Web Animations API for spring-like physics
    const animation = ghost.animate(
      [
        { transform: 'translateY(0)', opacity: 1 },
        { transform: 'translateY(-200px)', opacity: 0 },
      ],
      {
        duration: 400,
        easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        fill: 'forwards',
      },
    )

    animation.onfinish = () => setPhase('landing')

    return () => animation.cancel()
  }, [phase])

  useEffect(() => {
    const landing = landingRef.current
    if (!landing || phase !== 'landing') return

    // Spring bounce landing animation
    const animation = landing.animate(
      [
        { transform: 'scale(0.8) translateY(-20px)', opacity: 0 },
        { transform: 'scale(1.05) translateY(2px)', opacity: 1 },
        { transform: 'scale(0.98) translateY(-1px)', opacity: 1 },
        { transform: 'scale(1) translateY(0)', opacity: 1 },
      ],
      {
        duration: 350,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards',
      },
    )

    animation.onfinish = () => {
      setPhase('done')
      onComplete()
    }

    return () => animation.cancel()
  }, [phase, onComplete])

  if (phase === 'done') return null

  return (
    <>
      {phase === 'ghost-rise' && (
        <div
          ref={ghostRef}
          className="rounded-md border px-3 py-2 text-sm pointer-events-none"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            opacity: 1,
          }}
          data-testid="launch-ghost"
          aria-hidden="true"
        >
          {text}
        </div>
      )}

      {phase === 'landing' && (
        <div
          ref={landingRef}
          className="rounded-md border px-3 py-2 text-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-primary)',
            opacity: 0,
          }}
          data-testid="launch-landing"
        >
          {text}
        </div>
      )}
    </>
  )
}
