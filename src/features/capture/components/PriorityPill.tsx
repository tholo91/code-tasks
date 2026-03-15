import { motion } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TRANSITION_SPRING } from '../../../config/motion'

export function PriorityPill() {
  const isImportant = useSyncStore((s) => s.isImportant)
  const toggleImportant = useSyncStore((s) => s.toggleImportant)

  const handleToggle = () => {
    toggleImportant()
    triggerSelectionHaptic()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  return (
    <motion.button
      type="button"
      role="button"
      aria-pressed={isImportant}
      aria-label="Toggle important priority"
      data-testid="priority-pill"
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      animate={{
        backgroundColor: isImportant ? 'var(--color-accent)' : 'transparent',
        borderColor: isImportant ? 'var(--color-accent)' : 'var(--color-border)',
        color: isImportant ? 'var(--color-canvas)' : 'var(--color-text-secondary)',
        scale: 1,
      }}
      whileTap={{ scale: 0.95 }}
      transition={TRANSITION_SPRING}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        minHeight: '44px',
        padding: '6px 14px',
        borderRadius: '9999px',
        border: '1px solid',
        fontWeight: 600,
        lineHeight: '1',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
      className="text-label focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-canvas)]"
    >
      Important
    </motion.button>
  )
}
