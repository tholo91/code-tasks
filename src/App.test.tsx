import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'
import { useSyncStore } from './stores/useSyncStore'

// Mock sync-service (avoid GitHub calls during App render)
vi.mock('./services/github/sync-service', () => ({
  fetchRemoteTasksForRepo: vi.fn().mockResolvedValue({ tasks: [], sha: null }),
  fetchRemoteFileContent: vi.fn().mockResolvedValue({ content: null, sha: null }),
  syncPendingTasks: vi.fn().mockResolvedValue({ syncedCount: 0 }),
}))

// Mock the store
vi.mock('./stores/useSyncStore', () => ({
  useSyncStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      setSelectedRepo: vi.fn(),
      tasks: [],
      user: null,
    })),
    setState: vi.fn(),
  }),
  selectPendingSyncCount: vi.fn(() => 0),
}))

// Mock useNetworkStatus
vi.mock('./hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({
    isOnline: true,
    showOfflineNotification: false,
    dismissOfflineNotification: vi.fn(),
  }),
}))

// Mock AuthGuard to render children immediately (tested separately)
vi.mock('./components/auth/AuthGuard', () => ({
  AuthGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock AuthSkeleton
vi.mock('./components/ui/AuthSkeleton', () => ({
  AuthSkeleton: () => <div data-testid="auth-skeleton">Loading...</div>,
}))

// Mock AuthForm
vi.mock('./features/auth/components/AuthForm', () => ({
  AuthForm: () => <div data-testid="auth-form">Auth Form</div>,
}))

// Mock framer-motion to avoid heavy bundle in test environment
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
  useDragControls: () => ({ start: () => {} }),
  useReducedMotion: () => false,
}))

// Mock heavy components not under test to reduce memory pressure
vi.mock('./features/sync/hooks/useAutoSync', () => ({
  useAutoSync: () => {},
}))
vi.mock('./features/sync/components/SyncConflictBanner', () => ({
  SyncConflictBanner: () => null,
}))
vi.mock('./features/sync/components/BranchProtectionBanner', () => ({
  BranchProtectionBanner: ({ visible, onDismiss, onSwitchRepo }: any) =>
    visible ? (
      <div data-testid="branch-protection-banner">
        <button data-testid="banner-dismiss" onClick={onDismiss}>Dismiss</button>
        <button data-testid="banner-switch-repo" onClick={onSwitchRepo}>Switch Repo</button>
      </div>
    ) : null,
}))
vi.mock('./features/sync/components/SyncImportBanner', () => ({
  SyncImportBanner: () => null,
}))
vi.mock('./features/community/components/RoadmapView', () => ({
  RoadmapView: () => null,
}))
vi.mock('./components/layout/SettingsSheet', () => ({
  SettingsSheet: () => null,
}))
vi.mock('./features/capture/components/CreateTaskSheet', () => ({
  CreateTaskSheet: () => null,
}))
vi.mock('./services/github/octokit-provider', () => ({
  recoverOctokit: vi.fn().mockResolvedValue({}),
}))

// Mock DraggableTaskCard to render as simple wrapper
vi.mock('./features/capture/components/DraggableTaskCard', () => ({
  DraggableTaskCard: ({ task, onTap, onComplete, isNewest }: any) => (
    <li data-testid={`reorder-item-${task.id}`}>
      <div
        data-testid={`task-card-${task.id}`}
        onClick={() => onTap?.(task.id)}
      >
        <button
          data-testid={`task-checkbox-${task.id}`}
          role="checkbox"
          onClick={(e: any) => { e.stopPropagation(); onComplete?.(task.id) }}
        />
        <span data-testid={`task-title-${task.id}`}>{task.title}</span>
        <span data-testid={`sync-status-${task.id}`}>{task.syncStatus === 'pending' ? 'Pending' : 'Synced'}</span>
        {task.body && <span data-testid={`task-body-${task.id}`}>{task.body}</span>}
        {isNewest && <span data-testid="newest-indicator" />}
      </div>
    </li>
  ),
}))

// Mock UndoToast
vi.mock('./features/capture/components/UndoToast', () => ({
  UndoToast: ({ message, onUndo, onExpire }: any) => (
    <div data-testid="undo-toast">
      <span>{message}</span>
      <button data-testid="undo-button" onClick={onUndo}>Undo</button>
    </div>
  ),
}))

// Mock TaskCard (used in completed section)
vi.mock('./features/capture/components/TaskCard', () => ({
  TaskCard: ({ task, onTap, onComplete }: any) => (
    <div data-testid={`task-card-${task.id}`} onClick={() => onTap?.(task.id)}>
      <button
        data-testid={`task-checkbox-${task.id}`}
        role="checkbox"
        onClick={(e: any) => { e.stopPropagation(); onComplete?.(task.id) }}
      />
      <span data-testid={`task-title-${task.id}`}>{task.title}</span>
    </div>
  ),
}))

