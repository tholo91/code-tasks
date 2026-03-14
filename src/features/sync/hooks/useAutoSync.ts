import { useEffect, useRef } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'
import { syncPendingTasks } from '../../../services/github/sync-service'
import { useNetworkStatus } from '../../../hooks/useNetworkStatus'

/**
 * Hook for automated sync triggers.
 * - Triggers on app launch (if authenticated and repo selected)
 * - Triggers when the app comes back online
 * - Triggers when pending tasks are added while online
 */
export function useAutoSync() {
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const user = useSyncStore((s) => s.user)
  const tasks = useSyncStore((s) => s.tasks)
  const isSyncing = useSyncStore((s) => s.isSyncing)
  const setSyncStatus = useSyncStore((s) => s.setSyncStatus)
  const updateLastSyncedAt = useSyncStore((s) => s.updateLastSyncedAt)

  const { isOnline } = useNetworkStatus()

  const pendingSyncCount = tasks.filter(
    (t) => t.syncStatus === 'pending' && t.username === (user?.login ?? ''),
  ).length

  const lastOnline = useRef(isOnline)

  useEffect(() => {
    const handleSync = async () => {
      if (!isAuthenticated || !selectedRepo || !isOnline || isSyncing || pendingSyncCount === 0) {
        return
      }

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
        const message = err instanceof Error ? err.message : 'Auto-sync failed'
        setSyncStatus('error', message)
      }
    }

    // Trigger on:
    // 1. Initial mount (launch)
    // 2. Network status change (offline -> online)
    // 3. Pending task count change (new task added)
    const justWentOnline = !lastOnline.current && isOnline
    const hasNewPendingTasks = pendingSyncCount > 0

    if (justWentOnline || hasNewPendingTasks) {
      handleSync()
    }

    lastOnline.current = isOnline
  }, [
    isAuthenticated,
    selectedRepo,
    isOnline,
    pendingSyncCount,
    isSyncing,
    setSyncStatus,
    updateLastSyncedAt,
  ])
}
