import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Manages auto-compact timing for status pills.
 * When `active` is true, the pill starts expanded then compacts after `delay` ms.
 * Calling `expand()` re-expands and restarts the timer.
 * When `active` is false, always returns expanded (for states that don't compact).
 * When `active` transitions from false → true, resets to expanded and restarts timer.
 */
export function useAutoCompact(active: boolean, delay = 5000) {
  const [isExpanded, setIsExpanded] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const startTimer = useCallback(() => {
    clearTimer()
    timerRef.current = setTimeout(() => {
      setIsExpanded(false)
    }, delay)
  }, [clearTimer, delay])

  const expand = useCallback(() => {
    setIsExpanded(true)
    if (active) {
      startTimer()
    }
  }, [active, startTimer])

  // When `active` changes, reset to expanded and manage timer
  useEffect(() => {
    if (active) {
      setIsExpanded(true)
      startTimer()
    } else {
      clearTimer()
      setIsExpanded(true)
    }
    return clearTimer
  }, [active, startTimer, clearTimer])

  return { isExpanded, expand }
}
