import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useSyncStore, selectPendingSyncCount } from '../../stores/useSyncStore'
import { formatTimeAgo } from '../../utils/format-time'
import { SyncStatusIcon } from '../ui/SyncStatusIcon'
import { SyncErrorSheet } from '../../features/sync/components/SyncErrorSheet'
import { useAutoCompact } from '../../hooks/useAutoCompact'
import { TRANSITION_NORMAL, TRANSITION_FAST } from '../../config/motion'

/**
 * Sync status indicator badge for the app header.
 * Auto-compacts to a colored dot after 5 seconds for synced/pending states.
 * Tapping the compact dot re-expands it. Error states stay always extended.
 */
export function SyncHeaderStatus() {
  const errorSheetOpen = useSyncStore((s) => s.errorSheetOpen)
  const setErrorSheetOpen = useSyncStore((s) => s.setErrorSheetOpen)
  const pendingSyncCount = useSyncStore(selectPendingSyncCount)
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
  const syncError = useSyncStore((s) => s.syncError)
  const syncErrorType = useSyncStore((s) => s.syncErrorType)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const prefersReducedMotion = useReducedMotion()

  const shouldAutoCompact =
    syncEngineStatus !== 'error' &&
    syncEngineStatus !== 'conflict' &&
    syncEngineStatus !== 'syncing'

  const { isExpanded, expand } = useAutoCompact(shouldAutoCompact)

  const isSyncing = syncEngineStatus === 'syncing'
  const isConflict = syncEngineStatus === 'conflict'
  const isError = syncEngineStatus === 'error'

  const transition = prefersReducedMotion ? TRANSITION_FAST : TRANSITION_NORMAL

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
    const label = `${pendingSyncCount} ${pendingSyncCount === 1 ? 'item' : 'items'}`

    return (
      <motion.button
        type="button"
        className={`badge badge-amber cursor-pointer ${!isExpanded ? 'badge-compact' : ''}`}
        role={isExpanded ? 'status' : 'button'}
        aria-live={isExpanded ? 'polite' : undefined}
        aria-label={isExpanded ? undefined : `${label} pending – tap to expand`}
        data-testid="sync-header-status"
        onClick={() => !isExpanded && expand()}
        style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
        layout
        transition={transition}
      >
        <SyncStatusIcon state="pending" />
        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.span
              key="pending-label"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
              animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, width: 'auto' }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
              transition={transition}
              style={{ overflow: 'hidden', display: 'inline-block' }}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    )
  }

  if (!lastSyncedAt) return null

  const timeAgo = formatTimeAgo(lastSyncedAt)

  return (
    <motion.button
      type="button"
      className={`badge badge-green cursor-pointer ${!isExpanded ? 'badge-compact' : ''}`}
      role={isExpanded ? 'status' : 'button'}
      aria-live={isExpanded ? 'polite' : undefined}
      aria-label={isExpanded ? undefined : `Synced ${timeAgo} – tap to expand`}
      data-testid="sync-header-status"
      onClick={() => !isExpanded && expand()}
      style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
      layout
      transition={transition}
    >
      <SyncStatusIcon state="synced" size={12} />
      <AnimatePresence mode="wait">
        {isExpanded && (
          <motion.span
            key="synced-label"
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, width: 'auto' }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, width: 0 }}
            transition={transition}
            style={{ overflow: 'hidden', display: 'inline-block' }}
          >
            {timeAgo}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
