import { useState, useRef, useCallback } from 'react'

interface UsePullToRefreshConfig {
  onRefresh: () => Promise<void>
  threshold?: number
  disabled?: boolean
  cooldownMs?: number
}

interface UsePullToRefreshReturn {
  pullDistance: number
  isRefreshing: boolean
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchMove: (e: React.TouchEvent) => void
    onTouchEnd: () => void
  }
}

const DEFAULT_THRESHOLD = 80
const DEFAULT_COOLDOWN_MS = 15_000
const MAX_PULL_DISTANCE = 120
const DAMPING_FACTOR = 0.5
const ENGAGE_THRESHOLD = 10

export function usePullToRefresh({
  onRefresh,
  threshold = DEFAULT_THRESHOLD,
  disabled = false,
  cooldownMs = DEFAULT_COOLDOWN_MS,
}: UsePullToRefreshConfig): UsePullToRefreshReturn {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startYRef = useRef<number | null>(null)
  const lastRefreshAtRef = useRef<number>(0)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return

      // Only activate when at the top of the page
      const scrollY = window.scrollY ?? document.documentElement.scrollTop
      if (scrollY > 0) return

      startYRef.current = e.touches[0].clientY
    },
    [disabled, isRefreshing],
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return
      if (startYRef.current === null) return

      const scrollY = window.scrollY ?? document.documentElement.scrollTop
      if (scrollY > 0) {
        // User scrolled away from top — cancel the pull gesture
        startYRef.current = null
        setPullDistance(0)
        return
      }

      const delta = e.touches[0].clientY - startYRef.current
      if (delta < 0) return // Only downward pulls

      // Prevent default scrolling only when actively pulling
      if (delta > ENGAGE_THRESHOLD) {
        e.preventDefault()
      }

      setPullDistance(Math.min(delta * DAMPING_FACTOR, MAX_PULL_DISTANCE))
    },
    [disabled, isRefreshing],
  )

  const onTouchEnd = useCallback(() => {
    if (startYRef.current === null) {
      setPullDistance(0)
      return
    }

    const currentPullDistance = pullDistance

    startYRef.current = null
    setPullDistance(0)

    if (disabled || isRefreshing) return
    if (currentPullDistance < threshold) return

    // Cooldown check
    const now = Date.now()
    if (now - lastRefreshAtRef.current < cooldownMs) return

    lastRefreshAtRef.current = now
    setIsRefreshing(true)

    onRefreshRef.current().finally(() => {
      setIsRefreshing(false)
    })
  }, [pullDistance, threshold, disabled, isRefreshing, cooldownMs])

  return {
    pullDistance,
    isRefreshing,
    handlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
  }
}
