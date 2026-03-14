import { useState, useEffect, useCallback } from 'react'

export interface NetworkStatus {
  /** Whether the browser reports online connectivity */
  isOnline: boolean
  /** True when the user just went offline (triggers notification) */
  showOfflineNotification: boolean
  /** Dismiss the offline notification */
  dismissOfflineNotification: () => void
}

/**
 * Tracks browser online/offline status and provides a transient
 * "Offline - Storing Locally" notification when connectivity is lost.
 */
export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [showOfflineNotification, setShowOfflineNotification] = useState(false)

  const dismissOfflineNotification = useCallback(() => {
    setShowOfflineNotification(false)
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineNotification(false)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowOfflineNotification(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline, showOfflineNotification, dismissOfflineNotification }
}
