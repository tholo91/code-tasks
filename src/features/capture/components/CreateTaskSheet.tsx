import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { PriorityPill } from './PriorityPill'
import { triggerLaunchHaptic } from '../../../services/native/haptic-service'

interface CreateTaskSheetProps {
  onClose: () => void
  onTaskCreated: (taskId: string) => void
}

const SHEET_SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 }

export function CreateTaskSheet({ onClose, onTaskCreated }: CreateTaskSheetProps) {
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
  const submitRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const addTask = useSyncStore((s) => s.addTask)
  const prefersReducedMotion = useReducedMotion()

  const sheetTransition = prefersReducedMotion ? { duration: 0.15 } : SHEET_SPRING

  const handleClose = useCallback(() => {
    useSyncStore.setState({ isImportant: false })
    setTitle('')
    setNotes('')
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    const trimmedTitle = title.trim()
    if (!trimmedTitle) return

    const newTask = addTask(trimmedTitle, notes.trim())
    triggerLaunchHaptic()
    onTaskCreated(newTask.id)

    useSyncStore.setState({ isImportant: false })
    setTitle('')
    setNotes('')
    onClose()
  }, [title, notes, addTask, onTaskCreated, onClose])

  // Auto-focus title on mount
  useEffect(() => {
    // Small delay to allow animation to start
    const timer = setTimeout(() => {
      titleRef.current?.focus()
    }, 50)
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

  // Auto-expand notes textarea
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNotes(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0.15 } : undefined}
      className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Create new task"
      data-testid="create-task-sheet"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <motion.div
        ref={sheetRef}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={sheetTransition}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 300) {
            handleClose()
          }
        }}
        className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Handle bar */}
        <div
          className="mx-auto mb-5 mt-1 h-1.5 w-12 rounded-full"
          style={{ backgroundColor: 'rgba(139, 148, 158, 0.4)' }}
        />

        {/* Form */}
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div>
            <label
              htmlFor="create-task-title"
              className="text-label mb-1 block"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Title
            </label>
            <input
              ref={titleRef}
              id="create-task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                  e.preventDefault()
                  notesRef.current?.focus()
                }
              }}
              placeholder="What's on your mind?"
              className="input-field w-full"
              data-testid="create-task-title"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="create-task-notes"
              className="text-label mb-1 block"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Notes
            </label>
            <textarea
              ref={notesRef}
              id="create-task-notes"
              value={notes}
              onChange={handleNotesChange}
              placeholder="Add details..."
              rows={3}
              className="input-field w-full resize-none"
              data-testid="create-task-notes"
            />
          </div>

          {/* Priority + Submit row */}
          <div className="flex items-center gap-3">
            <PriorityPill />
            <button
              ref={submitRef}
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="btn-primary flex-1"
              data-testid="create-task-submit"
            >
              Add Task
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
