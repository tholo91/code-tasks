import { useEffect, useRef } from 'react'
import { useSyncStore } from '../stores/useSyncStore'
import { useNetworkStatus } from './useNetworkStatus'
import { fetchRemoteTasksForRepo } from '../services/github/sync-service'
import { computeImportDiff, isAllZero } from '../utils/task-diff'
import type { Task } from '../types/task'

const DEBOUNCE_MS = 30_000
const POST_PUSH_SKIP_MS = 5_000

/**
 * Listens for app visibility changes and checks whether the remote GitHub file
 * has changed since the last sync. When a remote change is detected, calls
 * `onRemoteChanges` so the caller can prompt the user to import.
 *
 * Guards against false-positive banners:
 * - Skips check while a sync push is in progress
 * - Skips check within 5s of a successful push (data can't have changed)
 * - Runs content-level diff: if SHA differs but tasks are unchanged, silently updates SHA
 */
export function useRemoteChangeDetection(
  onRemoteChanges: (data: { tasks: Task[]; sha: string | null }) => void,
) {
  const { isOnline } = useNetworkStatus()
  const isOnlineRef = useRef(isOnline)
  const lastCheckRef = useRef<number>(0)
  const lastPushCompletedRef = useRef<number>(0)
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

      // Skip check shortly after a push — the data can't have changed yet
      if (now - lastPushCompletedRef.current < POST_PUSH_SKIP_MS) return

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
      const storeState = useSyncStore.getState()
      const localSha = storeState.repoSyncMeta[repoKey]?.lastSyncedSha ?? null

      if (remoteSha === localSha) return

      // Content-level diff: if SHA changed but tasks are identical, silently update SHA
      const localTasks = storeState.tasks.filter(
        (t) => t.repoFullName.toLowerCase() === repoKey,
      )
      const diff = computeImportDiff(localTasks, result.tasks)

      if (isAllZero(diff)) {
        storeState.setRepoSyncMeta(selectedRepo.fullName, {
          lastSyncedSha: remoteSha,
          lastSyncAt: new Date().toISOString(),
        })
        return
      }

      onRemoteChangesRef.current({ tasks: result.tasks, sha: remoteSha })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return { lastPushCompletedRef }
}
