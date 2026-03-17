import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TRANSITION_SPRING } from '../../../config/motion'
import type { Task } from '../../../types/task'

interface TaskDetailSheetProps {
  task: Task
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>>) => void
  onToggleComplete: (taskId: string) => void
  onMoveToRepo: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

const SHEET_SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 }

export function TaskDetailSheet({ task, onClose, onUpdate, onToggleComplete, onMoveToRepo, onDelete }: TaskDetailSheetProps) {
  const [title, setTitle] = useState(task.title)
  const [body, setBody] = useState(task.body)
  const [isImportant, setIsImportant] = useState(task.isImportant)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValuesRef = useRef({ title: task.title, body: task.body, isImportant: task.isImportant })
  const prefersReducedMotion = useReducedMotion()

  const sheetTransition = prefersReducedMotion ? { duration: 0.15 } : SHEET_SPRING

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      flushSave()
    }, 500)
  }, [onUpdate, task.id])

  const flushSave = useCallback(() => {
    const values = latestValuesRef.current
    const trimmedTitle = values.title.trim()

    const hasTitleChange = trimmedTitle.length > 0 && values.title !== task.title
    const hasBodyChange = values.body !== task.body
    const hasImportantChange = values.isImportant !== task.isImportant

    if (!hasTitleChange && !hasBodyChange && !hasImportantChange) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      return
    }

    const updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>> = {}

    if (hasTitleChange) {
      updates.title = values.title
    }
    if (hasBodyChange) {
      updates.body = values.body
    }
    if (hasImportantChange) {
      updates.isImportant = values.isImportant
    }

    onUpdate(task.id, updates)

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
  }, [onUpdate, task.id, task.title, task.body, task.isImportant])

  // Flush pending save on unmount
  useEffect(() => {
    return () => {
      flushSave()
    }
  }, [flushSave])

  // Auto-focus title on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      titleRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  const handleClose = useCallback(() => {
    flushSave()
    onClose()
  }, [onClose, flushSave])

  // Escape key dismisses sheet
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleClose])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setTitle(value)
    latestValuesRef.current.title = value
    debouncedSave()
  }

  const notesRef = useRef<HTMLTextAreaElement>(null)
  
  // Auto-expand textarea
  useEffect(() => {
    const textarea = notesRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${textarea.scrollHeight}px`
    }
  }, [body])

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setBody(value)
    latestValuesRef.current.body = value
    debouncedSave()
  }

  const handlePriorityToggle = () => {
    const newValue = !isImportant
    setIsImportant(newValue)
    latestValuesRef.current.isImportant = newValue
    onUpdate(task.id, { isImportant: newValue })
    triggerSelectionHaptic()
  }

  const handleToggleComplete = () => {
    onToggleComplete(task.id)
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
      aria-label="Task details"
      data-testid="task-detail-sheet"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={sheetTransition}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 300) handleClose()
        }}
        className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Handle bar */}
        <div
          className="mx-auto mb-4 h-1 w-10 rounded-full"
          style={{ backgroundColor: 'var(--color-border)' }}
        />

        {/* Content with max height + scroll */}
        <div className="max-h-[85vh] overflow-y-auto flex flex-col gap-4">
          {/* Title row with checkbox */}
          <div className="flex items-center gap-3">
            {/* Completion checkbox */}
            <motion.button
              onClick={handleToggleComplete}
              className="flex-shrink-0 flex items-center justify-center"
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: `2px solid ${task.isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
                backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
              }}
              animate={{
                backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
                borderColor: task.isCompleted ? 'var(--color-success)' : 'var(--color-border)',
              }}
              transition={TRANSITION_SPRING}
              whileTap={{ scale: 0.85 }}
              role="checkbox"
              aria-checked={task.isCompleted}
              aria-label={task.isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
              data-testid="task-detail-checkbox"
            >
              {task.isCompleted && (
                <motion.svg
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={TRANSITION_SPRING}
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                >
                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                </motion.svg>
              )}
            </motion.button>

            {/* Title input */}
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="input-field w-full text-title font-semibold"
              style={{
                textDecoration: task.isCompleted ? 'line-through' : 'none',
                opacity: task.isCompleted ? 0.7 : 1,
              }}
              aria-label="Task title"
              data-testid="task-detail-title"
            />
          </div>

          {/* Notes/Description */}
          <div>
            <label
              htmlFor="task-detail-notes-input"
              className="text-label mb-1 block uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Notes
            </label>
            <textarea
              id="task-detail-notes-input"
              ref={notesRef}
              value={body}
              onChange={handleBodyChange}
              placeholder="Add notes..."
              className="input-field w-full min-h-[120px] overflow-hidden resize-none"
              aria-label="Task notes"
              data-testid="task-detail-notes"
            />
          </div>

          {/* Priority toggle */}
          <div className="flex items-center justify-between" data-testid="task-detail-priority">
            <span
              className="text-label uppercase tracking-wider"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Priority
            </span>
            <motion.button
              type="button"
              onClick={handlePriorityToggle}
              animate={{
                backgroundColor: isImportant ? 'var(--color-accent)' : 'transparent',
                borderColor: isImportant ? 'var(--color-accent)' : 'var(--color-border)',
                color: isImportant ? 'var(--color-canvas)' : 'var(--color-text-secondary)',
              }}
              whileTap={{ scale: 0.95 }}
              transition={TRANSITION_SPRING}
              className="text-label px-3 py-1.5 rounded-full border font-semibold"
              aria-pressed={isImportant}
              aria-label="Toggle important priority"
              data-testid="task-detail-priority-pill"
            >
              Important
            </motion.button>
          </div>

          {/* Metadata section */}
          <div className="flex flex-col gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            {/* Created */}
            <div className="flex items-center justify-between">
              <span className="text-label uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                Created
              </span>
              <span className="text-body" style={{ color: 'var(--color-text-primary)' }} data-testid="task-detail-created">
                {formatRelativeTime(task.createdAt)}
              </span>
            </div>

            {/* Updated */}
            {task.updatedAt && (
              <div className="flex items-center justify-between">
                <span className="text-label uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Updated
                </span>
                <span className="text-body" style={{ color: 'var(--color-text-primary)' }} data-testid="task-detail-updated">
                  {formatRelativeTime(task.updatedAt)}
                </span>
              </div>
            )}

            {/* Completed */}
            {task.isCompleted && task.completedAt && (
              <div className="flex items-center justify-between">
                <span className="text-label uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Completed
                </span>
                <span className="text-body" style={{ color: 'var(--color-success)' }} data-testid="task-detail-completed">
                  {formatRelativeTime(task.completedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Repository + Move */}
          <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <span className="text-label uppercase tracking-wider block" style={{ color: 'var(--color-text-secondary)' }}>
                Repository
              </span>
              <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                {task.repoFullName}
              </span>
            </div>
            <button
              onClick={() => onMoveToRepo(task.id)}
              className="btn-ghost text-label"
              aria-label="Move task to repository"
              data-testid="task-detail-move-repo"
            >
              Move to...
            </button>
          </div>

          {/* Delete button */}
          {onDelete && (
            <button
              onClick={() => {
                onClose()
                // Small delay to let sheet dismiss before triggering delete flow
                setTimeout(() => onDelete(task.id), 150)
              }}
              className="btn-ghost w-full text-body font-medium mt-2 py-3"
              style={{ color: '#f85149' }}
              aria-label="Delete task"
              data-testid="detail-delete-button"
            >
              Delete Task
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now()
  const then = new Date(dateString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}
