import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion to render children without animation
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      ...props
    }: any) => <button {...props}>{children}</button>,
    svg: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      variants: _variants,
      ...props
    }: any) => <svg {...props}>{children}</svg>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock sync-service
const mockSyncAllRepoTasks = vi.fn()
vi.mock('../../../services/github/sync-service', () => ({
  syncAllRepoTasks: (...args: any[]) => mockSyncAllRepoTasks(...args),
  classifySyncError: (err: any) => ({
    message: err instanceof Error ? err.message : 'Sync failed',
    errorType: 'unknown' as const,
  }),
}))

// Mock haptic service
vi.mock('../../../services/native/haptic-service', () => ({
  triggerSelectionHaptic: vi.fn().mockResolvedValue(undefined),
}))

// Mock crypto-utils (needed by store)
vi.mock('../../../services/storage/crypto-utils', () => ({
  encryptData: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
  decryptData: vi.fn().mockResolvedValue('decrypted-token'),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock })

import { useSyncStore } from '../../../stores/useSyncStore'
import { SyncFAB } from './SyncFAB'

const makePendingTask = (id: string, username = 'testuser', repoFullName = 'testuser/my-repo') => ({
  id,
  username,
  repoFullName,
  title: `Task ${id}`,
  body: '',
  isImportant: false,
  isCompleted: false,
  completedAt: null,
  updatedAt: null,
  order: 0,
  createdAt: new Date().toISOString(),
  syncStatus: 'pending' as const,
  githubIssueNumber: null,
})

const makeSyncedTask = (id: string, username = 'testuser', repoFullName = 'testuser/my-repo') => ({
  ...makePendingTask(id, username, repoFullName),
  syncStatus: 'synced' as const,
  githubIssueNumber: 1,
})

const resetStore = () => {
  useSyncStore.setState({
    tasks: [],
    user: { login: 'testuser', avatarUrl: '', name: null },
    selectedRepo: { id: 1, fullName: 'testuser/my-repo', owner: 'testuser' },
    syncEngineStatus: 'idle',
    syncError: null,
    syncErrorType: null,
    isSyncing: false,
    lastSyncedAt: null,
    hasPendingDeletions: false,
  })
}

describe('SyncFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    resetStore()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not render when there are no pending tasks', () => {
    render(<SyncFAB />)
    expect(screen.queryByTestId('sync-fab')).not.toBeInTheDocument()
  })

  it('does not render when all tasks are synced', () => {
    useSyncStore.setState({ tasks: [makeSyncedTask('1'), makeSyncedTask('2')] })
    render(<SyncFAB />)
    expect(screen.queryByTestId('sync-fab')).not.toBeInTheDocument()
  })

  it('renders when there are pending tasks', () => {
    useSyncStore.setState({ tasks: [makePendingTask('1')] })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toBeInTheDocument()
  })

  it('renders when hasPendingDeletions is true even with no pending tasks', () => {
    useSyncStore.setState({
      tasks: [makeSyncedTask('1')],
      hasPendingDeletions: true,
    })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toBeInTheDocument()
  })

  it('shows correct aria-label with pending count', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1'), makePendingTask('2'), makePendingTask('3')],
    })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toHaveAttribute(
      'aria-label',
      'Sync 3 pending tasks to GitHub',
    )
  })

  it('shows singular aria-label for 1 pending task', () => {
    useSyncStore.setState({ tasks: [makePendingTask('1')] })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toHaveAttribute(
      'aria-label',
      'Sync 1 pending task to GitHub',
    )
  })

  it('only counts pending tasks for the current user', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1', 'testuser'), makePendingTask('2', 'otheruser')],
    })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toHaveAttribute(
      'aria-label',
      'Sync 1 pending task to GitHub',
    )
  })

  it('shows badge with pending count', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1'), makePendingTask('2')],
    })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-badge')).toHaveTextContent('2')
  })

  it('calls syncAllRepoTasks when clicked', async () => {
    mockSyncAllRepoTasks.mockResolvedValueOnce({ syncedCount: 1 })
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    expect(mockSyncAllRepoTasks).toHaveBeenCalledTimes(1)
  })

  it('shows spinner and disables FAB during sync', async () => {
    let resolveSync: (value: any) => void
    const syncPromise = new Promise((resolve) => {
      resolveSync = resolve
    })
    mockSyncAllRepoTasks.mockReturnValueOnce(syncPromise)

    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    expect(screen.getByTestId('sync-spinner')).toBeInTheDocument()
    expect(screen.getByTestId('sync-fab')).toBeDisabled()
    expect(useSyncStore.getState().syncEngineStatus).toBe('syncing')

    await act(async () => {
      resolveSync!({ syncedCount: 1 })
    })
  })

  it('shows checkmark on successful sync', async () => {
    mockSyncAllRepoTasks.mockResolvedValueOnce({ syncedCount: 1 })
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(() => {
      expect(screen.getByTestId('sync-checkmark')).toBeInTheDocument()
    })
    expect(useSyncStore.getState().syncEngineStatus).toBe('success')
  })

  it('fires haptic on successful sync', async () => {
    mockSyncAllRepoTasks.mockResolvedValueOnce({ syncedCount: 1 })
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(async () => {
      const { triggerSelectionHaptic } = await import('../../../services/native/haptic-service')
      expect(triggerSelectionHaptic).toHaveBeenCalledTimes(1)
    })
  })

  it('sets error status when sync fails', async () => {
    mockSyncAllRepoTasks.mockRejectedValueOnce(new Error('Network error'))
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('error')
      expect(useSyncStore.getState().syncError).toBe('Network error')
    })
  })

  it('FAB is tappable after error (retry)', async () => {
    mockSyncAllRepoTasks
      .mockResolvedValueOnce({ syncedCount: 0, error: 'Failed', errorType: 'unknown' })
      .mockResolvedValueOnce({ syncedCount: 1 })

    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()

    await user.click(screen.getByTestId('sync-fab'))
    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('error')
    })

    expect(screen.getByTestId('sync-fab')).not.toBeDisabled()

    await user.click(screen.getByTestId('sync-fab'))
    expect(mockSyncAllRepoTasks).toHaveBeenCalledTimes(2)
  })

  it('updates lastSyncedAt on successful sync', async () => {
    mockSyncAllRepoTasks.mockResolvedValueOnce({ syncedCount: 2 })
    useSyncStore.setState({
      tasks: [makePendingTask('1'), makePendingTask('2')],
      lastSyncedAt: null,
    })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(() => {
      expect(useSyncStore.getState().lastSyncedAt).not.toBeNull()
    })
  })

  it('renders at elevated position (bottom: 96px) to stack above CreateTaskFAB', () => {
    useSyncStore.setState({ tasks: [makePendingTask('1')] })
    render(<SyncFAB />)
    const fab = screen.getByTestId('sync-fab')
    expect(fab.style.bottom).toBe('96px')
  })

  it('passes errorType from sync result to setSyncStatus', async () => {
    mockSyncAllRepoTasks.mockResolvedValueOnce({
      syncedCount: 0,
      error: 'Branch protection',
      errorType: 'branch-protection',
    })
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('error')
      expect(useSyncStore.getState().syncErrorType).toBe('branch-protection')
    })
  })

  it('shows error aria-label after failure', async () => {
    mockSyncAllRepoTasks.mockResolvedValueOnce({
      syncedCount: 0,
      error: 'Failed',
      errorType: 'unknown',
    })
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    // Wait for the error state to propagate to the store
    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('error')
    })

    // Then check the aria-label
    const label = screen.getByTestId('sync-fab').getAttribute('aria-label') ?? ''
    expect(label).toContain('tap to retry')
  })

  it('success state eventually resets to allow FAB to hide', async () => {
    // Verifies the 2s success timer transitions fabState from 'success' back to 'pending'
    // Uses real timers with a short wait rather than fake timers to avoid async conflicts
    mockSyncAllRepoTasks.mockResolvedValueOnce({ syncedCount: 1 })
    useSyncStore.setState({ tasks: [makePendingTask('1')] })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    // Verify we enter success state
    await waitFor(() => {
      expect(screen.getByTestId('sync-checkmark')).toBeInTheDocument()
    })

    // FAB should be disabled (non-interactive) during success display
    expect(screen.getByTestId('sync-fab')).toBeDisabled()

    // After 2s the success timer resets fabState to 'pending'.
    // Since hasUnsyncedChanges is now false (store status is 'success'),
    // the FAB should eventually disappear.
    await waitFor(
      () => {
        expect(screen.queryByTestId('sync-checkmark')).not.toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })
})
