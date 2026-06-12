import { forwardRef, useCallback, useEffect, useState } from 'react'
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
 * Checks whether an element or any ancestor up to `boundary` is an interactive
 * control (text field, button, …). Drags must not start there — on mobile,
 * positioning the cursor in a textarea would otherwise wobble the whole sheet.
 */
function isInteractiveElement(target: EventTarget | null, boundary: HTMLElement | null): boolean {
  let el = target as HTMLElement | null
  while (el && el !== boundary) {
    const tag = el.tagName
    if (tag === 'TEXTAREA' || tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON' || el.isContentEditable) {
      return true
    }
    el = el.parentElement
  }
  return false
}

/**
 * Tracks how far the on-screen keyboard intrudes into the layout viewport.
 * Fixed-position elements stay anchored to the layout viewport, so without
 * this offset the keyboard covers the bottom of the sheet on iOS/Android PWAs.
 */
function useKeyboardInset(): number {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const update = () => {
      const offsetFromBottom = window.innerHeight - viewport.height - viewport.offsetTop
      setInset(Math.max(0, Math.round(offsetFromBottom)))
    }

    // iOS fires `scroll` (offsetTop changes) when it shifts the visual
    // viewport for a focused input — `resize` alone misses that.
    viewport.addEventListener('resize', update)
    viewport.addEventListener('scroll', update)
    update()
    return () => {
      viewport.removeEventListener('resize', update)
      viewport.removeEventListener('scroll', update)
    }
  }, [])

  return inset
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
    const keyboardInset = useKeyboardInset()

    const handlePointerDown = useCallback(
      (e: React.PointerEvent<HTMLDivElement>) => {
        // Only start the drag when the touch is NOT inside a scrollable area
        // and NOT on an interactive control (textarea, button, …)
        if (
          !isInsideScrollableContent(e.target, e.currentTarget) &&
          !isInteractiveElement(e.target, e.currentTarget)
        ) {
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
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0.2, bottom: 0.5 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 300) {
              onClose()
            }
          }}
          onPointerDown={handlePointerDown}
          className="relative z-10 w-full max-w-lg rounded-t-2xl px-5 pt-2"
          style={{
            backgroundColor: 'var(--color-surface)',
            boxShadow: 'var(--shadow-sheet)',
            // Keyboard covers the home-indicator area, so take whichever is larger
            paddingBottom: `calc(1.5rem + max(env(safe-area-inset-bottom, 0px), ${keyboardInset}px))`,
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
