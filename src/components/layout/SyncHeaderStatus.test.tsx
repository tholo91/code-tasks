import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock crypto-utils (needed by store)
vi.mock('../../services/storage/crypto-utils', () => ({
  encryptData: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
  decryptData: vi.fn().mockResolvedValue('decrypted-token'),
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, ...props }: Record<string, unknown>) => {
      const { layout: _layout, transition: _transition, animate: _animate, ...htmlProps } = props
      // Filter out non-HTML props from framer-motion
      const cleanProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(htmlProps)) {
        if (typeof value !== 'object' || key === 'style') {
          cleanProps[key] = value
        }
      }
      return <button {...cleanProps}>{children}</button>
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial: _initial, animate: _animate, exit: _exit, transition: _transition, ...htmlProps } = props
      const cleanProps: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(htmlProps)) {
        if (typeof value !== 'object' || key === 'style') {
          cleanProps[key] = value
        }
      }
      return <span {...cleanProps}>{children}</span>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
  useDragControls: () => ({ start: vi.fn() }),
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

import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

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

describe('SyncHeaderStatus', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    localStorageMock.clear()
    useSyncStore.setState({
      tasks: [],
      user: { login: 'testuser', avatarUrl: '', name: null },
      selectedRepo: { id: 1, fullName: 'testuser/my-repo', owner: 'testuser' },
      syncEngineStatus: 'idle',
      syncError: null,
      syncErrorType: null,
      isSyncing: false,
      lastSyncedAt: null,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when lastSyncedAt is null and no pending tasks', () => {
    const { container } = render(<SyncHeaderStatus />)
    expect(container.innerHTML).toBe('')
  })

  it('shows relative timestamp when synced with lastSyncedAt', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    useSyncStore.setState({ lastSyncedAt: twoHoursAgo })
    render(<SyncHeaderStatus />)
    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
  })

  it('passes size={12} to SyncStatusIcon when synced', () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
    useSyncStore.setState({ lastSyncedAt: oneMinAgo })
    render(<SyncHeaderStatus />)
    const badge = screen.getByTestId('sync-header-status')
    const svg = badge.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg?.getAttribute('width')).toBe('12')
    expect(svg?.getAttribute('height')).toBe('12')
  })

  it('shows synced badge when all tasks are synced and lastSyncedAt is set', () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString()
    useSyncStore.setState({
      tasks: [makeSyncedTask('1'), makeSyncedTask('2')],
      lastSyncedAt: oneMinAgo,
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByTestId('sync-header-status')).toBeInTheDocument()
  })

  it('shows pending count for single pending task', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('1 item')).toBeInTheDocument()
  })

  it('shows pending count for multiple pending tasks', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1'), makePendingTask('2'), makePendingTask('3')],
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('3 items')).toBeInTheDocument()
  })

  it('only counts pending tasks for the current user', () => {
    useSyncStore.setState({
      tasks: [
        makePendingTask('1', 'testuser'),
        makePendingTask('2', 'otheruser'),
        makePendingTask('3', 'testuser'),
      ],
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('2 items')).toBeInTheDocument()
  })

  it('shows "Syncing..." when sync is in progress', () => {
    useSyncStore.setState({
      syncEngineStatus: 'syncing',
      tasks: [makePendingTask('1')],
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })

  it('shows "Sync failed" on error', () => {
    useSyncStore.setState({
      syncEngineStatus: 'error',
      syncError: 'Something went wrong',
      syncErrorType: 'unknown',
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('Sync failed')).toBeInTheDocument()
  })

  it('shows "Sync blocked" for branch-protection error', () => {
    useSyncStore.setState({
      syncEngineStatus: 'error',
      syncError: 'Branch protection',
      syncErrorType: 'branch-protection',
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('Sync blocked')).toBeInTheDocument()
  })

  it('has data-testid for testing', () => {
    useSyncStore.setState({ lastSyncedAt: new Date().toISOString() })
    render(<SyncHeaderStatus />)
    expect(screen.getByTestId('sync-header-status')).toBeInTheDocument()
  })

  // Auto-compact tests (AC 1, 2)
  it('synced state compacts after 5 seconds', () => {
    useSyncStore.setState({ lastSyncedAt: new Date().toISOString() })
    render(<SyncHeaderStatus />)

    // Initially expanded — label visible
    expect(screen.getByText('just now')).toBeInTheDocument()

    // After 5s — label should be gone (compact)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByText('just now')).not.toBeInTheDocument()
  })

  it('pending state compacts after 5 seconds', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1'), makePendingTask('2')],
    })
    render(<SyncHeaderStatus />)

    // Initially expanded
    expect(screen.getByText('2 items')).toBeInTheDocument()

    // After 5s — compact
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByText('2 items')).not.toBeInTheDocument()
  })

  // Tap-to-expand test (AC 3)
  it('tapping compact dot re-expands to full label', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    useSyncStore.setState({ lastSyncedAt: new Date().toISOString() })
    render(<SyncHeaderStatus />)

    // Wait for compact
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(screen.queryByText('just now')).not.toBeInTheDocument()

    // Tap to re-expand
    await user.click(screen.getByTestId('sync-header-status'))

    expect(screen.getByText('just now')).toBeInTheDocument()
  })

  // Error/conflict always extended (AC 6)
  it('error state never compacts', () => {
    useSyncStore.setState({
      syncEngineStatus: 'error',
      syncError: 'Something went wrong',
      syncErrorType: 'unknown',
    })
    render(<SyncHeaderStatus />)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Sync failed')).toBeInTheDocument()
  })

  it('conflict state never compacts', () => {
    useSyncStore.setState({
      syncEngineStatus: 'conflict',
      syncError: 'Remote changed',
    })
    render(<SyncHeaderStatus />)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Conflict')).toBeInTheDocument()
  })

  // Syncing always extended (AC 7)
  it('syncing state stays extended', () => {
    useSyncStore.setState({
      syncEngineStatus: 'syncing',
    })
    render(<SyncHeaderStatus />)

    act(() => {
      vi.advanceTimersByTime(10000)
    })

    expect(screen.getByText('Syncing...')).toBeInTheDocument()
  })
})
