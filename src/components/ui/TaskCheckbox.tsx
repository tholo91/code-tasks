import { motion } from 'framer-motion'
import { TRANSITION_SPRING } from '../../config/motion'
import { triggerSelectionHaptic } from '../../services/native/haptic-service'

interface TaskCheckboxProps {
  isCompleted: boolean
  onChange: () => void
  /** 'sm' = 22px (list cards), 'md' = 24px (detail sheet). Default: 'sm' */
  size?: 'sm' | 'md'
  testId?: string
}

export function TaskCheckbox({ isCompleted, onChange, size = 'sm', testId }: TaskCheckboxProps) {
  const dim = size === 'md' ? 24 : 22

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange()
    triggerSelectionHaptic()
  }

  return (
    <motion.button
      onClick={handleClick}
      className="flex flex-shrink-0 items-center justify-center"
      style={{
        width: dim,
        height: dim,
        borderRadius: '4px',
        border: `2px solid ${isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
        backgroundColor: isCompleted ? 'var(--color-success)' : 'transparent',
      }}
      animate={{
        backgroundColor: isCompleted ? 'var(--color-success)' : 'transparent',
        borderColor: isCompleted ? 'var(--color-success)' : 'var(--color-border)',
      }}
      transition={TRANSITION_SPRING}
      whileTap={{ scale: 0.85 }}
      role="checkbox"
      aria-checked={isCompleted}
      aria-label={isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
      data-testid={testId}
    >
      {isCompleted && (
        <motion.svg
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={TRANSITION_SPRING}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
        >
          <path
            d="M2 6L5 9L10 3"
            stroke="white"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
        </motion.svg>
      )}
    </motion.button>
  )
}