// Mock other components that import framer-motion
vi.mock('./features/capture/components/CreateTaskFAB', () => ({
  CreateTaskFAB: ({ onClick }: any) => <button data-testid="create-task-fab" onClick={onClick}>+</button>,
}))
vi.mock('./features/sync/components/SyncFAB', () => ({
  SyncFAB: () => null,
}))
vi.mock('./features/capture/components/TaskDetailSheet', () => ({
  TaskDetailSheet: () => null,
}))
vi.mock('./features/capture/components/PriorityFilterPills', () => ({
  PriorityFilterPills: ({ currentFilter, onChange }: any) => (
    <div data-testid="priority-filter">{currentFilter}</div>
  ),
}))

vi.mock('./features/capture/components/SortModeSelector', () => ({
  SortModeSelector: ({ currentMode }: any) => (
    <div data-testid="sort-mode-selector">{currentMode}</div>
  ),
}))

const mockTasks = [
  { id: '1', title: 'Buy milk', body: 'Get whole milk', isImportant: false, isCompleted: false, completedAt: null, updatedAt: null, order: 0, syncStatus: 'synced', createdAt: '2026-03-14T10:00:00Z', repoFullName: 'testuser/repo', username: 'testuser', githubIssueNumber: null },
  { id: '2', title: 'Fix bug', body: 'High priority', isImportant: true, isCompleted: false, completedAt: null, updatedAt: null, order: 1, syncStatus: 'synced', createdAt: '2026-03-14T11:00:00Z', repoFullName: 'testuser/repo', username: 'testuser', githubIssueNumber: null },
]

const mockTasksWithCompleted = [
  { id: '1', title: 'Buy milk', body: 'Get whole milk', isImportant: false, isCompleted: false, completedAt: null, updatedAt: null, order: 0, syncStatus: 'synced', createdAt: '2026-03-14T10:00:00Z', repoFullName: 'testuser/repo', username: 'testuser', githubIssueNumber: null },
  { id: '2', title: 'Fix bug', body: 'High priority', isImportant: true, isCompleted: true, completedAt: '2026-03-14T12:00:00Z', updatedAt: null, order: 1, syncStatus: 'pending', createdAt: '2026-03-14T11:00:00Z', repoFullName: 'testuser/repo', username: 'testuser', githubIssueNumber: null },
  { id: '3', title: 'Done task', body: '', isImportant: false, isCompleted: true, completedAt: '2026-03-14T13:00:00Z', updatedAt: null, order: 2, syncStatus: 'pending', createdAt: '2026-03-14T09:00:00Z', repoFullName: 'testuser/repo', username: 'testuser', githubIssueNumber: null },
]

// Stable mock function references — creating vi.fn() inside mockImplementation
// causes new references on every render, triggering infinite React re-renders → OOM.
const stableFns = {
  setAuth: vi.fn(),
  clearAuth: vi.fn(),
  setAuthError: vi.fn(),
  setSelectedRepo: vi.fn(),
  setRepoSyncMeta: vi.fn(),
  clearRepoConflict: vi.fn(),
  replaceTasksForRepo: vi.fn(),
  setRepoSortMode: vi.fn(),
  toggleImportant: vi.fn(),
  toggleComplete: vi.fn(),
  reorderTasks: vi.fn(),
  updateTask: vi.fn(),
  moveTaskToRepo: vi.fn(),
  addTask: vi.fn(),
  markTaskSynced: vi.fn(),
  removeTask: vi.fn(),
  loadTasksFromIDB: vi.fn().mockResolvedValue(undefined),
}

function mockStoreWith(overrides: Record<string, unknown>) {
  vi.mocked(useSyncStore).mockImplementation((selector) =>
    selector({
      ...stableFns,
      isImportant: false,
      authError: null,
      syncEngineStatus: 'idle',
      syncError: null,
      syncErrorType: null,
      repoSyncMeta: {},
      repoSortModes: {},
      hasPendingDeletions: false,
      ...overrides,
    } as never),
  )
}

