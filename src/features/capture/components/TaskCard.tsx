import { motion } from 'framer-motion'
import { TRANSITION_SPRING } from '../../../config/motion'
import type { Task } from '../../../types/task'

interface TaskCardProps {
  task: Task
  isExpanded?: boolean
  onToggle?: () => void
  isNewest?: boolean
}

/**
 * Task list item with sync status dot, expandable detail, and press feedback.
 */
export function TaskCard({ task, isExpanded = false, onToggle, isNewest = false }: TaskCardProps) {
  const isPending = task.syncStatus === 'pending'

  const timeAgo = formatTimeAgo(task.createdAt)

  return (
    <motion.div
      layout
      onClick={onToggle}
      whileTap={{ scale: 0.98 }}
      transition={TRANSITION_SPRING}
      className="cursor-pointer rounded-lg px-4 py-3"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: `1px solid ${isNewest ? 'var(--color-success)' : 'var(--color-border)'}`,
        transition: 'border-color 0.5s ease',
      }}
      data-testid={`task-card-${task.id}`}
    >
      {/* Title row: dot + title + badge */}
      <div className="flex items-center gap-2">
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
          style={{ color: 'var(--color-text-primary)' }}
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

      {/* Body preview (collapsed) */}
      {task.body && !isExpanded && (
        <p
          className="mt-1 truncate text-label pl-4"
          style={{ color: 'var(--color-text-secondary)' }}
          data-testid={`task-body-${task.id}`}
        >
          {task.body}
        </p>
      )}

      {/* Expanded detail */}
      {isExpanded && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 pl-4"
        >
          {task.body && (
            <p
              className="text-label whitespace-pre-wrap"
              style={{ color: 'var(--color-text-secondary)' }}
              data-testid={`task-body-${task.id}`}
            >
              {task.body}
            </p>
          )}
          <p
            className="mt-2 text-caption"
            style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}
          >
            Created {timeAgo}
          </p>
        </motion.div>
      )}
    </motion.div>
  )
}

function formatTimeAgo(dateString: string): string {
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
