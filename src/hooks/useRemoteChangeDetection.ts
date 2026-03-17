import { useEffect, useRef } from 'react'
import { useSyncStore, selectPendingSyncCount } from '../stores/useSyncStore'
import { useNetworkStatus } from './useNetworkStatus'
import { fetchRemoteTasksForRepo } from '../services/github/sync-service'
import type { Task } from '../types/task'

const DEBOUNCE_MS = 30_000

/**
 * Listens for app visibility changes and checks whether the remote GitHub file
 * has changed since the last sync. When a remote change is detected and there
 * are no local pending changes, calls `onRemoteChanges` so the caller can
 * prompt the user to import. If local pending changes exist, sets a conflict
 * on repoSyncMeta to trigger the existing SyncConflictSheet.
 */
export function useRemoteChangeDetection(
  onRemoteChanges: (data: { tasks: Task[]; sha: string | null }) => void,
) {
  const { isOnline } = useNetworkStatus()
  const isOnlineRef = useRef(isOnline)
  const lastCheckRef = useRef<number>(0)
  const onRemoteChangesRef = useRef(onRemoteChanges)

  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  useEffect(() => {
    onRemoteChangesRef.current = onRemoteChanges
  }, [onRemoteChanges])

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return
      if (!isOnlineRef.current) return

      const now = Date.now()
      if (now - lastCheckRef.current < DEBOUNCE_MS) return
      lastCheckRef.current = now

      const state = useSyncStore.getState()
      const { selectedRepo, user, setRepoSyncMeta } = state
      if (!selectedRepo || !user) return

      const result = await fetchRemoteTasksForRepo(selectedRepo.fullName, user.login)
      if (result.error) {
        lastCheckRef.current = 0 // Allow retry immediately if error occurred
        return
      }

      const remoteSha = result.sha ?? null
      const repoKey = selectedRepo.fullName.toLowerCase()
      const localSha = useSyncStore.getState().repoSyncMeta[repoKey]?.lastSyncedSha ?? null

      if (remoteSha === localSha) return

      const pendingCount = selectPendingSyncCount(useSyncStore.getState())

      if (pendingCount > 0) {
        setRepoSyncMeta(selectedRepo.fullName, {
          conflict: {
            remoteSha,
            detectedAt: new Date().toISOString(),
          },
        })
      } else {
        onRemoteChangesRef.current({ tasks: result.tasks, sha: remoteSha })
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
