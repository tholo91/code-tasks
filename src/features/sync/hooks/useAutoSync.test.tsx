import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyncStore, type RepoSyncMeta } from '../../../stores/useSyncStore'
import { useAutoSync } from './useAutoSync'

const mockSyncRepo = vi.fn().mockResolvedValue({ syncedCount: 1 })
vi.mock('../../../services/github/sync-service', () => ({
  syncRepo: (...args: unknown[]) => mockSyncRepo(...args),
}))
vi.mock('../../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => ({ isOnline: true }),
}))

describe('useAutoSync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-21T10:00:00.000Z'))
    vi.clearAllMocks()
    mockSyncRepo.mockResolvedValue({ syncedCount: 1 })
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true })
    useSyncStore.setState({
      user: { login: 'tholo91', avatarUrl: '', name: null },
      selectedRepo: { id: 1, fullName: 'owner/one', owner: 'owner', defaultBranch: 'main' },
      repoSyncBranches: { 'owner/one': 'gitty/tholo91', 'owner/two': 'gitty/tholo91' },
      repoSkipCi: { 'owner/one': true, 'owner/two': true },
      repoAutoSync: { 'owner/one': true, 'owner/two': true },
      repoSyncMeta: {},
      repoSyncErrors: {},
    })
  })

  it('syncs a completed capture after 2.5 seconds', async () => {
    useSyncStore.setState({ repoSyncMeta: { 'owner/one': queuedMeta('capture') } })
    renderHook(() => useAutoSync())
    await act(async () => { vi.advanceTimersByTime(2_499) })
    expect(mockSyncRepo).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })
    expect(mockSyncRepo).toHaveBeenCalledWith(expect.objectContaining({ repoFullName: 'owner/one', reason: 'capture' }))
  })

  it('keeps independent 10-second timers for multiple repository outboxes', async () => {
    useSyncStore.setState({ repoSyncMeta: {
      'owner/one': queuedMeta('edit'),
      'owner/two': queuedMeta('deletion'),
    } })
    renderHook(() => useAutoSync())
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000) })
    expect(mockSyncRepo).toHaveBeenCalledTimes(2)
    expect(mockSyncRepo).toHaveBeenCalledWith(expect.objectContaining({ repoFullName: 'owner/one' }))
    expect(mockSyncRepo).toHaveBeenCalledWith(expect.objectContaining({ repoFullName: 'owner/two' }))
  })

  it('recovers a persisted syncing repository as queued on mount', () => {
    useSyncStore.setState({ repoSyncMeta: {
      'owner/one': { ...queuedMeta('edit'), deliveryState: 'syncing' },
    } })

    renderHook(() => useAutoSync())

    expect(useSyncStore.getState().repoSyncMeta['owner/one'].deliveryState).toBe('queued')
  })

  it('runs a scheduled retry from needs-attention metadata', async () => {
    useSyncStore.setState({ repoSyncMeta: {
      'owner/one': {
        ...queuedMeta('edit'),
        deliveryState: 'needs-attention',
        retryCount: 1,
        nextRetryAt: new Date(Date.now() + 2_000).toISOString(),
      },
    } })
    renderHook(() => useAutoSync())

    await act(async () => { vi.advanceTimersByTime(1_999) })
    expect(mockSyncRepo).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(1) })

    expect(mockSyncRepo).toHaveBeenCalledWith(expect.objectContaining({ reason: 'retry' }))
  })

  it('schedules an automatic retry after an exhausted sync error', async () => {
    mockSyncRepo.mockResolvedValueOnce({ syncedCount: 0, error: 'offline', errorType: 'network' })
    useSyncStore.setState({ repoSyncMeta: { 'owner/one': queuedMeta('capture') } })
    renderHook(() => useAutoSync())

    await act(async () => { await vi.advanceTimersByTimeAsync(2_500) })
    expect(useSyncStore.getState().repoSyncMeta['owner/one']).toMatchObject({
      deliveryState: 'needs-attention',
      retryCount: 1,
    })

    await act(async () => { await vi.advanceTimersByTimeAsync(2_000) })
    expect(mockSyncRepo).toHaveBeenCalledTimes(2)
    expect(mockSyncRepo).toHaveBeenLastCalledWith(expect.objectContaining({ reason: 'retry' }))
  })

  it('keeps a mutation queued when it arrives during a successful sync', async () => {
    mockSyncRepo.mockImplementationOnce(async () => {
      useSyncStore.getState().setRepoSyncMeta('owner/one', {
        deliveryState: 'queued',
        lastMutationKind: 'edit',
        lastMutationAt: new Date().toISOString(),
      })
      return { syncedCount: 1 }
    })
    useSyncStore.setState({ repoSyncMeta: { 'owner/one': queuedMeta('capture') } })
    renderHook(() => useAutoSync())

    await act(async () => { await vi.advanceTimersByTimeAsync(2_500) })

    expect(useSyncStore.getState().repoSyncMeta['owner/one'].deliveryState).toBe('queued')
  })
})

function queuedMeta(lastMutationKind: 'capture' | 'edit' | 'deletion'): RepoSyncMeta {
  return {
    lastSyncedSha: null,
    lastSyncAt: null,
    localRevision: 1,
    lastSyncedRevision: 0,
    conflict: null,
    setupState: 'unconfigured',
    deliveryState: 'queued',
    lastMutationKind,
    lastMutationAt: new Date().toISOString(),
    retryCount: 0,
    nextRetryAt: null,
  }
}
