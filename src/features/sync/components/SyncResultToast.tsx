import { motion, useReducedMotion } from 'framer-motion'
import { TRANSITION_FAST } from '../../../config/motion'

interface SyncResultToastProps {
  message: string
  onDismiss: () => void
}

export function SyncResultToast({ message, onDismiss }: SyncResultToastProps) {
  const shouldReduceMotion = useReducedMotion()
  const transition = shouldReduceMotion ? { duration: 0 } : TRANSITION_FAST

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={transition}
      onClick={onDismiss}
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-lg rounded-lg px-4 py-3 flex items-center gap-2 cursor-pointer"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
      }}
      role="status"
      aria-live="polite"
      data-testid="sync-result-toast"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 10.793 4.354 8.646l.707-.707L6.5 9.378l4.44-4.439.706.707L6.5 10.793Z"
          fill="var(--color-success)"
        />
      </svg>
      <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </span>
    </motion.div>
  )
}
