import { motion } from 'framer-motion'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TRANSITION_SPRING } from '../../../config/motion'

interface CreateTaskFABProps {
  onClick: () => void
}

export function CreateTaskFAB({ onClick }: CreateTaskFABProps) {
  const handleClick = () => {
    triggerSelectionHaptic()
    onClick()
  }

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.92 }}
      transition={TRANSITION_SPRING}
      className="fixed z-40 flex items-center justify-center rounded-full shadow-lg"
      style={{
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        backgroundColor: 'var(--color-accent)',
        color: '#ffffff',
        border: 'none',
        cursor: 'pointer',
      }}
      data-testid="create-task-fab"
      aria-label="Create new task"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </motion.button>
  )
}
