import { motion } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'

/**
 * "Important" priority pill toggle for the Pulse capture area.
 *
 * Story 3-3: Priority Toggles
 * - Two states: Standard (ghost/outline) and Important (filled accent)
 * - Haptic feedback via selectionChanged() on toggle
 * - aria-pressed for accessibility, keyboard accessible (Space/Enter)
 * - GitHub Primer palette: Border #30363d, Active #58a6ff
 * - Spring animation on state transition (Framer Motion)
 * - Minimum 44x44px touch target
 */
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
        backgroundColor: isImportant ? '#58a6ff' : 'transparent',
        borderColor: isImportant ? '#58a6ff' : '#30363d',
        color: isImportant ? '#0d1117' : '#8b949e',
        scale: 1,
      }}
      whileTap={{ scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 0.8,
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '44px',
        minHeight: '44px',
        padding: '6px 14px',
        borderRadius: '9999px',
        border: '1px solid',
        fontSize: '12px',
        fontWeight: 600,
        lineHeight: '1',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
      }}
      className="focus-visible:ring-2 focus-visible:ring-[#58a6ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
    >
      Important
    </motion.button>
  )
}
