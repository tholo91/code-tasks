import { useRef, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { LaunchAnimation } from './LaunchAnimation'
import { PriorityPill } from './PriorityPill'
import { triggerLaunchHaptic } from '../../../services/native/haptic-service'
import { successFlash } from '../../../config/motion'

const DEBOUNCE_MS = 300
const LAUNCH_THRESHOLD = 50
const DRAG_ELASTIC = 0.4

interface LaunchingTask {
  id: number
  text: string
}

interface PulseInputProps {
  onLaunch?: (title: string, body: string) => void
}

export function PulseInput({ onLaunch }: PulseInputProps = {}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentDraft = useSyncStore((s) => s.currentDraft)
  const setCurrentDraft = useSyncStore((s) => s.setCurrentDraft)

  const [isCollapsing, setIsCollapsing] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [launchingTasks, setLaunchingTasks] = useState<LaunchingTask[]>([])
  const [dragOffsetY, setDragOffsetY] = useState(0)
  const [hasContent, setHasContent] = useState(!!currentDraft.trim())

  const dragStartY = useRef<number | null>(null)
  const isDragging = useRef(false)
  const dragOffsetRef = useRef(0)
  const launchIdCounter = useRef(0)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [])

  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current
    const overlay = overlayRef.current
    if (textarea && overlay) {
      overlay.scrollTop = textarea.scrollTop
    }
  }, [])

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

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [currentDraft, adjustHeight])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value
      debouncedSetDraft(value)
      adjustHeight()
      setHasContent(!!value.trim())
    },
    [debouncedSetDraft, adjustHeight],
  )

  const performLaunch = useCallback(() => {
    const textarea = textareaRef.current
    const text = (textarea?.value ?? currentDraft).trim()
    if (!text) return

    triggerLaunchHaptic()

    const lines = text.split('\n')
    const title = lines[0]
    const body = lines.slice(1).join('\n').trim()

    onLaunch?.(title, body)

    setIsCollapsing(true)
    setShowSuccess(true)

    const launchId = ++launchIdCounter.current
    setLaunchingTasks((prev) => [...prev, { id: launchId, text }])

    if (textarea) {
      textarea.value = ''
    }
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    setCurrentDraft('')
    useSyncStore.setState({ isImportant: false })
    setDragOffsetY(0)
    setHasContent(false)

    requestAnimationFrame(() => {
      setTimeout(() => {
        setIsCollapsing(false)
        setShowSuccess(false)
        adjustHeight()
        textareaRef.current?.focus()
      }, 300)
    })
  }, [currentDraft, setCurrentDraft, adjustHeight, onLaunch])

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
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
      setDragOffsetY(0)
    }
  }, [performLaunch])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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

  const renderOverlay = (text: string) => {
    const lines = text.split('\n')
    const firstLine = lines[0] || ''
    const restLines = lines.slice(1)

    return (
      <>
        <span
          className="pulse-title-line text-hero font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {firstLine || '\u00A0'}
        </span>
        {restLines.map((line, i) => (
          <span
            key={i}
            className="pulse-body-line block"
            style={{
              fontSize: '1rem',
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

  const getDisplayValue = () => {
    return textareaRef.current?.value ?? currentDraft
  }

  return (
    <div
      className="pulse-container relative w-full max-w-[640px] px-4 py-8"
      data-testid="pulse-container"
    >
      {/* Success checkmark flash */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            variants={successFlash}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 16 16"
              fill="var(--color-success)"
              aria-hidden="true"
            >
              <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Drag gesture area */}
      <div
        className="touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        data-testid="pulse-drag-area"
        style={{ position: 'relative' }}
      >
        {/* Styled overlay */}
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
              ? 'transform var(--duration-normal) var(--ease-spring), opacity var(--duration-normal) var(--ease-spring)'
              : dragOffsetY > 0
                ? 'none'
                : 'transform var(--duration-fast) var(--ease-spring)',
          }}
        >
          {renderOverlay(getDisplayValue())}
        </div>

        {/* Actual textarea */}
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
          className="pulse-textarea text-hero"
          style={{
            position: 'relative',
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            lineHeight: '1.3',
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
              ? 'transform var(--duration-normal) var(--ease-spring), opacity var(--duration-normal) var(--ease-spring)'
              : dragOffsetY > 0
                ? 'none'
                : 'transform var(--duration-fast) var(--ease-spring)',
          }}
        />

        {/* Capture zone */}
        {hasContent && !isCollapsing && (
          <div
            className="mt-2 flex items-center justify-between"
            data-testid="capture-zone"
          >
            <p className="text-caption" style={{ color: 'var(--color-text-secondary)' }} data-testid="launch-hint">
              Swipe up or press {typeof navigator !== 'undefined' && navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}+Enter to launch
            </p>
            <PriorityPill />
          </div>
        )}
      </div>
    </div>
  )
}