describe('App', () => {
  beforeEach(() => {
    // Reset all stable mock fns between tests
    Object.values(stableFns).forEach((fn) => fn.mockClear())
    stableFns.loadTasksFromIDB.mockResolvedValue(undefined)
  })

  it('shows auth form when not authenticated', async () => {
    mockStoreWith({
      isAuthenticated: false,
      user: null,
      token: null,
      selectedRepo: null,
      tasks: [],
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByTestId('auth-form')).toBeInTheDocument()
  })

  it('shows main interface when authenticated', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText(/code-tasks/i)).toBeInTheDocument()
    expect(screen.getByTestId('selected-repo')).toHaveTextContent('testuser/repo')
    expect(screen.getByTestId('task-search-input')).toBeInTheDocument()
  })

  it('filters tasks based on search query', async () => {
    const user = userEvent.setup()
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
    })

    await act(async () => {
      render(<App />)
    })

    const searchInput = screen.getByTestId('task-search-input')
    await user.type(searchInput, 'milk')

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Fix bug')).not.toBeInTheDocument()
  })

  it('shows empty state when no tasks match', async () => {
    const user = userEvent.setup()
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
    })

    await act(async () => {
      render(<App />)
    })

    const searchInput = screen.getByTestId('task-search-input')
    await user.type(searchInput, 'nonexistent')

    expect(screen.getByTestId('filter-empty-state')).toHaveTextContent(/No tasks match/)
  })

  it('shows completed tasks in "Completed" section', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    const header = screen.getByTestId('completed-section-header')
    expect(header).toHaveTextContent('Completed (2)')
    expect(screen.getByText('Buy milk')).toBeInTheDocument()
  })

  it('"Completed (N)" header shows correct count', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    const header = screen.getByTestId('completed-section-header')
    expect(header).toHaveTextContent('Completed (2)')
  })

  it('section header toggle expands then collapses completed list', async () => {
    const user = userEvent.setup()
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    const header = screen.getByTestId('completed-section-header')
    // Default: collapsed
    expect(header.getAttribute('aria-expanded')).toBe('false')

    // Click to expand
    await user.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('true')

    // Click to collapse again
    await user.click(header)
    expect(header.getAttribute('aria-expanded')).toBe('false')
  })

  it('completed section is collapsed by default — header visible but tasks hidden', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    // Header is visible
    expect(screen.getByTestId('completed-section-header')).toBeInTheDocument()
    // Collapsed tasks (Fix bug, Done task) are not rendered
    expect(screen.queryByTestId('task-card-2')).not.toBeInTheDocument()
    expect(screen.queryByTestId('task-card-3')).not.toBeInTheDocument()
  })

  it('search auto-expands completed section when search matches a completed task', async () => {
    const user = userEvent.setup()
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    // Initially collapsed
    expect(screen.getByTestId('completed-section-header').getAttribute('aria-expanded')).toBe('false')

    // Search for a completed task
    const searchInput = screen.getByTestId('task-search-input')
    await act(async () => {
      await user.type(searchInput, 'Fix bug')
    })

    // Completed section auto-expands
    expect(screen.getByTestId('completed-section-header').getAttribute('aria-expanded')).toBe('true')
  })

  it('clearing search collapses the completed section', async () => {
    const user = userEvent.setup()
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    const searchInput = screen.getByTestId('task-search-input')

    // Type a query to expand
    await act(async () => {
      await user.type(searchInput, 'Fix bug')
    })
    expect(screen.getByTestId('completed-section-header').getAttribute('aria-expanded')).toBe('true')

    // Clear the search
    await act(async () => {
      await user.clear(searchInput)
    })
    expect(screen.getByTestId('completed-section-header').getAttribute('aria-expanded')).toBe('false')
  })

  it('active tasks do NOT appear in completed section', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasksWithCompleted,
    })

    await act(async () => {
      render(<App />)
    })

    const taskList = screen.getByTestId('task-list')
    expect(taskList).toHaveTextContent('Buy milk')
  })

  it('shows branch protection banner when syncErrorType is branch-protection', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
      syncErrorType: 'branch-protection',
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByTestId('branch-protection-banner')).toBeInTheDocument()
  })

  it('does not show branch protection banner for other error types', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
      syncErrorType: 'network',
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.queryByTestId('branch-protection-banner')).not.toBeInTheDocument()
  })

  it('hides branch protection banner when dismissed', async () => {
    const user = userEvent.setup()
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
      syncErrorType: 'branch-protection',
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByTestId('branch-protection-banner')).toBeInTheDocument()
    await user.click(screen.getByTestId('banner-dismiss'))
    expect(screen.queryByTestId('branch-protection-banner')).not.toBeInTheDocument()
  })

  it('does not show branch protection banner when syncErrorType is null', async () => {
    mockStoreWith({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
      token: 'ghp_token',
      selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
      tasks: mockTasks,
      syncErrorType: null,
    })

    await act(async () => {
      render(<App />)
    })

    expect(screen.queryByTestId('branch-protection-banner')).not.toBeInTheDocument()
  })
})
