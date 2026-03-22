import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { triggerLaunchHaptic, triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { BottomSheet } from '../../../components/ui/BottomSheet'

interface CreateTaskSheetProps {
  onClose: () => void
  onTaskCreated: (taskId: string) => void
}

export function CreateTaskSheet({ onClose, onTaskCreated }: CreateTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [isImportant, setIsImportant] = useState(false)
  const [captured, setCaptured] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const addTask = useSyncStore((s) => s.addTask)

  // "Captured!" indicator auto-reset
  useEffect(() => {
    if (!captured) return
    const timer = setTimeout(() => setCaptured(false), 800)
    return () => clearTimeout(timer)
  }, [captured])

  const handleClose = useCallback(() => {
    useSyncStore.setState({ isImportant: false })
    setTitle('')
    setNotes('')
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    useSyncStore.setState({ isImportant })
    const newTask = addTask(trimmedTitle, notes.trim())
    triggerLaunchHaptic()
    onTaskCreated(newTask.id)

    // Reset form for next capture — do NOT close
    setIsImportant(false)
    useSyncStore.setState({ isImportant: false })
    setTitle('')
    setNotes('')
    setCaptured(true)

    // Reset textarea heights
    if (titleRef.current) {
      titleRef.current.style.height = ''
    }
    if (notesRef.current) {
      notesRef.current.style.height = ''
    }

    // Re-focus title after brief delay for animation
    setTimeout(() => titleRef.current?.focus(), 100)
  }, [title, notes, isImportant, addTask, onTaskCreated])

  // Auto-focus title on mount — triggers on-screen keyboard
  useEffect(() => {
    // Short delay for sheet animation + iOS keyboard reliability
    const timer = setTimeout(() => {
      if (titleRef.current) {
        titleRef.current.focus({ preventScroll: true })
        // On some mobile browsers, explicitly setting selection range helps trigger keyboard
        titleRef.current.setSelectionRange(
          titleRef.current.value.length,
          titleRef.current.value.length
        )
      }
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard shortcut: Cmd/Ctrl+Enter to submit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSubmit()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleSubmit])

  // iOS visualViewport keyboard fix
  useEffect(() => {
    const viewport = window.visualViewport
    if (!viewport) return

    const handleViewportResize = () => {
      const offsetFromBottom = window.innerHeight - viewport.height - viewport.offsetTop
      if (sheetRef.current) {
        sheetRef.current.style.paddingBottom = `${Math.max(0, offsetFromBottom)}px`
      }
    }

    viewport.addEventListener('resize', handleViewportResize)
    return () => viewport.removeEventListener('resize', handleViewportResize)
  }, [])

  // Auto-expand title textarea
  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // Auto-expand notes textarea
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  // Shared borderless input style
  const borderlessStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    color: 'var(--color-text-primary)',
  }

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={handleClose}
      backdropBlur
      ariaLabel="Create new task"
      testId="create-task-sheet"
    >

        {/* "Captured!" indicator */}
        <AnimatePresence>
          {captured && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2 mb-2"
              data-testid="captured-indicator"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--color-success)' }}>
                <path d="M2.5 8L6.5 12L13.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>Captured!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <div className="flex flex-col gap-2">
          {/* Title row with priority flag */}
          <div className="flex items-start gap-2">
            <textarea
              ref={titleRef}
              id="create-task-title"
              value={title}
              onChange={handleTitleChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  notesRef.current?.focus()
                }
              }}
              placeholder="Task name"
              rows={1}
              className="flex-1 resize-none overflow-hidden font-semibold"
              style={{
                ...borderlessStyle,
                fontSize: '1rem',
                lineHeight: '1.4',
                minHeight: '2rem',
              }}
              aria-label="Task title"
              data-testid="create-task-title"
            />
            <motion.button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsImportant(!isImportant)
                triggerSelectionHaptic()
              }}
              whileTap={{ scale: 0.85 }}
              className="flex-shrink-0 flex items-center justify-center pt-0.5"
              style={{
                width: 36,
                height: 36,
                color: isImportant ? 'var(--color-danger)' : 'var(--color-text-secondary)',
                opacity: isImportant ? 1 : 0.3,
              }}
              aria-label="Toggle important"
              aria-pressed={isImportant}
              data-testid="create-task-priority-flag"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M3.5 1a.5.5 0 01.5.5v1h8.5a.5.5 0 01.4.8L10.5 6l2.4 2.7a.5.5 0 01-.4.8H4v5a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5z" />
              </svg>
            </motion.button>
          </div>

          {/* Notes — borderless */}
          <textarea
            ref={notesRef}
            id="create-task-notes"
            value={notes}
            onChange={handleNotesChange}
            placeholder="Notes or context (optional)"
            rows={2}
            className="w-full resize-none overflow-hidden font-normal"
            style={{
              ...borderlessStyle,
              fontSize: '1rem',
              lineHeight: '1.5',
              minHeight: '2rem',
            }}
            aria-label="Task notes"
            data-testid="create-task-notes"
          />

          {/* Action row: Cancel + Capture */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="text-body font-medium px-2 py-2"
              style={{ color: 'var(--color-text-secondary)' }}
              data-testid="create-task-cancel"
            >
              Cancel
            </button>
            <button
              ref={submitRef}
              type="button"
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn-primary flex-1"
              data-testid="create-task-submit"
            >
              Capture
            </button>
          </div>
        </div>
    </BottomSheet>
  )
}
