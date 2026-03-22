import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePullToRefresh } from './usePullToRefresh'

function createTouchEvent(clientY: number, scrollTop = 0): React.TouchEvent {
  return {
    touches: [{ clientY }],
    preventDefault: vi.fn(),
    currentTarget: { scrollTop },
  } as unknown as React.TouchEvent
}

describe('usePullToRefresh', () => {
  let onRefresh: ReturnType<typeof vi.fn>
  let resolveRefresh: () => void

  beforeEach(() => {
    vi.restoreAllMocks()

    onRefresh = vi.fn(() => new Promise<void>((resolve) => {
      resolveRefresh = resolve
    }))
  })

  it('fires onRefresh when pull exceeds threshold and touch ends', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80 }),
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      // Pull 200px down → 200 * 0.5 = 100px > 80px threshold
      result.current.handlers.onTouchMove(createTouchEvent(200))
    })

    expect(result.current.pullDistance).toBeGreaterThanOrEqual(80)

    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('does NOT fire when pull is below threshold', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80 }),
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      // Pull 100px → 100 * 0.5 = 50px < 80px threshold
      result.current.handlers.onTouchMove(createTouchEvent(100))
    })
    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does NOT fire when disabled is true', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80, disabled: true }),
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(200))
    })
    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(result.current.pullDistance).toBe(0)
  })

  it('does NOT fire within 15-second cooldown window', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80, cooldownMs: 15_000 }),
    )

    // First pull — should fire
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(200))
    })
    act(() => {
      result.current.handlers.onTouchEnd()
    })
    expect(onRefresh).toHaveBeenCalledOnce()

    // Resolve the first refresh so isRefreshing goes back to false
    act(() => {
      resolveRefresh()
    })

    // Second pull immediately — should NOT fire (cooldown)
    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(200))
    })
    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(onRefresh).toHaveBeenCalledOnce() // Still only once
  })

  it('isRefreshing is true while promise is pending', async () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80 }),
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(200))
    })
    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(result.current.isRefreshing).toBe(true)

    await act(async () => {
      resolveRefresh()
    })

    expect(result.current.isRefreshing).toBe(false)
  })

  it('pullDistance resets to 0 on touchend', () => {
    const { result } = renderHook(() =>
      usePullToRefresh({ onRefresh, threshold: 80 }),
    )

    act(() => {
      result.current.handlers.onTouchStart(createTouchEvent(0))
    })
    act(() => {
      result.current.handlers.onTouchMove(createTouchEvent(200))
    })

    expect(result.current.pullDistance).toBeGreaterThan(0)

    act(() => {
      result.current.handlers.onTouchEnd()
    })

    expect(result.current.pullDistance).toBe(0)
  })
})
