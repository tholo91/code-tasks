import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRemoteChangeDetection } from './useRemoteChangeDetection'

// Mock modules
vi.mock('../services/github/sync-service', () => ({
  fetchRemoteTasksForRepo: vi.fn(),
}))

vi.mock('./useNetworkStatus', () => ({
  useNetworkStatus: vi.fn(),
}))

vi.mock('../stores/useSyncStore', () => ({
  useSyncStore: vi.fn(),
}))

import { fetchRemoteTasksForRepo } from '../services/github/sync-service'
import { useNetworkStatus } from './useNetworkStatus'
import { useSyncStore } from '../stores/useSyncStore'

const mockFetchRemote = vi.mocked(fetchRemoteTasksForRepo)
const mockUseNetworkStatus = vi.mocked(useNetworkStatus)
const mockUseSyncStore = vi.mocked(useSyncStore)

function makeStoreState(overrides: Record<string, unknown> = {}) {
  return {
    selectedRepo: { fullName: 'owner/repo', id: 1, owner: 'owner' },
    user: { login: 'testuser' },
    syncEngineStatus: 'idle',
    tasks: [] as ReturnType<typeof makeRemoteTasks>,
    repoSyncMeta: {
      'owner/repo': { lastSyncedSha: 'abc123', lastSyncAt: null, localRevision: 0, lastSyncedRevision: 0, conflict: null },
    },
    setRepoSyncMeta: vi.fn(),
    ...overrides,
  }
}

function makeRemoteTasks() {
  return [
    {
      id: 'task-1',
      username: 'testuser',
      repoFullName: 'owner/repo',
      title: 'Task 1',
      body: '',
      createdAt: '2026-03-14T00:00:00.000Z',
      isImportant: false,
      isCompleted: false,
      completedAt: null,
      updatedAt: null,
      order: 0,
      syncStatus: 'synced' as const,
      githubIssueNumber: null,
    },
  ]
}

function triggerVisibilityChange(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, writable: true, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useRemoteChangeDetection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true, configurable: true })
    mockUseNetworkStatus.mockReturnValue({ isOnline: true, showOfflineNotification: false, dismissOfflineNotification: vi.fn() })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls fetchRemoteTasksForRepo when visibility changes to visible', async () => {
    const storeState = makeStoreState()
    mockUseSyncStore.mockImplementation((selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(storeState))
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState
    mockFetchRemote.mockResolvedValue({ tasks: makeRemoteTasks(), sha: 'def456' })

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    triggerVisibilityChange('visible')
    await vi.waitFor(() => expect(mockFetchRemote).toHaveBeenCalledWith('owner/repo', 'testuser'))
  })

  it('skips check when offline', async () => {
    mockUseNetworkStatus.mockReturnValue({ isOnline: false, showOfflineNotification: false, dismissOfflineNotification: vi.fn() })
    const storeState = makeStoreState()
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    triggerVisibilityChange('visible')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockFetchRemote).not.toHaveBeenCalled()
  })

  it('skips check when debounce interval not elapsed', async () => {
    const storeState = makeStoreState()
    mockUseSyncStore.mockImplementation((selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(storeState))
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState
    mockFetchRemote.mockResolvedValue({ tasks: makeRemoteTasks(), sha: 'def456' })

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    // First visibility change — should fire
    triggerVisibilityChange('visible')
    await vi.waitFor(() => expect(mockFetchRemote).toHaveBeenCalledTimes(1))

    // Second immediate visibility change — debounce blocks it
    triggerVisibilityChange('hidden')
    triggerVisibilityChange('visible')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockFetchRemote).toHaveBeenCalledTimes(1)
  })

  it('calls onRemoteChanges when SHA differs even with pending changes', async () => {
    const storeState = makeStoreState()
    mockUseSyncStore.mockImplementation((selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(storeState))
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState
    const remoteTasks = makeRemoteTasks()
    mockFetchRemote.mockResolvedValue({ tasks: remoteTasks, sha: 'def456' })

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    triggerVisibilityChange('visible')
    await vi.waitFor(() => expect(onRemoteChanges).toHaveBeenCalledWith({ tasks: remoteTasks, sha: 'def456' }))
  })

  it('skips remote check when syncEngineStatus is syncing', async () => {
    const storeState = makeStoreState({ syncEngineStatus: 'syncing' })
    mockUseSyncStore.mockImplementation((selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(storeState))
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState
    mockFetchRemote.mockResolvedValue({ tasks: makeRemoteTasks(), sha: 'def456' })

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    triggerVisibilityChange('visible')
    await new Promise((r) => setTimeout(r, 50))
    expect(mockFetchRemote).not.toHaveBeenCalled()
    expect(onRemoteChanges).not.toHaveBeenCalled()
  })

  it('silently updates SHA when diff is all-zero (no meaningful changes)', async () => {
    // Local and remote have the exact same task — diff should be all-zero
    const localTasks = makeRemoteTasks()
    const storeState = makeStoreState({ tasks: localTasks })
    mockUseSyncStore.mockImplementation((selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(storeState))
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState
    mockFetchRemote.mockResolvedValue({ tasks: makeRemoteTasks(), sha: 'def456' })

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    triggerVisibilityChange('visible')
    await vi.waitFor(() => expect(mockFetchRemote).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))

    // Should NOT call onRemoteChanges — instead silently updates SHA
    expect(onRemoteChanges).not.toHaveBeenCalled()
    expect(storeState.setRepoSyncMeta).toHaveBeenCalledWith('owner/repo', expect.objectContaining({ lastSyncedSha: 'def456' }))
  })

  it('does not call onRemoteChanges when SHA matches', async () => {
    const storeState = makeStoreState()
    mockUseSyncStore.mockImplementation((selector: (s: ReturnType<typeof makeStoreState>) => unknown) => selector(storeState))
    ;(useSyncStore as unknown as { getState: () => ReturnType<typeof makeStoreState> }).getState = () => storeState
    // Same SHA as localSha in storeState
    mockFetchRemote.mockResolvedValue({ tasks: makeRemoteTasks(), sha: 'abc123' })

    const onRemoteChanges = vi.fn()
    renderHook(() => useRemoteChangeDetection(onRemoteChanges))

    triggerVisibilityChange('visible')
    await vi.waitFor(() => expect(mockFetchRemote).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 50))
    expect(onRemoteChanges).not.toHaveBeenCalled()
  })
})
