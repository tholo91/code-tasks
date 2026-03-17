import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TRANSITION_SPRING } from '../../../config/motion'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { TaskCheckbox } from '../../../components/ui/TaskCheckbox'
import type { Task } from '../../../types/task'

interface TaskDetailSheetProps {
  task: Task
  onClose: () => void
  onUpdate: (taskId: string, updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>>) => void
  onToggleComplete: (taskId: string) => void
  onMoveToRepo: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

export function TaskDetailSheet({ task, onClose, onUpdate, onToggleComplete, onMoveToRepo, onDelete }: TaskDetailSheetProps) {
  const [title, setTitle] = useState(task.title)
  const [body, setBody] = useState(task.body)
  const [isImportant, setIsImportant] = useState(task.isImportant)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestValuesRef = useRef({ title: task.title, body: task.body, isImportant: task.isImportant })

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
    <BottomSheet
      onClose={handleClose}
      backdropBlur
      ariaLabel="Task details"
      testId="task-detail-sheet"
    >
        {/* Content with max height + scroll */}
        <div className="max-h-[85vh] overflow-y-auto flex flex-col gap-4">
          {/* Title row with checkbox */}
          <div className="flex items-center gap-3">
            {/* Completion checkbox */}
            <TaskCheckbox
              isCompleted={task.isCompleted}
              onChange={handleToggleComplete}
              size="md"
              testId="task-detail-checkbox"
            />

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
            {/* Sync status */}
            <div className="flex items-center justify-between">
              <span className="text-label uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                Sync Status
              </span>
              <span
                className={`badge ${task.syncStatus === 'pending' ? 'badge-amber' : 'badge-green'}`}
                data-testid="task-detail-sync-status"
              >
                {task.syncStatus === 'pending' ? 'Pending' : 'Synced'}
              </span>
            </div>

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
                if (window.confirm('Delete this task?')) {
                  onClose()
                  // Small delay to let sheet dismiss before triggering delete flow
                  setTimeout(() => onDelete(task.id), 150)
                }
              }}
              className="btn-ghost w-full text-body font-medium mt-2 py-3"
              style={{ color: 'var(--color-danger)' }}
              aria-label="Delete task"
              data-testid="detail-delete-button"
            >
              Delete Task
            </button>
          )}
        </div>
    </BottomSheet>
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
