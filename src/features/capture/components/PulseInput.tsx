import { useRef, useCallback, useEffect, useState } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'
import { LaunchAnimation } from './LaunchAnimation'
import { PriorityPill } from './PriorityPill'
import { triggerLaunchHaptic } from '../../../services/native/haptic-service'

/**
 * "The Pulse" — a focused, borderless, auto-expanding text area
 * for instant thought capture with signature "Launch" gesture.
 *
 * Story 3-1 features:
 * - AC1: Auto-focused on mount (keyboard active)
 * - AC2: 60 FPS typing performance (minimal re-renders)
 * - AC3: Auto-expanding vertically with 32px vertical padding
 * - AC4: First line styled as title (24px semi-bold), rest as body (16px)
 * - AC5: Instant visual feedback, no layout shift
 * - AC6: Draft stored in useSyncStore for persistence
 *
 * Story 3-2 features (Launch gesture):
 * - Vertical swipe-up gesture triggers "Launch" sequence
 * - Animated collapse with ghost task rising upward
 * - Spring bounce landing animation
 * - Haptic feedback on launch (Capacitor)
 * - Cmd+Enter / Ctrl+Enter keyboard shortcut
 * - State clearance after launch
 */

const DEBOUNCE_MS = 300

/** Minimum upward drag distance (px) to trigger launch */
const LAUNCH_THRESHOLD = 50

/** Spring-like resistance factor for drag */
const DRAG_ELASTIC = 0.4

interface LaunchingTask {
  id: number
  text: string
}

