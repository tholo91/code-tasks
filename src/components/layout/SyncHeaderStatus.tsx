import { useSyncStore, selectPendingSyncCount } from '../../stores/useSyncStore'
import { formatTimeAgo } from '../../utils/format-time'

/**
 * Sync status indicator badge for the app header.
 */
export function SyncHeaderStatus() {
  const pendingSyncCount = useSyncStore(selectPendingSyncCount)
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
  const syncError = useSyncStore((s) => s.syncError)
  const syncErrorType = useSyncStore((s) => s.syncErrorType)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)

  const isSyncing = syncEngineStatus === 'syncing'
  const isConflict = syncEngineStatus === 'conflict'
  const isError = syncEngineStatus === 'error'

  if (isSyncing) {
    return (
      <span
        className="badge badge-blue"
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

  if (isConflict) {
    return (
      <span
        className="badge badge-red"
        role="status"
        aria-live="polite"
        data-testid="sync-header-status"
        title={syncError ?? 'Remote file changed since last sync'}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M7.001 2.002a1 1 0 0 1 1.998 0l.35 6.998a1 1 0 0 1-1.999 0l-.35-6.998ZM8 13a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 13Z" />
        </svg>
        Conflict
      </span>
    )
  }

  if (isError) {
    const errorLabel = syncErrorType === 'branch-protection' ? 'Sync blocked' : 'Sync failed'
    return (
      <span
        className="badge badge-red"
        role="status"
        aria-live="polite"
        data-testid="sync-header-status"
        title={syncError ?? 'Sync failed'}
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M7.001 2.002a1 1 0 0 1 1.998 0l.35 6.998a1 1 0 0 1-1.999 0l-.35-6.998ZM8 13a1.25 1.25 0 1 1 0-2.5A1.25 1.25 0 0 1 8 13Z" />
        </svg>
        {errorLabel}
      </span>
    )
  }

  if (pendingSyncCount > 0) {
    return (
      <span
        className="badge badge-amber"
        role="status"
        aria-live="polite"
        data-testid="sync-header-status"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
        </svg>
        {pendingSyncCount} {pendingSyncCount === 1 ? 'item' : 'items'} pending
      </span>
    )
  }

  const timeAgo = lastSyncedAt ? formatTimeAgo(lastSyncedAt) : null

  return (
    <span
      className="badge badge-green"
      role="status"
      aria-live="polite"
      data-testid="sync-header-status"
    >
      <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
      </svg>
      All caught up{timeAgo ? ` · ${timeAgo}` : ''}
    </span>
  )
}
