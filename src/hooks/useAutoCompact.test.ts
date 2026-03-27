import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAutoCompact } from './useAutoCompact'

describe('useAutoCompact', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts expanded when active', () => {
    const { result } = renderHook(() => useAutoCompact(true))
    expect(result.current.isExpanded).toBe(true)
  })

  it('compacts after 5 seconds when active', () => {
    const { result } = renderHook(() => useAutoCompact(true))
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(result.current.isExpanded).toBe(false)
  })

  it('does not compact before 5 seconds', () => {
    const { result } = renderHook(() => useAutoCompact(true))

    act(() => {
      vi.advanceTimersByTime(4999)
    })

    expect(result.current.isExpanded).toBe(true)
  })

  it('re-expands on expand() call and restarts timer', () => {
    const { result } = renderHook(() => useAutoCompact(true))

    // Wait for compact
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.isExpanded).toBe(false)

    // Expand again
    act(() => {
      result.current.expand()
    })
    expect(result.current.isExpanded).toBe(true)

    // Should compact again after another 5s
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.isExpanded).toBe(false)
  })

  it('always returns expanded when not active', () => {
    const { result } = renderHook(() => useAutoCompact(false))
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(result.current.isExpanded).toBe(true)
  })

  it('resets to expanded when active changes from false to true', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useAutoCompact(active),
      { initialProps: { active: false } }
    )

    expect(result.current.isExpanded).toBe(true)

    // Switch to active
    rerender({ active: true })
    expect(result.current.isExpanded).toBe(true)

    // Should compact after 5s
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.isExpanded).toBe(false)
  })

  it('resets timer when active transitions (state change reset)', () => {
    const { result, rerender } = renderHook(
      ({ active }) => useAutoCompact(active),
      { initialProps: { active: true } }
    )

    // Advance 3s into the timer
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.isExpanded).toBe(true)

    // Simulate state change: active goes false then true
    rerender({ active: false })
    rerender({ active: true })

    // The timer should have reset — original 2s remaining should not compact
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(result.current.isExpanded).toBe(true)

    // Full 5s from the reset should compact
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(result.current.isExpanded).toBe(false)
  })

  it('supports custom delay', () => {
    const { result } = renderHook(() => useAutoCompact(true, 3000))

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(result.current.isExpanded).toBe(true)

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(result.current.isExpanded).toBe(false)
  })

  it('cleans up timer on unmount', () => {
    const { unmount } = renderHook(() => useAutoCompact(true))
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout')

    unmount()

    expect(clearTimeoutSpy).toHaveBeenCalled()
    clearTimeoutSpy.mockRestore()
  })
})
