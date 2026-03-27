import { useState } from 'react'
import { useSyncStore, selectPendingSyncCount } from '../../stores/useSyncStore'
import { formatTimeAgo } from '../../utils/format-time'
import { SyncStatusIcon } from '../ui/SyncStatusIcon'
import { SyncErrorSheet } from '../../features/sync/components/SyncErrorSheet'

/**
 * Sync status indicator badge for the app header.
 * Tapping the badge in error state opens a detail sheet.
 */
export function SyncHeaderStatus() {
  const [errorSheetOpen, setErrorSheetOpen] = useState(false)
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
        <SyncStatusIcon state="syncing" />
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
        <SyncStatusIcon state="conflict" />
        Conflict
      </span>
    )
  }

  if (isError) {
    const errorLabel = syncErrorType === 'branch-protection' ? 'Sync blocked' : 'Sync failed'
    return (
      <>
        <button
          type="button"
          onClick={() => setErrorSheetOpen(true)}
          className="badge badge-red cursor-pointer"
          role="status"
          aria-live="polite"
          aria-haspopup="dialog"
          data-testid="sync-header-status"
          title={syncError ?? 'Tap for details'}
        >
          <SyncStatusIcon state="error" />
          {errorLabel}
        </button>
        <SyncErrorSheet open={errorSheetOpen} onClose={() => setErrorSheetOpen(false)} />
      </>
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
        <SyncStatusIcon state="pending" />
        {pendingSyncCount} {pendingSyncCount === 1 ? 'item' : 'items'}
      </span>
    )
  }

  if (!lastSyncedAt) return null

  const timeAgo = formatTimeAgo(lastSyncedAt)

  return (
    <span
      className="badge badge-green"
      role="status"
      aria-live="polite"
      data-testid="sync-header-status"
    >
      <SyncStatusIcon state="synced" size={12} />
      {timeAgo}
    </span>
  )
}
