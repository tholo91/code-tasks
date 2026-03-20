import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock crypto-utils (needed by store)
vi.mock('../../services/storage/crypto-utils', () => ({
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

  it('renders nothing when lastSyncedAt is null and no pending tasks', () => {
    const { container } = render(<SyncHeaderStatus />)
    expect(container.innerHTML).toBe('')
  })

  it('shows only relative timestamp when synced with lastSyncedAt', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    useSyncStore.setState({ lastSyncedAt: twoHoursAgo })
    render(<SyncHeaderStatus />)
    expect(screen.getByText(/2h ago/)).toBeInTheDocument()
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument()
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
    expect(screen.queryByText(/All caught up/)).not.toBeInTheDocument()
  })

  it('shows pending count for single pending task', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1')],
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('1 item pending')).toBeInTheDocument()
  })

  it('shows pending count for multiple pending tasks', () => {
    useSyncStore.setState({
      tasks: [makePendingTask('1'), makePendingTask('2'), makePendingTask('3')],
    })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('3 items pending')).toBeInTheDocument()
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
    expect(screen.getByText('2 items pending')).toBeInTheDocument()
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

  it('has role="status" for accessibility', () => {
    useSyncStore.setState({ lastSyncedAt: new Date().toISOString() })
    render(<SyncHeaderStatus />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('has data-testid for testing', () => {
    useSyncStore.setState({ lastSyncedAt: new Date().toISOString() })
    render(<SyncHeaderStatus />)
    expect(screen.getByTestId('sync-header-status')).toBeInTheDocument()
  })
})
