import type { Task } from '../../../types/task'

interface TaskCardProps {
  task: Task
}

/**
 * Displays a captured task with visual sync-status indicator.
 * - Pending (local-only): Amber sync icon (#d29922)
 * - Synced (on GitHub): Green check icon (#3fb950)
 */
export function TaskCard({ task }: TaskCardProps) {
  const isPending = task.syncStatus === 'pending'

  return (
    <div
      className="flex items-start gap-3 rounded-lg px-4 py-3"
      style={{
        backgroundColor: 'var(--color-canvas-subtle, #161b22)',
        borderLeft: `3px solid ${isPending ? '#d29922' : '#3fb950'}`,
      }}
      data-testid={`task-card-${task.id}`}
    >
      {/* Sync status icon */}
      <div
        className="mt-0.5 flex-shrink-0"
        title={isPending ? 'Sync pending' : 'Synced to GitHub'}
        data-testid={`sync-icon-${task.id}`}
      >
        {isPending ? (
          // octicon-sync style: amber rotating arrows
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="#d29922"
            aria-label="Sync pending"
            role="img"
          >
            <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
          </svg>
        ) : (
          // octicon-check style: green checkmark
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="#3fb950"
            aria-label="Synced to GitHub"
            role="img"
          >
            <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
          </svg>
        )}
      </div>

      {/* Task content */}
      <div className="min-w-0 flex-1">
        <p
          className="text-sm font-medium leading-snug"
          style={{ color: 'var(--color-text-primary, #c9d1d9)' }}
          data-testid={`task-title-${task.id}`}
        >
          {task.title}
        </p>
        {task.body && (
          <p
            className="mt-0.5 text-xs leading-relaxed"
            style={{ color: 'var(--color-text-secondary, #8b949e)' }}
            data-testid={`task-body-${task.id}`}
          >
            {task.body}
          </p>
        )}
        <div className="mt-1 flex items-center gap-2">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
            style={{
              backgroundColor: isPending
                ? 'rgba(210, 153, 34, 0.15)'
                : 'rgba(63, 185, 80, 0.15)',
              color: isPending ? '#d29922' : '#3fb950',
              border: `1px solid ${isPending ? 'rgba(210, 153, 34, 0.2)' : 'rgba(63, 185, 80, 0.2)'}`,
            }}
            data-testid={`sync-status-${task.id}`}
          >
            {isPending ? 'Pending' : 'Synced'}
          </span>
        </div>
      </div>
    </div>
  )
}
