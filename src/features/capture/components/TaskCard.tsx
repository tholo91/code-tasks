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

export function TaskCard({ task, onTap, onComplete, isNewest = false, className, style }: TaskCardProps) {
  const rootClassName = `cursor-pointer px-4 py-3${className ? ` ${className}` : ''}`

  return (
    <motion.div
      layout
      onClick={() => onTap?.(task.id)}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITION_SPRING}
      className={rootClassName}
      style={{
        backgroundColor: isNewest ? 'rgba(63, 185, 80, 0.08)' : 'transparent',
        borderBottom: '1px solid rgba(48, 54, 61, 0.5)',
        borderRadius: 0,
        transition: 'background-color 0.5s ease',
        ...style,
      }}
      data-testid={`task-card-${task.id}`}
    >
      {/* Title row: checkbox + title + trailing icons */}
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

        {/* Trailing status icons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {task.isImportant && (
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="var(--color-danger)"
              aria-label="Important"
              data-testid={`task-flag-${task.id}`}
            >
              <path d="M3.5 1a.5.5 0 01.5.5v1h8.5a.5.5 0 01.4.8L10.5 6l2.4 2.7a.5.5 0 01-.4.8H4v5a.5.5 0 01-1 0V1.5a.5.5 0 01.5-.5z" />
            </svg>
          )}
          {task.syncStatus === 'pending' && (
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--color-warning)' }}
              title="Sync pending"
              data-testid={`sync-pending-${task.id}`}
            />
          )}
        </div>
      </div>

      {/* Body preview (1-line truncated) */}
      {task.body && (
        <p
          className="mt-0.5 truncate text-caption pl-[30px]"
          style={{
            color: 'var(--color-text-secondary)',
            opacity: task.isCompleted ? 0.5 : 1,
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
          className="text-caption mt-1 truncate pl-[30px]"
          style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}
          data-testid={`task-processed-by-${task.id}`}
        >
          Processed by {task.processedBy}
        </p>
      )}
    </motion.div>
  )
}
