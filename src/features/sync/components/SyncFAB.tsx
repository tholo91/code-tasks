import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { syncPendingTasks } from '../../../services/github/sync-service'

/**
 * Ghost-Writer FAB — Floating Action Button for manual sync.
 *
 * Appears only when pendingSyncCount > 0 with a "breathe" animation.
 * Tapping triggers syncPendingTasks(), shows a spinner while syncing,
 * and fades out once pendingSyncCount returns to zero.
 */
export function SyncFAB() {
  const tasks = useSyncStore((s) => s.tasks)
  const user = useSyncStore((s) => s.user)
  const [isSyncing, setIsSyncing] = useState(false)

  const pendingSyncCount = tasks.filter(
    (t) => t.syncStatus === 'pending' && t.username === (user?.login ?? ''),
  ).length

  const handleManualSync = useCallback(async () => {
    if (isSyncing) return
    setIsSyncing(true)

    const { setSyncStatus, updateLastSyncedAt } = useSyncStore.getState()
    setSyncStatus('syncing')

    try {
      const result = await syncPendingTasks()
      if (result.error) {
        setSyncStatus('error', result.error)
      } else {
        setSyncStatus('success')
        updateLastSyncedAt()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      setSyncStatus('error', message)
    } finally {
      setIsSyncing(false)
    }
  }, [isSyncing])

  return (
    <AnimatePresence>
      {pendingSyncCount > 0 && (
        <motion.button
          key="sync-fab"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: isSyncing ? 1 : [1, 1.06, 1],
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            scale: isSyncing
              ? { duration: 0.2 }
              : { repeat: Infinity, duration: 2.5, ease: 'easeInOut' },
          }}
          onClick={handleManualSync}
          disabled={isSyncing}
          className="fixed z-40 flex items-center justify-center rounded-full shadow-lg"
          style={{
            bottom: 24,
            right: 24,
            width: 56,
            height: 56,
            backgroundColor: isSyncing
              ? 'rgba(56, 139, 253, 0.85)'
              : 'rgba(56, 139, 253, 1)',
            color: '#ffffff',
            border: 'none',
            cursor: isSyncing ? 'wait' : 'pointer',
          }}
          data-testid="sync-fab"
          aria-label={
            isSyncing
              ? 'Syncing tasks to GitHub'
              : `Sync ${pendingSyncCount} pending task${pendingSyncCount !== 1 ? 's' : ''} to GitHub`
          }
        >
          {isSyncing ? (
            <SyncSpinner />
          ) : (
            <SyncIcon />
          )}
        </motion.button>
      )}
    </AnimatePresence>
  )
}

/** Octicon sync icon (16x16) */
function SyncIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
    </svg>
  )
}

/** Spinning sync icon for in-progress state */
function SyncSpinner() {
  return (
    <svg
      className="animate-spin"
      width="24"
      height="24"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      data-testid="sync-spinner"
    >
      <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
    </svg>
  )
}
