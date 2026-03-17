import { motion } from 'framer-motion'
import type { CSSProperties } from 'react'
import { TRANSITION_SPRING } from '../../../config/motion'
import { TaskCheckbox } from '../../../components/ui/TaskCheckbox'
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
        // isNewest (green flash) takes priority; priority indicator suppressed during new-card flash
        borderLeft: task.isImportant && !isNewest ? '3px solid var(--color-danger)' : undefined,
        boxShadow: task.isImportant && !isNewest
          ? '-2px 0 10px var(--color-danger-subtle), var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)'
          : 'var(--shadow-card), inset 0 1px 0 rgba(255,255,255,0.04)',
        transition: 'border-color 0.5s ease',
        ...style,
      }}
      data-testid={`task-card-${task.id}`}
    >
      {/* Title row: checkbox + dot + title + badge */}
      <div className="flex items-center gap-2">
        {/* Completion checkbox */}
        <div className="flex-shrink-0 p-[11px] -m-[11px]">
          <TaskCheckbox
            isCompleted={task.isCompleted}
            onChange={() => onComplete?.(task.id)}
            size="sm"
            testId={`task-checkbox-${task.id}`}
          />
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

      {/* Processed by label */}
      {task.processedBy && (
        <p
          className="text-caption mt-1 truncate pl-[46px]"
          style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}
          data-testid={`task-processed-by-${task.id}`}
        >
          Processed by {task.processedBy}
        </p>
      )}
    </motion.div>
  )
}
