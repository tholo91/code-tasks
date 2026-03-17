import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { TRANSITION_FAST } from '../../../config/motion'

interface UndoToastProps {
  message: string
  onUndo: () => void
  onExpire: () => void
  durationMs?: number
}

export function UndoToast({ message, onUndo, onExpire, durationMs = 5000 }: UndoToastProps) {
  useEffect(() => {
    const id = setTimeout(onExpire, durationMs)
    return () => clearTimeout(id)
  }, [onExpire, durationMs])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={TRANSITION_FAST}
      className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-lg rounded-lg px-4 py-3 flex items-center justify-between"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
      role="status"
      aria-live="polite"
      data-testid="undo-toast"
    >
      <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
        {message}
      </span>
      <button
        onClick={onUndo}
        className="text-body font-semibold ml-4"
        style={{ color: 'var(--color-accent)' }}
        aria-label="Undo delete"
        data-testid="undo-button"
      >
        Undo
      </button>
    </motion.div>
  )
}
