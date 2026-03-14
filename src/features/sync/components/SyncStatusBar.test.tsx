import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

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
import { SyncStatusBar } from './SyncStatusBar'

describe('SyncStatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    useSyncStore.setState({
      syncEngineStatus: 'idle',
      syncError: null,
      lastSyncedAt: null,
      isSyncing: false,
    })
  })

  it('renders nothing when idle and never synced', () => {
    const { container } = render(<SyncStatusBar />)
    expect(container.firstChild).toBeNull()
  })

  it('shows syncing state', () => {
    useSyncStore.setState({ syncEngineStatus: 'syncing', isSyncing: true })
    render(<SyncStatusBar />)
    expect(screen.getByText('Syncing to GitHub...')).toBeInTheDocument()
  })

  it('shows success state', () => {
    useSyncStore.setState({ syncEngineStatus: 'success' })
    render(<SyncStatusBar />)
    expect(screen.getByText('Synced successfully')).toBeInTheDocument()
  })

  it('shows error state with default message', () => {
    useSyncStore.setState({ syncEngineStatus: 'error', syncError: null })
    render(<SyncStatusBar />)
    expect(
      screen.getByText('Sync failed — will retry automatically'),
    ).toBeInTheDocument()
  })

  it('shows error state with custom error message', () => {
    useSyncStore.setState({
      syncEngineStatus: 'error',
      syncError: 'Rate limit exceeded',
    })
    render(<SyncStatusBar />)
    expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument()
  })

  it('shows last synced time when idle after a sync', () => {
    useSyncStore.setState({
      syncEngineStatus: 'idle',
      lastSyncedAt: '2026-03-14T10:30:00.000Z',
    })
    render(<SyncStatusBar />)
    expect(screen.getByTestId('sync-status-bar')).toBeInTheDocument()
  })

  it('has role="status" for accessibility', () => {
    useSyncStore.setState({ syncEngineStatus: 'syncing', isSyncing: true })
    render(<SyncStatusBar />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
