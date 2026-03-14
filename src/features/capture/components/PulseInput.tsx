import { useRef, useCallback, useEffect } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'

/**
 * "The Pulse" — a focused, borderless, auto-expanding text area
 * for instant thought capture.
 *
 * - AC1: Auto-focused on mount (keyboard active)
 * - AC2: 60 FPS typing performance (minimal re-renders)
 * - AC3: Auto-expanding vertically with 32px vertical padding
 * - AC4: First line styled as title (24px semi-bold), rest as body (16px)
 * - AC5: Instant visual feedback, no layout shift
 * - AC6: Draft stored in useSyncStore for persistence
 */

const DEBOUNCE_MS = 300

export function PulseInput() {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentDraft = useSyncStore((s) => s.currentDraft)
  const setCurrentDraft = useSyncStore((s) => s.setCurrentDraft)

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
    },
    [debouncedSetDraft, adjustHeight],
  )

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
      {/* Styled overlay for visual weight differentiation */}
      <div
        ref={overlayRef}
        className="pulse-overlay"
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '32px',
          left: '16px',
          right: '16px',
          pointerEvents: 'none',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          overflow: 'hidden',
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
        }}
      />
    </div>
  )
}
