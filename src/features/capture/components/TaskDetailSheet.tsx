import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TRANSITION_FAST } from '../../../config/motion'
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
  const [showMore, setShowMore] = useState(false)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  const notesRef = useRef<HTMLTextAreaElement>(null)
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

  // Set initial textarea heights on mount (no auto-focus — detail view is for reading first)
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = 'auto'
      titleRef.current.style.height = `${titleRef.current.scrollHeight}px`
    }
    if (notesRef.current) {
      notesRef.current.style.height = 'auto'
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`
    }
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

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setTitle(value)
    latestValuesRef.current.title = value
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
    debouncedSave()
  }

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setBody(value)
    latestValuesRef.current.body = value
    if (notesRef.current) {
      notesRef.current.style.height = 'auto'
      notesRef.current.style.height = `${notesRef.current.scrollHeight}px`
    }
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
      onClose={handleClose}
      backdropBlur
      ariaLabel="Task details"
      testId="task-detail-sheet"
    >
      <div className="max-h-[85vh] overflow-y-auto flex flex-col gap-1">
        {/* Title row: checkbox + title + flag */}
        <div className="flex items-start gap-3">
          <div className="pt-1.5 flex-shrink-0">
            <TaskCheckbox
              isCompleted={task.isCompleted}
              onChange={handleToggleComplete}
              size="md"
              testId="task-detail-checkbox"
            />
          </div>

          <textarea
            ref={titleRef}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
                e.preventDefault()
                notesRef.current?.focus()
              }
            }}
            rows={1}
            className="flex-1 resize-none overflow-hidden text-body font-semibold"
            style={{
              ...borderlessStyle,
              lineHeight: '1.4',
              textDecoration: task.isCompleted ? 'line-through' : 'none',
              opacity: task.isCompleted ? 0.6 : 1,
            }}
            placeholder="Task name"
            aria-label="Task title"
            data-testid="task-detail-title"
          />

          <motion.button
            type="button"
            onClick={handlePriorityToggle}
            onMouseDown={(e) => e.preventDefault()}
            whileTap={{ scale: 0.85 }}
            className="flex-shrink-0 flex items-center justify-center pt-1"
            style={{
              width: 36,
              height: 36,
              color: isImportant ? 'var(--color-danger)' : 'var(--color-text-secondary)',
              opacity: isImportant ? 1 : 0.3,
            }}
            aria-label="Toggle important"
            aria-pressed={isImportant}
            data-testid="task-detail-priority-flag"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M3.5 1a.5.5 0 01.5.5v1h8.5a.5.5 0 01.4.8L10.5 6l2.4 2.7a.5.5 0 01-.4.8H4v5a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5z" />
            </svg>
          </motion.button>
        </div>

        {/* Description — borderless, no label */}
        <div className="pl-9">
          <textarea
            ref={notesRef}
            value={body}
            onChange={handleBodyChange}
            placeholder="Notes or context (optional)"
            rows={2}
            className="w-full resize-none overflow-hidden text-body font-normal"
            style={{
              ...borderlessStyle,
              lineHeight: '1.5',
              minHeight: '2.5rem',
              opacity: task.isCompleted ? 0.6 : 1,
            }}
            aria-label="Task notes"
            data-testid="task-detail-notes"
          />
        </div>

        {/* More toggle */}
        <div className="pl-9 pt-3">
          <motion.button
            type="button"
            onClick={() => setShowMore(!showMore)}
            whileTap={{ opacity: 0.5 }}
            className="flex items-center gap-1.5 text-body font-semibold py-1 transition-opacity"
            style={{ color: 'var(--color-text-secondary)' }}
            data-testid="task-detail-more-toggle"
          >
            <motion.svg
              animate={{ rotate: showMore ? 180 : 0 }}
              transition={TRANSITION_FAST}
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M4.427 7.427l3.396 3.396a.25.25 0 00.354 0l3.396-3.396A.25.25 0 0011.396 7H4.604a.25.25 0 00-.177.427z" />
            </motion.svg>
            {showMore ? 'Less' : 'More'}
          </motion.button>
        </div>

        {/* Collapsible details section */}
        <AnimatePresence initial={false}>
          {showMore && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2.5 pt-3 pl-9">
                {/* Sync status */}
                <div className="flex items-center justify-between">
                  <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                    Sync
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
                  <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                    Created
                  </span>
                  <span className="text-label" style={{ color: 'var(--color-text-primary)' }} data-testid="task-detail-created">
                    {formatRelativeTime(task.createdAt)}
                  </span>
                </div>

                {/* Updated */}
                {task.updatedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                      Updated
                    </span>
                    <span className="text-label" style={{ color: 'var(--color-text-primary)' }} data-testid="task-detail-updated">
                      {formatRelativeTime(task.updatedAt)}
                    </span>
                  </div>
                )}

                {/* Completed */}
                {task.isCompleted && task.completedAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                      Completed
                    </span>
                    <span className="text-label" style={{ color: 'var(--color-success)' }} data-testid="task-detail-completed">
                      {formatRelativeTime(task.completedAt)}
                    </span>
                  </div>
                )}

                {/* Repository */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                    {task.repoFullName}
                  </span>
                  <button
                    type="button"
                    onClick={() => onMoveToRepo(task.id)}
                    className="text-label font-medium"
                    style={{ color: 'var(--color-accent)' }}
                    aria-label="Move task to repository"
                    data-testid="task-detail-move-repo"
                  >
                    Move to…
                  </button>
                </div>

                {/* Delete */}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('Delete this task?')) {
                        onClose()
                        setTimeout(() => onDelete(task.id), 150)
                      }
                    }}
                    className="self-start text-label font-medium mt-2 py-1"
                    style={{ color: 'var(--color-danger)' }}
                    aria-label="Delete task"
                    data-testid="detail-delete-button"
                  >
                    Delete task
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
