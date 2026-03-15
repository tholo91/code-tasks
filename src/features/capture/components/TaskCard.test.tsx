import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TaskCard } from './TaskCard'
import type { Task } from '../../../types/task'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-uuid-1',
    username: 'testuser',
    title: 'Fix login bug',
    body: 'The login button is broken on mobile',
    isImportant: false,
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

  it('renders task body when present', () => {
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
})
