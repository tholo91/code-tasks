import { useSyncStore } from '../../stores/useSyncStore'

/**
 * Sync status indicator for the app header.
 * Shows "All caught up" (green check) when no pending tasks,
 * or "N items pending" (amber sync icon) when tasks await sync.
 */
export function SyncHeaderStatus() {
  const tasks = useSyncStore((s) => s.tasks)
  const user = useSyncStore((s) => s.user)
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)

  const pendingSyncCount = tasks.filter(
    (t) => t.syncStatus === 'pending' && t.username === (user?.login ?? ''),
  ).length

  const isSyncing = syncEngineStatus === 'syncing'

  if (isSyncing) {
    return (
      <span
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: 'rgba(56, 139, 253, 0.15)',
          color: '#388bfd',
          border: '1px solid rgba(56, 139, 253, 0.2)',
        }}
        role="status"
        aria-live="polite"
        data-testid="sync-header-status"
      >
        <svg className="animate-spin" width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
        </svg>
        Syncing...
      </span>
    )
  }

  if (pendingSyncCount > 0) {
    return (
      <span
        className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
        style={{
          backgroundColor: 'rgba(210, 153, 34, 0.15)',
          color: '#d29922',
          border: '1px solid rgba(210, 153, 34, 0.2)',
        }}
        role="status"
        aria-live="polite"
        data-testid="sync-header-status"
      >
        {/* octicon-sync (amber) */}
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
        </svg>
        {pendingSyncCount} {pendingSyncCount === 1 ? 'item' : 'items'} pending
      </span>
    )
  }

  return (
    <span
      className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: 'rgba(63, 185, 80, 0.15)',
        color: '#3fb950',
        border: '1px solid rgba(63, 185, 80, 0.2)',
      }}
      role="status"
      aria-live="polite"
      data-testid="sync-header-status"
    >
      {/* octicon-check (green) */}
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
      </svg>
      All caught up
    </span>
  )
}
