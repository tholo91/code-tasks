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

  it('shows amber sync icon and "Pending" pill for pending tasks', () => {
    render(<TaskCard task={createTask({ syncStatus: 'pending' })} />)

    const statusPill = screen.getByTestId('sync-status-test-uuid-1')
    expect(statusPill).toHaveTextContent('Pending')

    const icon = screen.getByLabelText('Sync pending')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('fill', '#d29922')
  })

  it('shows green check icon and "Synced" pill for synced tasks', () => {
    render(
      <TaskCard
        task={createTask({ syncStatus: 'synced', githubIssueNumber: 42 })}
      />,
    )

    const statusPill = screen.getByTestId('sync-status-test-uuid-1')
    expect(statusPill).toHaveTextContent('Synced')

    const icon = screen.getByLabelText('Synced to GitHub')
    expect(icon).toBeInTheDocument()
    expect(icon).toHaveAttribute('fill', '#3fb950')
  })

  it('applies amber left border for pending tasks', () => {
    render(<TaskCard task={createTask({ syncStatus: 'pending' })} />)
    const card = screen.getByTestId('task-card-test-uuid-1')
    // jsdom converts hex to rgb, so check for either format
    const border = card.style.borderLeft
    expect(
      border.includes('#d29922') || border.includes('rgb(210, 153, 34)'),
    ).toBe(true)
  })

  it('applies green left border for synced tasks', () => {
    render(
      <TaskCard
        task={createTask({ syncStatus: 'synced', githubIssueNumber: 42 })}
      />,
    )
    const card = screen.getByTestId('task-card-test-uuid-1')
    const border = card.style.borderLeft
    expect(
      border.includes('#3fb950') || border.includes('rgb(63, 185, 80)'),
    ).toBe(true)
  })
})
