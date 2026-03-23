import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useNotificationDedup } from './useNotificationDedup'

describe('useNotificationDedup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows a notification after cluster delay', () => {
    const { result } = renderHook(() => useNotificationDedup())

    act(() => {
      result.current.showNotification('sync-result', 'Synced to owner/repo')
    })

    // Not shown yet (within cluster window)
    expect(result.current.activeNotification).toBeNull()

    // After cluster delay
    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.activeNotification).toEqual({
      type: 'sync-result',
      message: 'Synced to owner/repo',
    })
  })

  it('auto-dismisses after 3 seconds', () => {
    const { result } = renderHook(() => useNotificationDedup())

    act(() => {
      result.current.showNotification('sync-result', 'Synced')
    })

    act(() => {
      vi.advanceTimersByTime(800) // cluster flush
    })

    expect(result.current.activeNotification).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(3000) // auto-dismiss
    })

    expect(result.current.activeNotification).toBeNull()
  })

  it('deduplicates identical notifications within 30 minutes', () => {
    const { result } = renderHook(() => useNotificationDedup())

    // First notification
    act(() => {
      result.current.showNotification('sync-result', 'Synced to owner/repo')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(result.current.activeNotification).not.toBeNull()

    // Dismiss and try same notification again
    act(() => {
      result.current.dismissNotification()
    })
    act(() => {
      result.current.showNotification('sync-result', 'Synced to owner/repo')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })

    // Should be suppressed
    expect(result.current.activeNotification).toBeNull()
  })

  it('allows same notification after 30 minutes', () => {
    const { result } = renderHook(() => useNotificationDedup())

    // First notification
    act(() => {
      result.current.showNotification('sync-result', 'Synced')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    expect(result.current.activeNotification).not.toBeNull()

    // Dismiss and advance past dedup window
    act(() => {
      result.current.dismissNotification()
    })
    act(() => {
      vi.advanceTimersByTime(30 * 60 * 1000 + 1)
    })

    // Same notification should show again
    act(() => {
      result.current.showNotification('sync-result', 'Synced')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.activeNotification).toEqual({
      type: 'sync-result',
      message: 'Synced',
    })
  })

  it('does not suppress different types within dedup window', () => {
    const { result } = renderHook(() => useNotificationDedup())

    act(() => {
      result.current.showNotification('sync-result', 'Done')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })
    act(() => {
      result.current.dismissNotification()
    })

    // Different type, same message
    act(() => {
      result.current.showNotification('import-feedback', 'Done')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.activeNotification).toEqual({
      type: 'import-feedback',
      message: 'Done',
    })
  })

  it('clusters multiple notifications within 800ms', () => {
    const { result } = renderHook(() => useNotificationDedup())

    act(() => {
      result.current.showNotification('import-feedback', '2 tasks completed')
    })

    // 400ms later — within cluster window
    act(() => {
      vi.advanceTimersByTime(400)
    })

    act(() => {
      result.current.showNotification('import-feedback', '1 new from remote')
    })

    // Still buffered
    expect(result.current.activeNotification).toBeNull()

    // After cluster delay from last notification
    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.activeNotification).toEqual({
      type: 'import-feedback',
      message: '2 tasks completed, 1 new from remote',
    })
  })

  it('dismisses notification manually', () => {
    const { result } = renderHook(() => useNotificationDedup())

    act(() => {
      result.current.showNotification('task-moved', 'Moved to repo')
    })
    act(() => {
      vi.advanceTimersByTime(800)
    })

    expect(result.current.activeNotification).not.toBeNull()

    act(() => {
      result.current.dismissNotification()
    })

    expect(result.current.activeNotification).toBeNull()
  })
})
