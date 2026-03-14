import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// Mock sync-service
const mockSyncPendingTasks = vi.fn()
vi.mock('../../../services/github/sync-service', () => ({
  syncPendingTasks: (...args: any[]) => mockSyncPendingTasks(...args),
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

const makePendingTask = (id: string, username = 'testuser') => ({
  id,
  username,
  title: `Task ${id}`,
  body: '',
  isImportant: false,
  createdAt: new Date().toISOString(),
  syncStatus: 'pending' as const,
  githubIssueNumber: null,
})

const makeSyncedTask = (id: string, username = 'testuser') => ({
  ...makePendingTask(id, username),
  syncStatus: 'synced' as const,
  githubIssueNumber: 1,
})

describe('SyncFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    useSyncStore.setState({
      tasks: [],
      user: { login: 'testuser', avatarUrl: '', name: null },
      syncEngineStatus: 'idle',
      syncError: null,
      isSyncing: false,
      lastSyncedAt: null,
    })
  })

  it('does not render when there are no pending tasks', () => {
    render(<SyncFAB />)
    expect(screen.queryByTestId('sync-fab')).not.toBeInTheDocument()
  })

  it('does not render when all tasks are synced', () => {
    useSyncStore.setState({
      tasks: [makeSyncedTask('1'), makeSyncedTask('2')],
    })
    render(<SyncFAB />)
    expect(screen.queryByTestId('sync-fab')).not.toBeInTheDocument()
  })

  it('renders when there are pending tasks', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
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
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toHaveAttribute(
      'aria-label',
      'Sync 1 pending task to GitHub',
    )
  })

  it('only counts pending tasks for the current user', () => {
    useSyncStore.setState({
      tasks: [
        makePendingTask('1', 'testuser'),
        makePendingTask('2', 'otheruser'),
      ],
    })
    render(<SyncFAB />)
    expect(screen.getByTestId('sync-fab')).toHaveAttribute(
      'aria-label',
      'Sync 1 pending task to GitHub',
    )
  })

  it('calls syncPendingTasks when clicked', async () => {
    mockSyncPendingTasks.mockResolvedValueOnce({ syncedCount: 1 })
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    expect(mockSyncPendingTasks).toHaveBeenCalledTimes(1)
  })

  it('shows spinner and updates sync status while syncing', async () => {
    let resolveSync: (value: any) => void
    const syncPromise = new Promise((resolve) => {
      resolveSync = resolve
    })
    mockSyncPendingTasks.mockReturnValueOnce(syncPromise)

    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    // Should show spinner
    expect(screen.getByTestId('sync-spinner')).toBeInTheDocument()
    // Should be disabled
    expect(screen.getByTestId('sync-fab')).toBeDisabled()
    // Sync status should be 'syncing'
    expect(useSyncStore.getState().syncEngineStatus).toBe('syncing')

    // Resolve
    resolveSync!({ syncedCount: 1 })
    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('success')
    })
  })

  it('sets error status when sync fails', async () => {
    mockSyncPendingTasks.mockRejectedValueOnce(new Error('Network error'))
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('error')
      expect(useSyncStore.getState().syncError).toBe('Network error')
    })
  })

  it('sets error status when syncPendingTasks returns error', async () => {
    mockSyncPendingTasks.mockResolvedValueOnce({
      syncedCount: 0,
      error: 'No repo selected',
    })
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })

    render(<SyncFAB />)
    const user = userEvent.setup()
    await user.click(screen.getByTestId('sync-fab'))

    await waitFor(() => {
      expect(useSyncStore.getState().syncEngineStatus).toBe('error')
      expect(useSyncStore.getState().syncError).toBe('No repo selected')
    })
  })

  it('updates lastSyncedAt on successful sync', async () => {
    mockSyncPendingTasks.mockResolvedValueOnce({ syncedCount: 2 })
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
})
