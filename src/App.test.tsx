import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import App from './App'
import { useSyncStore } from './stores/useSyncStore'

// Mock the store
vi.mock('./stores/useSyncStore', () => ({
  useSyncStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      setSelectedRepo: vi.fn(),
    })),
  }),
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

const mockTasks = [
  { id: '1', title: 'Buy milk', body: 'Get whole milk', isImportant: false, syncStatus: 'synced', createdAt: '2026-03-14T10:00:00Z' },
  { id: '2', title: 'Fix bug', body: 'High priority', isImportant: true, syncStatus: 'synced', createdAt: '2026-03-14T11:00:00Z' },
]

describe('App', () => {
  it('shows auth form when not authenticated', async () => {
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isAuthenticated: false,
        user: null,
        encryptedToken: null,
        selectedRepo: null,
        currentDraft: '',
        isImportant: false,
        tasks: [],
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
        setCurrentDraft: vi.fn(),
        toggleImportant: vi.fn(),
        addTask: vi.fn(),
        markTaskSynced: vi.fn(),
        removeTask: vi.fn(),
        loadTasksFromIDB: vi.fn(),
      } as never),
    )

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByTestId('auth-form')).toBeInTheDocument()
  })

  it('shows main interface when authenticated', async () => {
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isAuthenticated: true,
        user: { login: 'testuser', avatarUrl: 'https://example.com/a.png', name: 'Test' },
        encryptedToken: null,
        selectedRepo: { id: 1, fullName: 'testuser/repo', owner: 'testuser' },
        currentDraft: '',
        isImportant: false,
        tasks: mockTasks,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
        setCurrentDraft: vi.fn(),
        toggleImportant: vi.fn(),
        addTask: vi.fn(),
        markTaskSynced: vi.fn(),
        removeTask: vi.fn(),
        loadTasksFromIDB: vi.fn(),
      } as never),
    )

    await act(async () => {
      render(<App />)
    })

    expect(screen.getByText(/code-tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/welcome, testuser/i)).toBeInTheDocument()
    expect(screen.getByTestId('task-search-input')).toBeInTheDocument()
  })

  it('filters tasks based on search query', async () => {
    const user = userEvent.setup()
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isAuthenticated: true,
        user: { login: 'testuser' },
        selectedRepo: { id: 1, fullName: 'repo' },
        tasks: mockTasks,
        currentDraft: '',
        isImportant: false,
        loadTasksFromIDB: vi.fn(),
      } as never),
    )

    render(<App />)
    
    const searchInput = screen.getByTestId('task-search-input')
    await user.type(searchInput, 'milk')

    expect(screen.getByText('Buy milk')).toBeInTheDocument()
    expect(screen.queryByText('Fix bug')).not.toBeInTheDocument()
  })

  it('shows empty state when no tasks match', async () => {
    const user = userEvent.setup()
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isAuthenticated: true,
        user: { login: 'testuser' },
        selectedRepo: { id: 1, fullName: 'repo' },
        tasks: mockTasks,
        currentDraft: '',
        isImportant: false,
        loadTasksFromIDB: vi.fn(),
      } as never),
    )

    render(<App />)
    
    const searchInput = screen.getByTestId('task-search-input')
    await user.type(searchInput, 'nonexistent')

    expect(screen.getByTestId('filter-empty-state')).toHaveTextContent(/No tasks match '‘nonexistent’'/)
  })
})
