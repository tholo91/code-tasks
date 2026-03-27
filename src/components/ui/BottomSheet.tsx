import { forwardRef, useCallback } from 'react'
import { motion, useDragControls, useReducedMotion } from 'framer-motion'
import { TRANSITION_SHEET } from '../../config/motion'
import { SheetHandle } from './SheetHandle'

interface BottomSheetProps {
  onClose: () => void
  children: React.ReactNode
  /** Adds backdrop-blur-sm to the backdrop overlay. Default: false */
  backdropBlur?: boolean
  /** Accessible label for the dialog. Required for a11y. */
  ariaLabel: string
  testId?: string
}

/**
 * Checks whether an element or any ancestor up to `boundary` is scrollable
 * and has room to scroll in the given vertical direction.
 */
function isInsideScrollableContent(target: EventTarget | null, boundary: HTMLElement | null): boolean {
  let el = target as HTMLElement | null
  while (el && el !== boundary) {
    if (el.scrollHeight > el.clientHeight) {
      const style = window.getComputedStyle(el)
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        return true
      }
    }
    el = el.parentElement
  }
  return false
}

/**
 * Reusable bottom sheet with backdrop, drag-to-close, and spring animation.
 * Wrap content in this instead of duplicating the motion.div pattern.
 *
 * Drag-to-dismiss is disabled when the touch starts inside a scrollable child
 * to prevent the sheet from wobbling during list scrolling.
 *
 * Note: children are responsible for their own padding and scroll containers.
 * The sheet itself has p-6 pb-8 applied by default.
 */
export const BottomSheet = forwardRef<HTMLDivElement, BottomSheetProps>(
  ({ onClose, children, backdropBlur = false, ariaLabel, testId }, ref) => {
    const prefersReducedMotion = useReducedMotion()
    const sheetTransition = prefersReducedMotion ? { duration: 0.15 } : TRANSITION_SHEET
    const dragControls = useDragControls()

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        // Only start the drag when the touch is NOT inside a scrollable area
        if (!isInsideScrollableContent(e.target, e.currentTarget)) {
          dragControls.start(e)
        }
      },
      [dragControls],
    )

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : undefined}
        className="fixed inset-0 z-50 flex flex-col items-center justify-end"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        data-testid={testId}
      >
        {/* Backdrop */}
        <div
          className={`absolute inset-0 bg-black/50${backdropBlur ? ' backdrop-blur-sm' : ''}`}
          onClick={(e) => { e.stopPropagation(); onClose() }}
          data-testid={testId ? `${testId}-backdrop` : undefined}
        />

        {/* Sheet surface */}
        <motion.div
          ref={ref}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={sheetTransition}
          drag="y"
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={{ top: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 300) {
              onClose()
            }
          }}
          onPointerDown={handlePointerDown}
          className="relative z-10 w-full max-w-lg rounded-t-2xl px-5 pt-2 pb-6"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sheet)',
          }}
        >
          <SheetHandle />
          {children}
        </motion.div>
      </motion.div>
    )
  }
)

BottomSheet.displayName = 'BottomSheet'
