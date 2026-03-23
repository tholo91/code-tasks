import { useCallback, useEffect, useRef, useState } from 'react'

export type NotificationType =
  | 'sync-result'
  | 'import-feedback'
  | 'task-moved'
  | 'offline'
  | 'pull-refresh'

export interface NotificationEntry {
  type: NotificationType
  message: string
}

const DEDUP_WINDOW_MS = 30 * 60 * 1000 // 30 minutes
const CLUSTER_DELAY_MS = 800
const AUTO_DISMISS_MS = 3000

/**
 * Unified notification hook that deduplicates, clusters, and auto-dismisses
 * informational toasts. Replaces the three separate toast state variables
 * (syncResultMessage, toastMessage, pullToRefreshResult) in App.tsx.
 */
export function useNotificationDedup() {
  const [activeNotification, setActiveNotification] =
    useState<NotificationEntry | null>(null)

  // Dedup registry: hash → last shown timestamp
  const dedupRegistry = useRef<Map<string, number>>(new Map())

  // Clustering buffer
  const clusterBuffer = useRef<NotificationEntry[]>([])
  const clusterTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-dismiss timer
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (clusterTimer.current) clearTimeout(clusterTimer.current)
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  const dedupKey = (type: NotificationType, message: string) =>
    `${type}|${message}`

  const isDuplicate = (type: NotificationType, message: string): boolean => {
    const key = dedupKey(type, message)
    const lastShown = dedupRegistry.current.get(key)
    if (lastShown == null) return false
    return Date.now() - lastShown < DEDUP_WINDOW_MS
  }

  const recordShown = (type: NotificationType, message: string) => {
    const now = Date.now()
    dedupRegistry.current.set(dedupKey(type, message), now)

    // Lazy purge: remove entries older than dedup window
    for (const [key, timestamp] of dedupRegistry.current) {
      if (now - timestamp >= DEDUP_WINDOW_MS) {
        dedupRegistry.current.delete(key)
      }
    }
  }

  const mergeBuffer = (buffer: NotificationEntry[]): NotificationEntry => {
    if (buffer.length === 1) return buffer[0]

    // Same type → comma-join messages
    const allSameType = buffer.every((n) => n.type === buffer[0].type)
    if (allSameType) {
      return {
        type: buffer[0].type,
        message: buffer.map((n) => n.message).join(', '),
      }
    }

    // Mixed types → newline-join
    return {
      type: buffer[0].type,
      message: buffer.map((n) => n.message).join('\n'),
    }
  }

  const flushBuffer = useCallback(() => {
    const buffer = clusterBuffer.current
    if (buffer.length === 0) return

    const merged = mergeBuffer(buffer)
    clusterBuffer.current = []

    recordShown(merged.type, merged.message)
    setActiveNotification(merged)

    // Start auto-dismiss timer
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(() => {
      setActiveNotification(null)
    }, AUTO_DISMISS_MS)
  }, [])

  const showNotification = useCallback(
    (type: NotificationType, message: string) => {
      if (isDuplicate(type, message)) return

      clusterBuffer.current.push({ type, message })

      // Reset cluster timer
      if (clusterTimer.current) clearTimeout(clusterTimer.current)
      clusterTimer.current = setTimeout(flushBuffer, CLUSTER_DELAY_MS)
    },
    [flushBuffer],
  )

  const dismissNotification = useCallback(() => {
    setActiveNotification(null)
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
  }, [])

  return {
    activeNotification,
    showNotification,
    dismissNotification,
  }
}
