import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { DraggableTaskCard } from './DraggableTaskCard'
import type { Task } from '../../../types/task'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  Reorder: {
    Item: ({ children, value, onClick, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, style, ...props }: any) => (
      <div
        data-testid={props['data-testid']}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={style}
        data-value={value?.id}
      >
        {children}
      </div>
    ),
  },
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, animate, whileTap, transition, ...props }: any) => <button {...props}>{children}</button>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  },
  useDragControls: () => ({
    start: vi.fn(),
  }),
}))

// Mock haptic service
vi.mock('../../../services/native/haptic-service', () => ({
  triggerSelectionHaptic: vi.fn().mockResolvedValue(undefined),
}))

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-uuid-1',
    username: 'testuser',
    repoFullName: 'testuser/repo',
    title: 'Fix login bug',
    body: 'The login button is broken on mobile',
    isImportant: false,
    isCompleted: false,
    completedAt: null,
    updatedAt: null,
    order: 0,
    createdAt: '2026-03-14T10:00:00Z',
    syncStatus: 'pending',
    githubIssueNumber: null,
    ...overrides,
  }
}

describe('DraggableTaskCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders TaskCard inside wrapper', () => {
    render(
      <DraggableTaskCard
        task={createTask()}
        onTap={vi.fn()}
        onComplete={vi.fn()}
        isNewest={false}
      />
    )
    expect(screen.getByTestId('task-card-test-uuid-1')).toBeInTheDocument()
    expect(screen.getByTestId('reorder-item-test-uuid-1')).toBeInTheDocument()
  })

  it('quick tap (< 250ms) calls onTap, not drag', () => {
    const onTap = vi.fn()
    render(
      <DraggableTaskCard
        task={createTask()}
        onTap={onTap}
        onComplete={vi.fn()}
        isNewest={false}
      />
    )

    const item = screen.getByTestId('reorder-item-test-uuid-1')

    // Pointer down + quick pointer up (< 250ms) + click
    fireEvent.pointerDown(item, { clientX: 0, clientY: 0 })
    act(() => { vi.advanceTimersByTime(100) }) // Only 100ms, not 250
    fireEvent.pointerUp(item)
    fireEvent.click(item)

    expect(onTap).toHaveBeenCalledWith('test-uuid-1')
  })

  it('long-press (250ms+) triggers drag start callback', () => {
    const onDragStart = vi.fn()
    render(
      <DraggableTaskCard
        task={createTask()}
        onTap={vi.fn()}
        onComplete={vi.fn()}
        isNewest={false}
        onDragStart={onDragStart}
      />
    )

    const item = screen.getByTestId('reorder-item-test-uuid-1')

    // Pointer down and hold for 250ms+ without moving
    fireEvent.pointerDown(item, { clientX: 0, clientY: 0 })
    act(() => { vi.advanceTimersByTime(260) })

    // Drag should have started after long-press threshold
    expect(onDragStart).toHaveBeenCalled()
  })

  it('checkbox tap does not trigger drag or onTap', () => {
    const onTap = vi.fn()
    const onComplete = vi.fn()
    render(
      <DraggableTaskCard
        task={createTask()}
        onTap={onTap}
        onComplete={onComplete}
        isNewest={false}
      />
    )

    // Click the checkbox — has role="checkbox" and stopPropagation
    const checkbox = screen.getByTestId('task-checkbox-test-uuid-1')
    fireEvent.pointerDown(checkbox, { clientX: 0, clientY: 0 })
    act(() => { vi.advanceTimersByTime(300) })
    fireEvent.pointerUp(checkbox)

    // DraggableTaskCard's handlePointerDown checks for [role="checkbox"] and returns early
    // so no drag should have started
    expect(onTap).not.toHaveBeenCalled()
  })

  it('applies dimmed opacity when isDimmed is true', () => {
    render(
      <DraggableTaskCard
        task={createTask()}
        onTap={vi.fn()}
        onComplete={vi.fn()}
        isNewest={false}
        isDimmed={true}
      />
    )

    const item = screen.getByTestId('reorder-item-test-uuid-1')
    expect(item.style.opacity).toBe('0.5')
  })

  it('has full opacity when isDimmed is false', () => {
    render(
      <DraggableTaskCard
        task={createTask()}
        onTap={vi.fn()}
        onComplete={vi.fn()}
        isNewest={false}
        isDimmed={false}
      />
    )

    const item = screen.getByTestId('reorder-item-test-uuid-1')
    expect(item.style.opacity).toBe('1')
  })
})
