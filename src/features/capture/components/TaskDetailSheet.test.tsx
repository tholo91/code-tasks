import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskDetailSheet } from './TaskDetailSheet'
import type { Task } from '../../../types/task'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'detail-test-1',
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

/** Click the "More" toggle to reveal hidden metadata section */
async function expandMore(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('task-detail-more-toggle'))
}

describe('TaskDetailSheet', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onUpdate: vi.fn(),
    onToggleComplete: vi.fn(),
    onMoveToRepo: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.confirm = vi.fn().mockReturnValue(true)
  })

  it('renders with task title, notes, and priority flag', () => {
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    expect(screen.getByTestId('task-detail-title')).toHaveValue('Fix login bug')
    expect(screen.getByTestId('task-detail-notes')).toHaveValue('The login button is broken on mobile')
    expect(screen.getByTestId('task-detail-priority-flag')).toBeInTheDocument()
  })

  it('renders the sheet dialog with correct role', () => {
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-label', 'Task details')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('title edit calls onUpdate with debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    const titleInput = screen.getByTestId('task-detail-title')
    await user.clear(titleInput)
    await user.type(titleInput, 'New title')

    // Should not have called yet (debouncing)
    expect(defaultProps.onUpdate).not.toHaveBeenCalled()

    // Advance past debounce
    act(() => { vi.advanceTimersByTime(500) })

    expect(defaultProps.onUpdate).toHaveBeenCalledWith('detail-test-1', expect.objectContaining({ title: 'New title' }))
  })

  it('notes edit calls onUpdate with debounce', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask({ body: '' })} {...defaultProps} />)

    const notesInput = screen.getByTestId('task-detail-notes')
    await user.type(notesInput, 'My notes')

    act(() => { vi.advanceTimersByTime(500) })

    expect(defaultProps.onUpdate).toHaveBeenCalledWith('detail-test-1', expect.objectContaining({ body: 'My notes' }))
  })

  it('priority flag toggle calls onUpdate immediately', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    await user.click(screen.getByTestId('task-detail-priority-flag'))

    expect(defaultProps.onUpdate).toHaveBeenCalledWith('detail-test-1', expect.objectContaining({ isImportant: true }))
  })

  it('completion checkbox toggles via onToggleComplete', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    await user.click(screen.getByTestId('task-detail-checkbox'))

    expect(defaultProps.onToggleComplete).toHaveBeenCalledWith('detail-test-1')
  })

  it('completed task shows strikethrough title', () => {
    render(
      <TaskDetailSheet
        task={createTask({ isCompleted: true, completedAt: '2026-03-14T12:00:00Z' })}
        {...defaultProps}
      />,
    )

    const titleInput = screen.getByTestId('task-detail-title')
    expect(titleInput.style.textDecoration).toBe('line-through')
  })

  it('backdrop click calls onClose', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    const backdrop = screen.getByTestId('task-detail-sheet-backdrop')
    await user.click(backdrop)

    expect(defaultProps.onClose).toHaveBeenCalled()
  })

  it('"More" toggle reveals metadata section', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    // Metadata not visible before expanding
    expect(screen.queryByTestId('task-detail-sync-status')).not.toBeInTheDocument()
    expect(screen.queryByTestId('task-detail-created')).not.toBeInTheDocument()

    await expandMore(user)

    expect(screen.getByTestId('task-detail-sync-status')).toBeInTheDocument()
    expect(screen.getByTestId('task-detail-created')).toBeInTheDocument()
  })

  it('"Move to..." button calls onMoveToRepo after expanding More', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    await expandMore(user)
    await user.click(screen.getByTestId('task-detail-move-repo'))

    expect(defaultProps.onMoveToRepo).toHaveBeenCalledWith('detail-test-1')
  })

  it('displays created timestamp after expanding More', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    await expandMore(user)

    expect(screen.getByTestId('task-detail-created')).toBeInTheDocument()
  })

  it('displays updated timestamp when present after expanding More', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <TaskDetailSheet
        task={createTask({ updatedAt: '2026-03-15T10:00:00Z' })}
        {...defaultProps}
      />,
    )

    await expandMore(user)

    expect(screen.getByTestId('task-detail-updated')).toBeInTheDocument()
  })

  it('does not display updated timestamp when null', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask({ updatedAt: null })} {...defaultProps} />)

    await expandMore(user)

    expect(screen.queryByTestId('task-detail-updated')).not.toBeInTheDocument()
  })

  it('does not auto-focus title on mount (detail view is for reading first)', () => {
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    act(() => { vi.advanceTimersByTime(100) })

    expect(screen.getByTestId('task-detail-title')).not.toHaveFocus()
  })

  it('does not call onUpdate when title is empty and no other changes', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    const titleInput = screen.getByTestId('task-detail-title')
    await user.clear(titleInput)

    act(() => { vi.advanceTimersByTime(500) })

    expect(defaultProps.onUpdate).not.toHaveBeenCalled()
  })

  it('displays completed timestamp when task is completed after expanding More', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <TaskDetailSheet
        task={createTask({ isCompleted: true, completedAt: '2026-03-14T12:00:00Z' })}
        {...defaultProps}
      />,
    )

    await expandMore(user)

    expect(screen.getByTestId('task-detail-completed')).toBeInTheDocument()
  })

  it('shows current repo name after expanding More', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask({ repoFullName: 'testuser/my-project' })} {...defaultProps} />)

    await expandMore(user)

    expect(screen.getByText('testuser/my-project')).toBeInTheDocument()
  })

  it('renders delete button when onDelete prop is provided after expanding More', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onDelete = vi.fn()
    render(<TaskDetailSheet task={createTask()} {...defaultProps} onDelete={onDelete} />)

    await expandMore(user)

    expect(screen.getByTestId('detail-delete-button')).toBeInTheDocument()
  })

  it('does not render delete button when onDelete prop is absent', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<TaskDetailSheet task={createTask()} {...defaultProps} />)

    await expandMore(user)

    expect(screen.queryByTestId('detail-delete-button')).not.toBeInTheDocument()
  })

  it('clicking delete button calls onClose immediately and onDelete after 150ms', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const onDelete = vi.fn()
    render(<TaskDetailSheet task={createTask()} {...defaultProps} onDelete={onDelete} />)

    await expandMore(user)
    await user.click(screen.getByTestId('detail-delete-button'))

    expect(defaultProps.onClose).toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(150) })

    expect(onDelete).toHaveBeenCalledWith('detail-test-1')
  })
})
