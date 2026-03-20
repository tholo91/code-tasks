import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TRANSITION_FAST, TRANSITION_SPRING } from '../../config/motion'

interface PullToRefreshIndicatorProps {
  pullDistance: number
  isRefreshing: boolean
  threshold: number
  result?: 'up-to-date' | null
}

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
  // Arrow rotates from 0° (down) to 180° (up) as pull approaches threshold
  const arrowRotation = progress * 180

  const translateY = isRefreshing
    ? threshold * 0.6
    : result === 'up-to-date'
      ? threshold * 0.4
      : Math.min(pullDistance, threshold)

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          data-testid="pull-to-refresh-indicator"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, y: translateY }}
          exit={{ opacity: 0, y: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_SPRING}
          className="pointer-events-none absolute left-0 right-0 top-0 z-40 flex items-center justify-center"
          style={{ transform: `translateY(${prefersReducedMotion ? translateY : 0}px)` }}
        >
          <div
            className="flex items-center gap-2 rounded-full px-4 py-2"
            style={{
              backgroundColor: 'rgba(45, 51, 59, 0.9)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {/* Pulling state */}
            {!isRefreshing && result !== 'up-to-date' && (
              <>
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  animate={{ rotate: arrowRotation }}
                  transition={prefersReducedMotion ? { duration: 0 } : TRANSITION_FAST}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <path
                    d="M8 3v10M4 9l4 4 4-4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </motion.svg>
                <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                  Check for updates
                </span>
              </>
            )}

            {/* Refreshing state */}
            {isRefreshing && (
              <>
                <motion.svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  <path
                    d="M8 1.5A6.5 6.5 0 1 0 14.5 8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </motion.svg>
                <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                  Checking…
                </span>
              </>
            )}

            {/* Up to date state */}
            {result === 'up-to-date' && !isRefreshing && (
              <>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  style={{ color: 'var(--color-success)' }}
                >
                  <path
                    d="M3 8.5l3.5 3.5L13 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
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
