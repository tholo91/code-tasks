import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskCard } from './TaskCard'
import type { Task } from '../../../types/task'

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

describe('TaskCard', () => {
  it('renders task title', () => {
    render(<TaskCard task={createTask()} />)
    expect(screen.getByTestId('task-title-test-uuid-1')).toHaveTextContent('Fix login bug')
  })

  it('renders task body preview when present', () => {
    render(<TaskCard task={createTask()} />)
    expect(screen.getByTestId('task-body-test-uuid-1')).toHaveTextContent(
      'The login button is broken on mobile',
    )
  })

  it('does not render body when empty', () => {
    render(<TaskCard task={createTask({ body: '' })} />)
    expect(screen.queryByTestId('task-body-test-uuid-1')).not.toBeInTheDocument()
  })

  it('shows pending sync dot when syncStatus is pending', () => {
    render(<TaskCard task={createTask({ syncStatus: 'pending' })} />)
    const dot = screen.getByTestId('sync-pending-test-uuid-1')
    expect(dot).toBeInTheDocument()
    expect(dot.title).toBe('Sync pending')
  })

  it('does not show sync indicator when synced', () => {
    render(
      <TaskCard
        task={createTask({ syncStatus: 'synced', githubIssueNumber: 42 })}
      />,
    )
    expect(screen.queryByTestId('sync-pending-test-uuid-1')).not.toBeInTheDocument()
  })

  it('renders checkbox with correct data-testid', () => {
    render(<TaskCard task={createTask()} />)
    expect(screen.getByTestId('task-checkbox-test-uuid-1')).toBeInTheDocument()
  })

  it('calls onComplete with taskId when checkbox is clicked', async () => {
    const user = userEvent.setup()
    const onComplete = vi.fn()
    render(<TaskCard task={createTask()} onComplete={onComplete} />)

    await user.click(screen.getByTestId('task-checkbox-test-uuid-1'))
    expect(onComplete).toHaveBeenCalledWith('test-uuid-1')
  })

  it('shows strikethrough title for completed task', () => {
    render(<TaskCard task={createTask({ isCompleted: true, completedAt: '2026-03-14T12:00:00Z' })} />)
    const title = screen.getByTestId('task-title-test-uuid-1')
    expect(title.style.textDecoration).toBe('line-through')
  })

  it('clicking card body calls onTap with taskId', async () => {
    const user = userEvent.setup()
    const onTap = vi.fn()
    render(<TaskCard task={createTask()} onTap={onTap} />)

    await user.click(screen.getByTestId('task-card-test-uuid-1'))
    expect(onTap).toHaveBeenCalledWith('test-uuid-1')
  })

  it('checkbox click does NOT call onTap', async () => {
    const user = userEvent.setup()
    const onTap = vi.fn()
    const onComplete = vi.fn()
    render(<TaskCard task={createTask()} onTap={onTap} onComplete={onComplete} />)

    await user.click(screen.getByTestId('task-checkbox-test-uuid-1'))
    expect(onComplete).toHaveBeenCalled()
    expect(onTap).not.toHaveBeenCalled()
  })

  it('shows flag icon when task.isImportant is true', () => {
    render(<TaskCard task={createTask({ isImportant: true })} />)
    expect(screen.getByTestId('task-flag-test-uuid-1')).toBeInTheDocument()
  })

  it('does not show flag icon when task.isImportant is false', () => {
    render(<TaskCard task={createTask({ isImportant: false })} />)
    expect(screen.queryByTestId('task-flag-test-uuid-1')).not.toBeInTheDocument()
  })

  it('shows flag icon even when isNewest is true', () => {
    render(<TaskCard task={createTask({ isImportant: true })} isNewest={true} />)
    expect(screen.getByTestId('task-flag-test-uuid-1')).toBeInTheDocument()
  })

  it('body preview uses text-caption class', () => {
    render(<TaskCard task={createTask()} />)
    const body = screen.getByTestId('task-body-test-uuid-1')
    expect(body.className).toContain('text-caption')
  })

  it('body preview has reduced opacity when completed', () => {
    render(<TaskCard task={createTask({ isCompleted: true, completedAt: '2026-03-14T12:00:00Z' })} />)
    const body = screen.getByTestId('task-body-test-uuid-1')
    expect(body.style.opacity).toBe('0.5')
  })

  it('renders "Processed by Claude" label when task.processedBy is set', () => {
    render(<TaskCard task={createTask({ processedBy: 'Claude' })} />)
    expect(screen.getByTestId('task-processed-by-test-uuid-1')).toHaveTextContent('Processed by Claude')
  })

  it('does NOT render processedBy label when processedBy is null', () => {
    render(<TaskCard task={createTask({ processedBy: null })} />)
    expect(screen.queryByTestId('task-processed-by-test-uuid-1')).not.toBeInTheDocument()
  })
})
