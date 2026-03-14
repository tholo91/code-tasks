import { useSyncStore } from '../../../stores/useSyncStore'
import { getScopedFileName } from '../../../services/github/sync-service'

/**
 * Non-intrusive status bar that shows sync state.
 * Displays at the bottom of the screen as a subtle indicator.
 * Also shows the user-scoped target file name for visual confirmation.
 */
export function SyncStatusBar() {
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
  const syncError = useSyncStore((s) => s.syncError)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const user = useSyncStore((s) => s.user)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  const targetFileName = user ? getScopedFileName(user.login) : null

  if (syncEngineStatus === 'idle' && !lastSyncedAt) {
    return null
  }

  const statusConfig = {
    idle: {
      text: lastSyncedAt
        ? `Last synced: ${new Date(lastSyncedAt).toLocaleTimeString()}`
        : '',
      bgColor: 'rgba(110, 118, 129, 0.1)',
      textColor: '#8b949e',
      borderColor: 'transparent',
    },
    syncing: {
      text: 'Syncing to GitHub...',
      bgColor: 'rgba(56, 139, 253, 0.1)',
      textColor: '#388bfd',
      borderColor: 'rgba(56, 139, 253, 0.3)',
    },
    success: {
      text: 'Synced successfully',
      bgColor: 'rgba(63, 185, 80, 0.1)',
      textColor: '#3fb950',
      borderColor: 'rgba(63, 185, 80, 0.3)',
    },
    error: {
      text: syncError ?? 'Sync failed — will retry automatically',
      bgColor: 'rgba(248, 81, 73, 0.1)',
      textColor: '#f85149',
      borderColor: 'rgba(248, 81, 73, 0.3)',
    },
  }

  const config = statusConfig[syncEngineStatus]

  return (
    <div
      className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs"
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
        borderTop: `1px solid ${config.borderColor}`,
      }}
      data-testid="sync-status-bar"
      role="status"
      aria-live="polite"
    >
      {syncEngineStatus === 'syncing' && (
        <svg
          className="animate-spin"
          width="12"
          height="12"
          viewBox="0 0 16 16"
          fill="currentColor"
        >
          <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
        </svg>
      )}
      {syncEngineStatus === 'success' && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
        </svg>
      )}
      {syncEngineStatus === 'error' && (
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575ZM8 5a.75.75 0 0 0-.75.75v2.5a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8 5Zm1 6a1 1 0 1 0-2 0 1 1 0 0 0 2 0Z" />
        </svg>
      )}
      <span>{config.text}</span>
      {targetFileName && selectedRepo && (
        <span
          className="ml-2 opacity-70"
          data-testid="target-file-indicator"
          title={`Syncing to ${targetFileName} in ${selectedRepo.fullName}`}
        >
          &rarr; {targetFileName}
        </span>
      )}
    </div>
  )
}
