import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { TRANSITION_SPRING } from '../../../config/motion'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import type { Task } from '../../../types/task'

interface TaskCardProps {
  task: Task
  onTap?: (taskId: string) => void
  onComplete?: (taskId: string) => void
  isNewest?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * Task list item with sync status dot, body preview, and press feedback.
 * Tapping the card opens the detail sheet. Tapping the checkbox toggles completion.
 */
export function TaskCard({ task, onTap, onComplete, isNewest = false, className, style }: TaskCardProps) {
  const isPending = task.syncStatus === 'pending'
  const rootClassName = `cursor-pointer rounded-lg px-4 py-3${className ? ` ${className}` : ''}`

  return (
    <motion.div
      layout
      onClick={() => onTap?.(task.id)}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITION_SPRING}
      className={rootClassName}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${isNewest ? 'var(--color-success)' : 'var(--color-border)'}`,
        transition: 'border-color 0.5s ease',
        ...style,
      }}
      data-testid={`task-card-${task.id}`}
    >
      {/* Title row: checkbox + dot + title + badge */}
      <div className="flex items-center gap-2">
        {/* Completion checkbox */}
        <div className="flex-shrink-0 p-[11px] -m-[11px]">
          <motion.button
            onClick={(e) => {
              e.stopPropagation()
              onComplete?.(task.id)
              triggerSelectionHaptic()
            }}
            className="flex items-center justify-center"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: `2px solid ${task.isCompleted ? 'var(--color-success)' : 'var(--color-border)'}`,
              backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
            }}
            animate={{
              scale: 1,
              backgroundColor: task.isCompleted ? 'var(--color-success)' : 'transparent',
              borderColor: task.isCompleted ? 'var(--color-success)' : 'var(--color-border)',
            }}
            transition={TRANSITION_SPRING}
            whileTap={{ scale: 0.85 }}
            role="checkbox"
            aria-checked={task.isCompleted}
            aria-label={task.isCompleted ? 'Mark task as incomplete' : 'Mark task as complete'}
            data-testid={`task-checkbox-${task.id}`}
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
        </div>

        {/* Sync status dot */}
        <span
          className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
          style={{ backgroundColor: isPending ? 'var(--color-warning)' : 'var(--color-success)' }}
          title={isPending ? 'Sync pending' : 'Synced to GitHub'}
          data-testid={`sync-icon-${task.id}`}
        />

        {/* Title */}
        <p
          className="min-w-0 flex-1 truncate text-body font-medium"
          style={{
            color: task.isCompleted ? 'var(--color-text-secondary)' : 'var(--color-text-primary)',
            textDecoration: task.isCompleted ? 'line-through' : 'none',
            opacity: task.isCompleted ? 0.7 : 1,
          }}
          data-testid={`task-title-${task.id}`}
        >
          {task.title}
        </p>

        {/* Status badge */}
        <span
          className={`badge flex-shrink-0 ${isPending ? 'badge-amber' : 'badge-green'}`}
          data-testid={`sync-status-${task.id}`}
        >
          {isPending ? 'Pending' : 'Synced'}
        </span>
      </div>

      {/* Body preview (1-line truncated) */}
      {task.body && (
        <p
          className="mt-1 truncate text-label pl-[46px]"
          style={{
            color: 'var(--color-text-secondary)',
            opacity: task.isCompleted ? 0.7 : 1,
            textDecoration: task.isCompleted ? 'line-through' : 'none',
          }}
          data-testid={`task-body-${task.id}`}
        >
          {task.body}
        </p>
      )}
    </motion.div>
  )
}
