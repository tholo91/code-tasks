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

  it('shows "Pending" status badge for pending tasks', () => {
    render(<TaskCard task={createTask({ syncStatus: 'pending' })} />)
    const statusPill = screen.getByTestId('sync-status-test-uuid-1')
    expect(statusPill).toHaveTextContent('Pending')
  })

  it('shows "Synced" status badge for synced tasks', () => {
    render(
      <TaskCard
        task={createTask({ syncStatus: 'synced', githubIssueNumber: 42 })}
      />,
    )
    const statusPill = screen.getByTestId('sync-status-test-uuid-1')
    expect(statusPill).toHaveTextContent('Synced')
  })

  it('shows sync status dot indicator', () => {
    render(<TaskCard task={createTask({ syncStatus: 'pending' })} />)
    const dot = screen.getByTestId('sync-icon-test-uuid-1')
    expect(dot).toBeInTheDocument()
    expect(dot.title).toBe('Sync pending')
  })

  it('shows synced dot indicator for synced tasks', () => {
    render(
      <TaskCard
        task={createTask({ syncStatus: 'synced', githubIssueNumber: 42 })}
      />,
    )
    const dot = screen.getByTestId('sync-icon-test-uuid-1')
    expect(dot).toBeInTheDocument()
    expect(dot.title).toBe('Synced to GitHub')
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
})
