import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  Reorder: {
    Group: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    Item: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  useMotionValue: () => ({ get: () => 0, set: () => {} }),
  animate: vi.fn(),
  useDragControls: () => ({ start: () => {} }),
}))

// Mock DraggableTaskCard
vi.mock('./DraggableTaskCard', () => ({
  DraggableTaskCard: ({ task }: any) => (
    <div data-testid={`draggable-card-${task.id}`}>{task.title}</div>
  ),
}))

// Mock TaskCard
vi.mock('./TaskCard', () => ({
  TaskCard: ({ task }: any) => (
    <div data-testid={`task-card-${task.id}`}>{task.title}</div>
  ),
}))

import { SwipeableTaskCard } from './SwipeableTaskCard'
import type { Task } from '../../../types/task'

const mockTask: Task = {
  id: 'test-1',
  username: 'testuser',
  repoFullName: 'testuser/repo',
  title: 'Test task',
  body: '',
  createdAt: '2026-03-14T10:00:00Z',
  isImportant: false,
  isCompleted: false,
  completedAt: null,
  updatedAt: null,
  order: 0,
  syncStatus: 'synced',
  githubIssueNumber: null,
}

describe('SwipeableTaskCard', () => {
  const defaultProps = {
    task: mockTask,
    onDelete: vi.fn(),
    onMove: vi.fn(),
    isSwipeOpen: false,
    onSwipeOpen: vi.fn(),
    onSwipeClose: vi.fn(),
    showMoveAction: true,
    onTap: vi.fn(),
    onComplete: vi.fn(),
    isNewest: false,
    isDraggable: true,
  }

  it('renders with correct test id', () => {
    render(<SwipeableTaskCard {...defaultProps} />)
    expect(screen.getByTestId('swipeable-card-test-1')).toBeInTheDocument()
  })

  it('renders DraggableTaskCard when isDraggable is true', () => {
    render(<SwipeableTaskCard {...defaultProps} isDraggable={true} />)
    expect(screen.getByTestId('draggable-card-test-1')).toBeInTheDocument()
  })

  it('renders TaskCard when isDraggable is false', () => {
    render(<SwipeableTaskCard {...defaultProps} isDraggable={false} />)
    expect(screen.getByTestId('task-card-test-1')).toBeInTheDocument()
  })

  it('shows delete button in action tray', () => {
    render(<SwipeableTaskCard {...defaultProps} />)
    expect(screen.getByTestId('swipe-delete-test-1')).toBeInTheDocument()
  })

  it('calls onDelete when delete button is tapped', () => {
    const onDelete = vi.fn()
    render(<SwipeableTaskCard {...defaultProps} onDelete={onDelete} />)
    fireEvent.click(screen.getByTestId('swipe-delete-test-1'))
    expect(onDelete).toHaveBeenCalledWith('test-1')
  })

  it('shows move button when showMoveAction is true', () => {
    render(<SwipeableTaskCard {...defaultProps} showMoveAction={true} />)
    expect(screen.getByTestId('swipe-move-test-1')).toBeInTheDocument()
  })

  it('hides move button when showMoveAction is false', () => {
    render(<SwipeableTaskCard {...defaultProps} showMoveAction={false} />)
    expect(screen.queryByTestId('swipe-move-test-1')).not.toBeInTheDocument()
  })

  it('calls onMove when move button is tapped', () => {
    const onMove = vi.fn()
    render(<SwipeableTaskCard {...defaultProps} onMove={onMove} />)
    fireEvent.click(screen.getByTestId('swipe-move-test-1'))
    expect(onMove).toHaveBeenCalledWith('test-1')
  })

  it('has correct aria labels on buttons', () => {
    render(<SwipeableTaskCard {...defaultProps} />)
    expect(screen.getByLabelText('Delete task')).toBeInTheDocument()
    expect(screen.getByLabelText('Move task to another repository')).toBeInTheDocument()
  })
})
