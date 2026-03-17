import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { UndoToast } from './UndoToast'

describe('UndoToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders with message and Undo button', () => {
    render(<UndoToast message="Task deleted" onUndo={vi.fn()} onExpire={vi.fn()} />)
    expect(screen.getByTestId('undo-toast')).toBeInTheDocument()
    expect(screen.getByText('Task deleted')).toBeInTheDocument()
    expect(screen.getByTestId('undo-button')).toHaveTextContent('Undo')
  })

  it('calls onUndo when Undo button is clicked', () => {
    const onUndo = vi.fn()
    render(<UndoToast message="Task deleted" onUndo={onUndo} onExpire={vi.fn()} />)
    fireEvent.click(screen.getByTestId('undo-button'))
    expect(onUndo).toHaveBeenCalledTimes(1)
  })

  it('calls onExpire after default 5000ms', () => {
    const onExpire = vi.fn()
    render(<UndoToast message="Task deleted" onUndo={vi.fn()} onExpire={onExpire} />)

    expect(onExpire).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('calls onExpire after custom duration', () => {
    const onExpire = vi.fn()
    render(<UndoToast message="Task deleted" onUndo={vi.fn()} onExpire={onExpire} durationMs={3000} />)

    act(() => {
      vi.advanceTimersByTime(2999)
    })
    expect(onExpire).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(onExpire).toHaveBeenCalledTimes(1)
  })

  it('clears timeout on unmount', () => {
    const onExpire = vi.fn()
    const { unmount } = render(
      <UndoToast message="Task deleted" onUndo={vi.fn()} onExpire={onExpire} />
    )

    unmount()

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(onExpire).not.toHaveBeenCalled()
  })

  it('has correct accessibility attributes', () => {
    render(<UndoToast message="Task deleted" onUndo={vi.fn()} onExpire={vi.fn()} />)
    const toast = screen.getByTestId('undo-toast')
    expect(toast.getAttribute('role')).toBe('status')
    expect(toast.getAttribute('aria-live')).toBe('polite')
  })
})
