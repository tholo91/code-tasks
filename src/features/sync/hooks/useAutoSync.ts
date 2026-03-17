import { useEffect, useRef } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'
import { useNetworkStatus } from '../../../hooks/useNetworkStatus'

/**
 * Hook for network monitoring and sync status awareness.
 * - Tracks online/offline state transitions
 * - Does NOT auto-push to GitHub — the SyncFAB is the sole sync trigger
 * - Resets sync engine status to idle when coming back online after an error
 */
export function useAutoSync() {
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
  const setSyncStatus = useSyncStore((s) => s.setSyncStatus)

  const { isOnline } = useNetworkStatus()

  const lastOnline = useRef(isOnline)

  useEffect(() => {
    const justWentOnline = !lastOnline.current && isOnline

    // When coming back online, clear network errors so the user can retry via SyncFAB
    if (justWentOnline && syncEngineStatus === 'error') {
      setSyncStatus('idle')
    }

    lastOnline.current = isOnline
  }, [isOnline, syncEngineStatus, setSyncStatus])
}
