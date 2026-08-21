import { useCallback, useEffect, useRef } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'
import { syncRepo } from '../../../services/github/sync-service'
import { useNetworkStatus } from '../../../hooks/useNetworkStatus'

const CAPTURE_DELAY_MS = 2_500
const EDIT_DELAY_MS = 10_000
const MAX_VISIBLE_WAIT_MS = 30_000

export function useAutoSync() {
  const repoSyncMeta = useSyncStore((state) => state.repoSyncMeta)
  const repoAutoSync = useSyncStore((state) => state.repoAutoSync)
  const { isOnline } = useNetworkStatus()
  const timers = useRef(new Map<string, { timer: ReturnType<typeof setTimeout>; scheduleKey: string }>())
  const queuedSince = useRef(new Map<string, number>())
  const previousOnline = useRef(isOnline)

  const runOne = useCallback(async (repoFullName: string, reason: 'capture' | 'debounce' | 'background' | 'repo-switch' | 'reconnect' | 'resume' | 'retry') => {
    const state = useSyncStore.getState()
    const key = repoFullName.toLowerCase()
    if (!navigator.onLine || !state.repoAutoSync[key]) return
    const selected = state.selectedRepo?.fullName.toLowerCase() === key
    state.setRepoSyncMeta(repoFullName, { deliveryState: 'syncing' })
    if (selected) state.setSyncStatus('syncing')

    const result = await syncRepo({
      repoFullName,
      reason,
      branch: state.repoSyncBranches[key],
      skipCi: state.repoSkipCi[key] ?? true,
      maxRetries: 2,
    })
    if (result.status === 'conflict') {
      state.setRepoSyncMeta(repoFullName, { deliveryState: 'needs-attention' })
      if (selected) state.setSyncStatus('conflict', result.error)
    } else if (result.error) {
      const latestState = useSyncStore.getState()
      const retryCount = (latestState.repoSyncMeta[key]?.retryCount ?? 0) + 1
      const retryDelay = Math.min(60_000, 2_000 * 2 ** (retryCount - 1))
      latestState.setRepoSyncMeta(repoFullName, {
        deliveryState: 'needs-attention',
        retryCount,
        nextRetryAt: new Date(Date.now() + retryDelay).toISOString(),
      })
      latestState.setRepoSyncError(repoFullName, result.error, result.errorType ?? 'unknown', result.rawError)
      if (selected) latestState.setSyncStatus('error', result.error, result.errorType, result.rawError)
    } else {
      const latestState = useSyncStore.getState()
      const stillQueued = latestState.repoSyncMeta[key]?.deliveryState === 'queued'
      latestState.setRepoSyncMeta(repoFullName, {
        deliveryState: stillQueued ? 'queued' : 'in-repo',
        retryCount: 0,
        nextRetryAt: null,
      })
      latestState.clearRepoSyncError(repoFullName)
      if (selected) {
        latestState.setSyncStatus('success')
        latestState.updateLastSyncedAt()
      }
      if (!stillQueued) queuedSince.current.delete(key)
    }
  }, [])

  const flushQueued = useCallback((reason: 'background' | 'repo-switch' | 'reconnect' | 'resume') => {
    const state = useSyncStore.getState()
    for (const [repoFullName, meta] of Object.entries(state.repoSyncMeta)) {
      if (
        (meta.deliveryState === 'queued' || (meta.deliveryState === 'needs-attention' && meta.nextRetryAt)) &&
        state.repoAutoSync[repoFullName]
      ) {
        const active = timers.current.get(repoFullName)
        if (active) clearTimeout(active.timer)
        timers.current.delete(repoFullName)
        void runOne(repoFullName, reason)
      }
    }
  }, [runOne])

  useEffect(() => {
    useSyncStore.setState((state) => {
      let changed = false
      const nextMeta = Object.fromEntries(
        Object.entries(state.repoSyncMeta).map(([key, meta]) => {
          if (meta.deliveryState !== 'syncing') return [key, meta]
          changed = true
          return [key, { ...meta, deliveryState: 'queued' as const }]
        }),
      )
      return changed ? { repoSyncMeta: nextMeta } : state
    })
  }, [])

  useEffect(() => {
    if (!isOnline) return
    for (const [repoFullName, active] of timers.current) {
      const meta = repoSyncMeta[repoFullName]
      const shouldRemain = Boolean(
        repoAutoSync[repoFullName] &&
        (meta?.deliveryState === 'queued' || (meta?.deliveryState === 'needs-attention' && meta.nextRetryAt)),
      )
      if (!shouldRemain) {
        clearTimeout(active.timer)
        timers.current.delete(repoFullName)
        queuedSince.current.delete(repoFullName)
      }
    }
    for (const [repoFullName, meta] of Object.entries(repoSyncMeta)) {
      if (!repoAutoSync[repoFullName]) continue
      const isQueued = meta.deliveryState === 'queued'
      const isRetry = meta.deliveryState === 'needs-attention' && Boolean(meta.nextRetryAt)
      if (!isQueued && !isRetry) continue
      const current = timers.current.get(repoFullName)
      const scheduleKey = isRetry ? `retry:${meta.nextRetryAt}` : `mutation:${meta.lastMutationAt}`
      if (current?.scheduleKey === scheduleKey) continue
      if (current) clearTimeout(current.timer)
      let delay: number
      if (isRetry) {
        delay = Math.max(0, new Date(meta.nextRetryAt as string).getTime() - Date.now())
      } else {
        if (!queuedSince.current.has(repoFullName)) queuedSince.current.set(repoFullName, Date.now())
        const age = Date.now() - (queuedSince.current.get(repoFullName) ?? Date.now())
        const normalDelay = meta.lastMutationKind === 'capture' ? CAPTURE_DELAY_MS : EDIT_DELAY_MS
        delay = Math.min(normalDelay, Math.max(0, MAX_VISIBLE_WAIT_MS - age))
      }
      const timer = setTimeout(() => {
        timers.current.delete(repoFullName)
        void runOne(repoFullName, isRetry ? 'retry' : meta.lastMutationKind === 'capture' ? 'capture' : 'debounce')
      }, delay)
      timers.current.set(repoFullName, { timer, scheduleKey })
    }
  }, [repoSyncMeta, repoAutoSync, isOnline, runOne])

  useEffect(() => {
    if (!previousOnline.current && isOnline) flushQueued('reconnect')
    previousOnline.current = isOnline
  }, [isOnline, flushQueued])

  useEffect(() => {
    const activeTimers = timers.current
    const onVisibility = () => flushQueued(document.visibilityState === 'hidden' ? 'background' : 'resume')
    const onPageHide = () => flushQueued('background')
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onPageHide)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onPageHide)
      for (const { timer } of activeTimers.values()) clearTimeout(timer)
      activeTimers.clear()
    }
  }, [flushQueued])

  const selectedRepo = useSyncStore((state) => state.selectedRepo?.fullName ?? null)
  const previousRepo = useRef(selectedRepo)
  useEffect(() => {
    if (previousRepo.current && previousRepo.current !== selectedRepo) flushQueued('repo-switch')
    previousRepo.current = selectedRepo
  }, [selectedRepo, flushQueued])
}
