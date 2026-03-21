import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TRANSITION_SPRING } from '../../config/motion'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold: number
  result?: 'up-to-date' | null
}

const CIRCLE_RADIUS = 9
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS

export function PullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold,
  result,
}: PullToRefreshIndicatorProps) {
  const prefersReducedMotion = useReducedMotion()
  const isVisible = pullDistance > 0 || isRefreshing || result === 'up-to-date'

  if (!isVisible) return null

  const progress = Math.min(pullDistance / threshold, 1)
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="pull-to-refresh-indicator"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_SPRING}
          className="w-full max-w-[640px] overflow-hidden px-2"
        >
          <div className="flex items-center justify-center gap-2.5 py-2.5">
            {/* Pulling state — circle that fills */}
            {!isRefreshing && result !== 'up-to-date' && (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" className="flex-shrink-0">
                  {/* Background track */}
                  <circle
                    cx="12"
                    cy="12"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  {/* Progress arc */}
                  <circle
                    cx="12"
                    cy="12"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke={progress >= 1 ? 'var(--color-accent)' : 'var(--color-text-secondary)'}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={strokeDashoffset}
                    transform="rotate(-90 12 12)"
                    style={{ transition: 'stroke-dashoffset 0.05s linear, stroke 0.15s ease' }}
                  />
                </svg>
                <span
                  className="text-label"
                  style={{ color: progress >= 1 ? 'var(--color-accent)' : 'var(--color-text-secondary)' }}
                >
                  {progress >= 1 ? 'Release to refresh' : 'Pull to refresh from main'}
                </span>
              </>
            )}

            {/* Refreshing state */}
            {isRefreshing && (
              <>
                <motion.svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className="flex-shrink-0"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                  <circle
                    cx="12"
                    cy="12"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth="2"
                    opacity="0.3"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="var(--color-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray={CIRCLE_CIRCUMFERENCE}
                    strokeDashoffset={CIRCLE_CIRCUMFERENCE * 0.7}
                    transform="rotate(-90 12 12)"
                  />
                </motion.svg>
                <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                  Checking for updates…
                </span>
              </>
            )}

            {/* Up to date state */}
            {result === 'up-to-date' && !isRefreshing && (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" className="flex-shrink-0">
                  <circle
                    cx="12"
                    cy="12"
                    r={CIRCLE_RADIUS}
                    fill="none"
                    stroke="var(--color-success)"
                    strokeWidth="2"
                  />
                  <path
                    d="M8.5 12.5l2 2 5-5"
                    stroke="var(--color-success)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
                <span className="text-label" style={{ color: 'var(--color-success)' }}>
                  Up to date
                </span>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
