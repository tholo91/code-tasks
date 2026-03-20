import { useEffect, useRef } from 'react'
import { useSyncStore } from '../stores/useSyncStore'
import { useNetworkStatus } from './useNetworkStatus'
import { fetchRemoteTasksForRepo } from '../services/github/sync-service'
import type { Task } from '../types/task'

const DEBOUNCE_MS = 30_000

/**
 * Listens for app visibility changes and checks whether the remote GitHub file
 * has changed since the last sync. When a remote change is detected, calls
 * `onRemoteChanges` so the caller can prompt the user to import.
 * Additive merge preserves local pending tasks, so there is no conflict path —
 * both pending and clean states show the import banner.
 * Skips the remote check while a sync push is in progress to prevent phantom banners.
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
      const { selectedRepo, user } = state

      // Don't check during active push — could fetch a stale SHA and show a phantom banner
      if (state.syncEngineStatus === 'syncing') return

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

      // Always notify — additive merge preserves local pending tasks safely
      onRemoteChangesRef.current({ tasks: result.tasks, sha: remoteSha })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])
}