export function PulseInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentDraft = useSyncStore((s) => s.currentDraft)
  const setCurrentDraft = useSyncStore((s) => s.setCurrentDraft)

  // Launch gesture state
  const [isCollapsing, setIsCollapsing] = useState(false)
  const [launchingTasks, setLaunchingTasks] = useState<LaunchingTask[]>([])
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [hasContent, setHasContent] = useState(!!currentDraft.trim())

  const dragStartY = useRef<number | null>(null)
  const isDragging = useRef(false)
  const dragOffsetRef = useRef(0)
  const launchIdCounter = useRef(0)

  // Auto-resize textarea to fit content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  // Sync overlay scroll with textarea
  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current
    const overlay = overlayRef.current
    if (textarea && overlay) {
      overlay.scrollTop = textarea.scrollTop
    }
  }, [])

  // Debounced write-through to store/LocalStorage
  const debouncedSetDraft = useCallback(
    (value: string) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
      debounceTimerRef.current = setTimeout(() => {
        setCurrentDraft(value)
      }, DEBOUNCE_MS)
    },
    [setCurrentDraft],
  )

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Auto-resize on mount and when draft loads from store
  useEffect(() => {
    adjustHeight()
  }, [currentDraft, adjustHeight])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      // Update textarea value immediately for responsiveness (AC5)
      // Debounce the store write (AC6)
      debouncedSetDraft(value)
      adjustHeight()
      setHasContent(!!value.trim())
    },
    [debouncedSetDraft, adjustHeight],
  )

  // --- Launch gesture logic ---

  const performLaunch = useCallback(() => {
    const textarea = textareaRef.current
    const text = (textarea?.value ?? currentDraft).trim()
    if (!text) return

    // Trigger haptic feedback (non-blocking)
    triggerLaunchHaptic()

    // Start collapse animation
    setIsCollapsing(true)

    // Create a launching task for the animation
    const launchId = ++launchIdCounter.current
    setLaunchingTasks((prev) => [...prev, { id: launchId, text }])

    // Clear the input immediately (AC: State Clearance)
    if (textarea) {
      textarea.value = ''
    }
    // Cancel any pending debounce and clear the store draft
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setCurrentDraft('')
    // Reset priority flag for the next draft
    useSyncStore.setState({ isImportant: false })
    setDragOffsetY(0)
    setHasContent(false)

    // End collapse after animation duration
    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsCollapsing(false)
        adjustHeight()
        // Refocus the textarea for the next spark
        textareaRef.current?.focus()
      }, 300)
    })
  }, [currentDraft, setCurrentDraft, adjustHeight])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only track primary pointer (touch or left mouse)
      if (e.button !== 0) return
      dragStartY.current = e.clientY
      isDragging.current = false
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragStartY.current === null) return

      const deltaY = dragStartY.current - e.clientY
      if (deltaY > 10) {
        isDragging.current = true
      }

      if (isDragging.current) {
        // Apply elastic resistance for a tactile, springy feel
        const elasticDelta = deltaY * DRAG_ELASTIC
        const clamped = Math.max(0, elasticDelta)
        dragOffsetRef.current = clamped
        setDragOffsetY(clamped)
      }
    },
    [],
  )

  const handlePointerUp = useCallback(() => {
    const wasDragging = isDragging.current
    const finalOffset = dragOffsetRef.current
    const threshold = LAUNCH_THRESHOLD * DRAG_ELASTIC

    dragStartY.current = null
    isDragging.current = false
    dragOffsetRef.current = 0

    if (wasDragging && finalOffset >= threshold) {
      performLaunch()
    } else {
      // Snap back with no launch
      setDragOffsetY(0)
    }
  }, [performLaunch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        performLaunch()
      }
    },
    [performLaunch],
  )

  const handleLaunchComplete = useCallback((launchId: number) => {
    setLaunchingTasks((prev) => prev.filter((t) => t.id !== launchId))
  }, [])

  /**
   * Render styled overlay for visual weight shifts (AC4).
   * The first line is rendered as a title, subsequent lines as body text.
   * The overlay sits behind the textarea which has transparent text for caret visibility.
   */
  const renderOverlay = (text: string) => {
    const lines = text.split('\n')
    const firstLine = lines[0] || ''
    const restLines = lines.slice(1)

    return (
      <>
        <span
          className="pulse-title-line"
          style={{
            fontSize: '24px',
            fontWeight: 600,
            lineHeight: '1.4',
            color: 'var(--color-text-primary)',
          }}
        >
          {firstLine || '\u00A0'}
        </span>
        {restLines.map((line, i) => (
          <span
            key={i}
            className="pulse-body-line"
            style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: '1.5',
              color: 'var(--color-text-secondary)',
            }}
          >
            {line || '\u00A0'}
          </span>
        ))}
      </>
    )
  }

  // Get textarea value - use ref for current value or fall back to store
  const getDisplayValue = () => {
    return textareaRef.current?.value ?? currentDraft
  }

  return (
    <div
      className="pulse-container"
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '640px',
        padding: '32px 16px',
      }}
      data-testid="pulse-container"
    >
      {/* Launched task animations */}
      <div aria-live="polite">
        {launchingTasks.map((task) => (
          <LaunchAnimation
            key={task.id}
            text={task.text}
            onComplete={() => handleLaunchComplete(task.id)}
          />
        ))}
      </div>

      {/* Drag gesture area wrapping the input */}
      <div
        className="touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="pulse-drag-area"
        style={{ position: 'relative' }}
      >
        {/* Styled overlay for visual weight differentiation */}
        <div
          ref={overlayRef}
          className="pulse-overlay"
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            pointerEvents: 'none',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            transform: isCollapsing
              ? 'scaleY(0)'
              : `translateY(-${dragOffsetY}px)`,
            opacity: isCollapsing ? 0 : 1,
            transformOrigin: 'bottom',
            transition: isCollapsing
              ? 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 250ms cubic-bezier(0.2, 0.8, 0.2, 1)'
              : dragOffsetY > 0
                ? 'none'
                : 'transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {renderOverlay(getDisplayValue())}
        </div>

        {/* Actual textarea — transparent text, visible caret */}
        <textarea
          ref={textareaRef}
          autoFocus
          defaultValue={currentDraft}
          onChange={handleChange}
          onScroll={syncScroll}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          rows={1}
          aria-label="Capture your thought"
          data-testid="pulse-input"
          className="pulse-textarea"
          style={{
            position: 'relative',
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            fontSize: '24px',
            lineHeight: '1.4',
            fontFamily: 'inherit',
            color: 'transparent',
            caretColor: 'var(--color-accent)',
            padding: 0,
            transform: isCollapsing
              ? 'scaleY(0)'
              : `translateY(-${dragOffsetY}px)`,
            opacity: isCollapsing ? 0 : 1,
            transformOrigin: 'bottom',
            transition: isCollapsing
              ? 'transform 250ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 250ms cubic-bezier(0.2, 0.8, 0.2, 1)'
              : dragOffsetY > 0
                ? 'none'
                : 'transform 150ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />

        {/* Capture zone: hint text + priority pill */}
        {hasContent && !isCollapsing && (
          <div
            className="mt-2"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            data-testid="capture-zone"
          >
            <p
              className="text-[10px]"
              style={{ color: 'var(--color-text-secondary)' }}
              data-testid="launch-hint"
            >
              Swipe up or press {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to launch
            </p>
            <PriorityPill />
          </div>
        )}
      </div>
    </div>
  )
}
