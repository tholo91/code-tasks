import { render, screen, act } from '@testing-library/react'
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

    expect(screen.getByText(/code-tasks/i)).toBeInTheDocument()
    expect(screen.getByText(/welcome, testuser/i)).toBeInTheDocument()
  })
})
