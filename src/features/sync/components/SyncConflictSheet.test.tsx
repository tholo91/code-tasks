import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import type { Task } from '../../../types/task'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

const { mockFetchRemoteTasksForRepo, mockPersistTaskToIDB } = vi.hoisted(() => ({
  mockFetchRemoteTasksForRepo: vi.fn(),
  mockPersistTaskToIDB: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../services/github/sync-service', () => ({
  fetchRemoteTasksForRepo: (...args: unknown[]) => mockFetchRemoteTasksForRepo(...args),
}))

vi.mock('../../../services/storage/storage-service', () => ({
  StorageService: {
    persistTaskToIDB: (...args: unknown[]) => mockPersistTaskToIDB(...args),
  },
}))

import { useSyncStore } from '../../../stores/useSyncStore'
import { SyncConflictSheet } from './SyncConflictSheet'

const repoFullName = 'testuser/my-repo'
const repoKey = repoFullName.toLowerCase()

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    username: 'testuser',
    repoFullName,
    title: 'Phone capture',
    body: 'Phone body',
    createdAt: '2026-08-21T10:00:00.000Z',
    updatedAt: null,
    isImportant: false,
    isCompleted: false,
    completedAt: null,
    order: 0,
    syncStatus: 'pending',
    githubIssueNumber: null,
    captureRevision: 'phone-revision',
    handoffStatus: 'done',
    proofUrl: 'https://example.com/proof',
    handledAt: '2026-08-21T10:00:00.000Z',
    processedBy: 'agent',
    ...overrides,
  }
}

function conflictMeta(taskIds: string[]) {
  return {
    lastSyncedSha: 'old-sha',
    lastSyncAt: null,
    localRevision: 1,
    lastSyncedRevision: 0,
    conflict: { remoteSha: 'remote-sha', detectedAt: '2026-08-21T10:00:00.000Z', taskIds },
    setupState: 'ready' as const,
    deliveryState: 'needs-attention' as const,
    lastMutationKind: 'edit' as const,
    lastMutationAt: null,
    retryCount: 0,
    nextRetryAt: null,
  }
}

function resetStore() {
  useSyncStore.setState({
    tasks: [],
    repoTombstones: {},
    repoSyncMeta: {},
    repoSyncBranches: {},
    syncEngineStatus: 'conflict',
  })
}

async function renderSheet(remote: Task | Task[], onClose = vi.fn()) {
  mockFetchRemoteTasksForRepo.mockResolvedValue({ tasks: Array.isArray(remote) ? remote : [remote], sha: 'remote-sha' })
  render(<SyncConflictSheet isOpen repoFullName={repoFullName} username="testuser" onClose={onClose} />)
  await waitFor(() => expect(mockFetchRemoteTasksForRepo).toHaveBeenCalledWith(repoFullName, 'testuser', undefined))
  return onClose
}

describe('SyncConflictSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStore()
  })

  it('keeps the phone content as a new pending revision so the retry converges', async () => {
    const local = task()
    const remote = task({ title: 'Repository capture', body: 'Repository body', captureRevision: 'repo-revision', syncStatus: 'synced' })
    useSyncStore.setState({ tasks: [local], repoSyncMeta: { [repoKey]: conflictMeta([local.id]) } })

    await renderSheet(remote)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Keep phone version' }))

    const resolved = useSyncStore.getState().tasks[0]
    expect(resolved).toMatchObject({
      title: 'Phone capture',
      body: 'Phone body',
      syncStatus: 'pending',
      handoffStatus: null,
      proofUrl: null,
      handledAt: null,
      processedBy: null,
    })
    expect(resolved.captureRevision).not.toBe(local.captureRevision)
    expect(resolved.captureRevision).not.toBe(remote.captureRevision)
    expect(mockPersistTaskToIDB).toHaveBeenCalledWith(resolved)
  })

  it('preserves unrelated tasks and conflict IDs while resolving one capture', async () => {
    const local = task()
    const unrelated = task({ id: 'other-task', title: 'Other phone capture', captureRevision: 'other-phone-revision' })
    const remote = task({ title: 'Repository capture', body: 'Repository body', captureRevision: 'repo-revision', syncStatus: 'synced' })
    const otherRemote = task({ id: unrelated.id, title: 'Other repository capture', captureRevision: 'other-repo-revision', syncStatus: 'synced' })
    const meta = conflictMeta([local.id, unrelated.id])
    useSyncStore.setState({ tasks: [local, unrelated], repoSyncMeta: { [repoKey]: meta } })

    const onClose = await renderSheet([remote, otherRemote])
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Keep phone version' })[0])

    const state = useSyncStore.getState()
    expect(state.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: local.id, title: local.title, body: local.body, syncStatus: 'pending' }),
      unrelated,
    ]))
    expect(state.repoSyncMeta[repoKey].conflict?.taskIds).toEqual([unrelated.id])
    expect(state.repoSyncMeta[repoKey].deliveryState).toBe('needs-attention')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keeps a phone deletion aligned to the repository revision without touching other tombstones', async () => {
    const remote = task({ id: 'deleted-task', captureRevision: 'repo-revision', syncStatus: 'synced' })
    useSyncStore.setState({
      repoTombstones: {
        [repoKey]: [
          { taskId: remote.id, captureRevision: 'phone-revision', deletedAt: '2026-08-21T10:00:00.000Z' },
          { taskId: 'other-task', captureRevision: 'other-revision', deletedAt: '2026-08-21T10:00:00.000Z' },
        ],
      },
      repoSyncMeta: { [repoKey]: conflictMeta([remote.id]) },
    })

    await renderSheet(remote)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Keep phone version' }))

    const tombstones = useSyncStore.getState().repoTombstones[repoKey]
    expect(tombstones).toEqual(expect.arrayContaining([
      expect.objectContaining({ taskId: remote.id, captureRevision: expect.any(String) }),
      { taskId: 'other-task', captureRevision: 'other-revision', deletedAt: '2026-08-21T10:00:00.000Z' },
    ]))
    expect(tombstones.find((item) => item.taskId === remote.id)?.captureRevision).toBe(remote.captureRevision)
    expect(useSyncStore.getState().tasks).toEqual([])
  })

  it('uses the repository version for a deletion conflict and removes only its tombstone', async () => {
    const remote = task({ id: 'deleted-task', title: 'Repository recovery', captureRevision: 'repo-revision', syncStatus: 'synced' })
    useSyncStore.setState({
      tasks: [task({ id: 'untouched-task', title: 'Untouched task' })],
      repoTombstones: {
        [repoKey]: [
          { taskId: remote.id, captureRevision: 'old-revision', deletedAt: '2026-08-21T10:00:00.000Z' },
          { taskId: 'other-task', captureRevision: 'other-revision', deletedAt: '2026-08-21T10:00:00.000Z' },
        ],
      },
      repoSyncMeta: { [repoKey]: conflictMeta([remote.id]) },
    })

    await renderSheet(remote)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Use repo version' }))

    const state = useSyncStore.getState()
    expect(state.tasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'untouched-task', title: 'Untouched task' }),
      expect.objectContaining({ id: remote.id, title: 'Repository recovery', syncStatus: 'synced' }),
    ]))
    expect(state.repoTombstones[repoKey]).toEqual([
      { taskId: 'other-task', captureRevision: 'other-revision', deletedAt: '2026-08-21T10:00:00.000Z' },
    ])
    expect(mockPersistTaskToIDB).toHaveBeenCalledWith(expect.objectContaining({ id: remote.id }))
  })
})
