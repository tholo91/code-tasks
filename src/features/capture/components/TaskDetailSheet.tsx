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
  const [showDetails, setShowDetails] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
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
            className="flex-1 resize-none overflow-hidden font-semibold"
            style={{
              ...borderlessStyle,
              fontSize: '1rem',
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
            className="w-full resize-none overflow-hidden font-normal"
            style={{
              ...borderlessStyle,
              fontSize: '1rem',
              lineHeight: '1.5',
              minHeight: '2.5rem',
              opacity: task.isCompleted ? 0.6 : 1,
            }}
            aria-label="Task notes"
            data-testid="task-detail-notes"
          />
        </div>

        {/* Divider */}
        <div className="mt-4 mb-1" style={{ borderTop: '1px solid var(--color-border)', opacity: 0.5 }} />

        {/* Action buttons row — always visible */}
        <div className="flex items-center gap-2 py-1">
          {/* Move to repo */}
          <motion.button
            type="button"
            onClick={() => onMoveToRepo(task.id)}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-body font-medium"
            style={{
              color: 'var(--color-text-secondary)',
              background: 'var(--color-surface-hover)',
              border: 'none',
              cursor: 'pointer',
              minHeight: 40,
            }}
            aria-label="Move task to repository"
            data-testid="task-detail-move-repo"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-shrink-0">
              <path d="M2.5 8h10" />
              <path d="M9 4.5L12.5 8 9 11.5" />
            </svg>
            Move
          </motion.button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Delete button with inline confirmation */}
          {onDelete && !confirmingDelete && (
            <motion.button
              type="button"
              onClick={() => {
                setConfirmingDelete(true)
                triggerSelectionHaptic()
              }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-body font-medium"
              style={{
                color: 'var(--color-danger)',
                background: 'var(--color-danger-subtle)',
                border: 'none',
                cursor: 'pointer',
                minHeight: 40,
              }}
              aria-label="Delete task"
              data-testid="detail-delete-button"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M11 1.75V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.6A1.75 1.75 0 005.405 15h5.19a1.75 1.75 0 001.741-1.575l.66-6.6a.75.75 0 00-1.492-.15l-.66 6.6a.25.25 0 01-.249.225h-5.19a.25.25 0 01-.249-.225l-.66-6.6zM6.5 1.75V3h3V1.75a.25.25 0 00-.25-.25h-2.5a.25.25 0 00-.25.25z" />
              </svg>
              Delete
            </motion.button>
          )}
          {onDelete && confirmingDelete && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="px-3 py-2 rounded-lg text-body font-medium"
                style={{
                  color: 'var(--color-text-secondary)',
                  background: 'var(--color-surface-hover)',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: 40,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  setTimeout(() => onDelete(task.id), 150)
                }}
                className="px-4 py-2 rounded-lg text-body font-semibold"
                style={{
                  color: 'var(--color-on-accent)',
                  background: 'var(--color-danger)',
                  border: 'none',
                  cursor: 'pointer',
                  minHeight: 40,
                }}
                data-testid="detail-delete-confirm"
              >
                Confirm delete
              </button>
            </div>
          )}
        </div>

        {/* Details disclosure — metadata */}
        <div className="mt-1">
          <motion.button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            whileTap={{ opacity: 0.6 }}
            className="flex items-center gap-2 py-2 text-body font-medium w-full"
            style={{ color: 'var(--color-text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
            data-testid="task-detail-more-toggle"
          >
            <motion.svg
              animate={{ rotate: showDetails ? 90 : 0 }}
              transition={TRANSITION_FAST}
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M6.22 3.22a.75.75 0 011.06 0l4.25 4.25a.75.75 0 010 1.06l-4.25 4.25a.75.75 0 01-1.06-1.06L9.94 8 6.22 4.28a.75.75 0 010-1.06z" />
            </motion.svg>
            Details
          </motion.button>

          <AnimatePresence initial={false}>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div
                  className="flex flex-col gap-3 py-3 px-3 rounded-lg mb-1"
                  style={{ background: 'rgba(255, 255, 255, 0.02)' }}
                >
                  {/* Repository */}
                  <DetailRow label="Repository" data-testid="task-detail-repo">
                    <span className="text-body font-mono" style={{ color: 'var(--color-text-primary)', fontSize: '0.8125rem' }}>
                      {task.repoFullName}
                    </span>
                  </DetailRow>

                  {/* Sync status */}
                  <DetailRow label="Sync">
                    <span
                      className={`badge ${task.syncStatus === 'pending' ? 'badge-amber' : 'badge-green'}`}
                      data-testid="task-detail-sync-status"
                    >
                      {task.syncStatus === 'pending' ? 'Pending' : 'Synced'}
                    </span>
                  </DetailRow>

                  {/* Created */}
                  <DetailRow label="Created">
                    <span className="text-body" style={{ color: 'var(--color-text-primary)' }} data-testid="task-detail-created">
                      {formatRelativeTime(task.createdAt)}
                    </span>
                  </DetailRow>

                  {/* Updated */}
                  {task.updatedAt && (
                    <DetailRow label="Updated">
                      <span className="text-body" style={{ color: 'var(--color-text-primary)' }} data-testid="task-detail-updated">
                        {formatRelativeTime(task.updatedAt)}
                      </span>
                    </DetailRow>
                  )}

                  {/* Completed */}
                  {task.isCompleted && task.completedAt && (
                    <DetailRow label="Completed">
                      <span className="text-body" style={{ color: 'var(--color-success)' }} data-testid="task-detail-completed">
                        {formatRelativeTime(task.completedAt)}
                      </span>
                    </DetailRow>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </BottomSheet>
  )
}

function DetailRow({ label, children, ...rest }: { label: string; children: React.ReactNode; [key: string]: unknown }) {
  return (
    <div className="flex items-center justify-between" {...rest}>
      <span className="text-body" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      {children}
    </div>
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
