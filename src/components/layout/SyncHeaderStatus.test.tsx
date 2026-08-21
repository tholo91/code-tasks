import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

vi.mock('../../services/storage/crypto-utils', () => ({ encryptData: vi.fn(), decryptData: vi.fn() }))
const { mockSyncRepo } = vi.hoisted(() => ({ mockSyncRepo: vi.fn() }))
vi.mock('../../services/github/sync-service', () => ({
  syncRepo: (...args: unknown[]) => mockSyncRepo(...args),
  getScopedFileName: (username: string) => `captured-ideas-${username}.md`,
  classifySyncError: (cause: unknown) => ({
    message: cause instanceof Error ? cause.message : 'Sync failed',
    errorType: 'unknown',
    rawError: { status: null, message: cause instanceof Error ? cause.message : 'Sync failed' },
  }),
}))

const repo = { id: 1, fullName: 'testuser/repo', owner: 'testuser', defaultBranch: 'main' }

describe('SyncHeaderStatus', () => {
  beforeEach(() => {
    useSyncStore.setState({
      selectedRepo: repo,
      user: { login: 'testuser', avatarUrl: '', name: null },
      repoSyncBranches: { 'testuser/repo': 'gitty/testuser' },
      repoSyncMeta: {},
      repoSyncErrors: {},
      repoSkipCi: {},
    })
    mockSyncRepo.mockReset()
    mockSyncRepo.mockResolvedValue({ syncedCount: 1 })
  })

  it('shows phone-local state before the first sync', () => {
    render(<SyncHeaderStatus />)
    expect(screen.getByText('Saved on phone')).toBeInTheDocument()
  })

  it('shows syncing and in-repo states from repository metadata', () => {
    useSyncStore.setState({ repoSyncMeta: { 'testuser/repo': meta('syncing') } })
    const { rerender } = render(<SyncHeaderStatus />)
    expect(screen.getByText('Syncing')).toBeInTheDocument()
    useSyncStore.setState({ repoSyncMeta: { 'testuser/repo': meta('in-repo') } })
    rerender(<SyncHeaderStatus />)
    expect(screen.getByText(/In repo/)).toBeInTheDocument()
  })

  it('shows needs attention for a repository error', () => {
    useSyncStore.setState({ repoSyncMeta: { 'testuser/repo': meta('needs-attention') } })
    render(<SyncHeaderStatus />)
    expect(screen.getByText('Needs attention')).toBeInTheDocument()
  })

  it('retries with repository settings and records success', async () => {
    const user = userEvent.setup()
    useSyncStore.setState({
      repoSyncMeta: { 'testuser/repo': meta('needs-attention') },
      repoSkipCi: { 'testuser/repo': false },
      repoSyncErrors: {
        'testuser/repo': {
          error: 'Previous failure',
          errorType: 'network',
          rawError: null,
          timestamp: new Date().toISOString(),
        },
      },
    })
    render(<SyncHeaderStatus />)

    await user.click(screen.getByRole('button', { name: /Needs attention/ }))
    await user.click(screen.getByRole('button', { name: 'Retry now' }))

    await waitFor(() => expect(mockSyncRepo).toHaveBeenCalledWith(expect.objectContaining({
      repoFullName: 'testuser/repo',
      branch: 'gitty/testuser',
      skipCi: false,
      reason: 'retry',
    })))
    await waitFor(() => expect(useSyncStore.getState().repoSyncMeta['testuser/repo'].deliveryState).toBe('in-repo'))
    expect(useSyncStore.getState().repoSyncErrors['testuser/repo']).toBeUndefined()
  })

  it('does not mark a concurrent mutation as delivered after retry', async () => {
    const user = userEvent.setup()
    useSyncStore.setState({ repoSyncMeta: { 'testuser/repo': meta('needs-attention') } })
    mockSyncRepo.mockImplementationOnce(async () => {
      useSyncStore.getState().setRepoSyncMeta('testuser/repo', { deliveryState: 'queued' })
      return { syncedCount: 1 }
    })
    render(<SyncHeaderStatus />)

    await user.click(screen.getByRole('button', { name: /Needs attention/ }))
    await user.click(screen.getByRole('button', { name: 'Retry now' }))

    await waitFor(() => expect(useSyncStore.getState().repoSyncMeta['testuser/repo'].deliveryState).toBe('queued'))
  })
})

function meta(deliveryState: 'syncing' | 'in-repo' | 'needs-attention') {
  return {
    lastSyncedSha: null,
    lastSyncAt: new Date().toISOString(),
    localRevision: 1,
    lastSyncedRevision: 0,
    conflict: null,
    setupState: 'inbox-ready' as const,
    deliveryState,
    lastMutationKind: 'capture' as const,
    lastMutationAt: new Date().toISOString(),
    retryCount: 0,
    nextRetryAt: null,
  }
}
