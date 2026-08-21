import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Task } from '../../types/task'

// Mock octokit-provider — must use vi.hoisted for variables in vi.mock factories
const { mockOctokit } = vi.hoisted(() => {
  const mockOctokit = {
    rest: {
      repos: {
        get: vi.fn(),
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
      },
      git: {
        getRef: vi.fn(),
        createRef: vi.fn(),
      },
    },
  }
  return { mockOctokit }
})

vi.mock('./octokit-provider', () => ({
  recoverOctokit: vi.fn().mockResolvedValue(mockOctokit),
}))

// Mock crypto-utils (needed by store)
vi.mock('../storage/crypto-utils', () => ({
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

// Import after mocks
import {
  syncPendingTasks,
  syncAllRepoTasks,
  getFileContent,
  commitTasks,
  getScopedFileName,
  classifySyncError,
  fetchRemoteTasksForRepo,
} from './sync-service'
import { useSyncStore } from '../../stores/useSyncStore'
import { HEADER_SIGNATURE, MANAGED_START, MANAGED_END } from '../../features/sync/utils/markdown-templates'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id-1',
    username: 'testuser',
    repoFullName: 'testuser/my-repo',
    title: 'Fix the login bug',
    body: 'Users are seeing an error on the login page',
    createdAt: '2026-03-14T10:00:00.000Z',
    isImportant: false,
    isCompleted: false,
    completedAt: null,
    updatedAt: null,
    order: 0,
    syncStatus: 'pending',
    githubIssueNumber: null,
    handoffStatus: null,
    proofUrl: null,
    handledAt: null,
    processedBy: null,
    ...overrides,
  }
}

describe('getScopedFileName', () => {
  it('returns captured-ideas-{username}.md for a given username', () => {
    expect(getScopedFileName('thomas')).toBe('captured-ideas-thomas.md')
  })

  it('handles usernames with hyphens and numbers', () => {
    expect(getScopedFileName('dev-user-42')).toBe('captured-ideas-dev-user-42.md')
  })

  it('returns different file names for different users', () => {
    const file1 = getScopedFileName('alice')
    const file2 = getScopedFileName('bob')
    expect(file1).not.toBe(file2)
    expect(file1).toBe('captured-ideas-alice.md')
    expect(file2).toBe('captured-ideas-bob.md')
  })
})

describe('sync-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    sessionStorageMock.clear()
    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      selectedRepo: {
        id: 1,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      },
      tasks: [],
      isSyncing: false,
      lastSyncedAt: null,
      repoSyncMeta: {},
      repoTombstones: {},
      syncEngineStatus: 'idle',
      syncError: null,
    })
  })

  describe('getFileContent', () => {
    it('returns content and sha when file exists', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: btoa('# My File\nHello'),
          sha: 'abc123',
        },
      })

      const result = await getFileContent(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'test.md',
      )

      expect(result).toEqual({
        content: '# My File\nHello',
        sha: 'abc123',
      })
    })

    it('returns null when file does not exist (404)', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })

      const result = await getFileContent(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'nonexistent.md',
      )

      expect(result).toBeNull()
    })

    it('throws on other errors', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 500,
        message: 'Server error',
      })

      await expect(
        getFileContent(
          mockOctokit as any,
          'testuser',
          'my-repo',
          'test.md',
        ),
      ).rejects.toEqual({ status: 500, message: 'Server error' })
    })

    it('reads a configured branch when ref is provided', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: btoa('# My File'), sha: 'branch-sha' },
      })

      await getFileContent(mockOctokit as any, 'testuser', 'my-repo', 'test.md', 'gitty/testuser')

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'my-repo',
        path: 'test.md',
        ref: 'gitty/testuser',
      })
    })
  })

  describe('fetchRemoteTasksForRepo', () => {
    it('maps a receipt from the configured capture branch', async () => {
      const content = '- [x] **Ship handoff** ([Created: 2026-07-22]) (Priority: ⚪ Normal) [Capture revision: revision-1] [Gitty: Done] [Proof: https://github.com/testuser/my-repo/pull/42] [Handled: 2026-07-22T10:10:00.000Z] [Processed by: Codex] <!-- ct:task-1 -->'
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: Buffer.from(content, 'utf-8').toString('base64'), sha: 'receipt-sha' },
      })

      const result = await fetchRemoteTasksForRepo('testuser/my-repo', 'testuser', 'gitty/testuser')

      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(expect.objectContaining({ ref: 'gitty/testuser' }))
      expect(result.tasks[0]).toMatchObject({
        id: 'task-1',
        captureRevision: 'revision-1',
        processedBy: 'Codex',
        handoffStatus: 'done',
        proofUrl: 'https://github.com/testuser/my-repo/pull/42',
      })
    })
  })

  describe('commitTasks', () => {
    it('creates a new file when none exists', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
      )

      expect(
        mockOctokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'testuser',
          repo: 'my-repo',
          path: 'captured-ideas-testuser.md',
          message: 'sync: update 1 task via code-tasks',
        }),
      )

      // Should NOT include sha for new file
      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.sha).toBeUndefined()
    })

    it('appends to existing file with sha', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: btoa('# Existing content'),
          sha: 'existing-sha',
        },
      })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.sha).toBe('existing-sha')
    })

    it('retries on 409 conflict', async () => {
      // First call: return existing file
      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({
          data: { content: btoa('# Content'), sha: 'sha-1' },
        })
        .mockResolvedValueOnce({
          data: { content: btoa('# Updated Content'), sha: 'sha-2' },
        })

      // First commit: 409 conflict, second: success
      mockOctokit.rest.repos.createOrUpdateFileContents
        .mockRejectedValueOnce({ status: 409 })
        .mockResolvedValueOnce({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
      )

      expect(
        mockOctokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(2)
      // Second call should use sha-2
      const secondCall =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[1][0]
      expect(secondCall.sha).toBe('sha-2')
    })

    it('throws after max conflict retries', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: btoa('# Content'), sha: 'sha-old' },
      })

      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 409,
      })

      const task = createTask({ body: '' })
      await expect(
        commitTasks(
          mockOctokit as any,
          'testuser',
          'my-repo',
          'captured-ideas-testuser.md',
          [task],
          'testuser',
        ),
      ).rejects.toEqual({ status: 409 })

      // Verify it attempted all 3 retries
      expect(
        mockOctokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(3)
    })

    it('includes AI-Ready header when creating new file', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      const content = decodeURIComponent(escape(atob(call.content)))
      expect(content).toContain(HEADER_SIGNATURE)
      expect(content).toContain('# Captured Ideas - testuser')
      expect(content).toContain(MANAGED_START)
      expect(content).toContain(MANAGED_END)
      expect(content).toContain('**Fix the login bug**')
    })

    it('injects header into existing file without header', async () => {
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: btoa('- [ ] Old manual task'),
          sha: 'existing-sha',
        },
      })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      const content = decodeURIComponent(escape(atob(call.content)))
      expect(content).toContain(HEADER_SIGNATURE)
      expect(content).toContain(MANAGED_START)
      expect(content).toContain(MANAGED_END)
      expect(content).toContain('**Fix the login bug**')
    })

    it('does not duplicate header for file that already has it', async () => {
      const existingWithHeader = `${HEADER_SIGNATURE}\n# Captured Ideas\n\n- [ ] Existing task`
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: {
          content: btoa(existingWithHeader),
          sha: 'existing-sha',
        },
      })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      const content = decodeURIComponent(escape(atob(call.content)))
      // Should have only one header signature
      const firstIdx = content.indexOf(HEADER_SIGNATURE)
      const secondIdx = content.indexOf(HEADER_SIGNATURE, firstIdx + 1)
      expect(secondIdx).toBe(-1)
    })

    it('adds [skip ci] to commit message when skipCi option is true', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
        undefined,
        undefined,
        true,
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.message).toBe(
        'sync: update 1 task via code-tasks [skip ci]',
      )
    })

    it('does not add [skip ci] when skipCi is false or undefined', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const task = createTask({ body: '' })
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        [task],
        'testuser',
        undefined,
        undefined,
        false,
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.message).toBe(
        'sync: update 1 task via code-tasks',
      )
      expect(call.message).not.toContain('[skip ci]')
    })

    it('uses plural in commit message for multiple tasks', async () => {
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const tasks = [
        createTask({ id: '1', body: '' }),
        createTask({ id: '2', title: 'Second task', body: '' }),
      ]
      await commitTasks(
        mockOctokit as any,
        'testuser',
        'my-repo',
        'captured-ideas-testuser.md',
        tasks,
        'testuser',
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.message).toBe(
        'sync: update 2 tasks via code-tasks',
      )
    })
  })

  describe('syncPendingTasks', () => {
    it('returns 0 when no repo is selected', async () => {
      useSyncStore.setState({ selectedRepo: null })

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(0)
      expect(result.error).toBe('No repo or user selected')
    })

    it('returns 0 when no pending tasks exist', async () => {
      useSyncStore.setState({
        tasks: [createTask({ syncStatus: 'synced' })],
      })

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(0)
    })

    it('syncs pending tasks and marks them as synced', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(1)

      // Verify task was marked as synced
      const state = useSyncStore.getState()
      expect(state.tasks[0].syncStatus).toBe('synced')
    })

    it('passes all repo tasks to commitTasks but only marks pending as synced', async () => {
      const syncedTask = createTask({
        id: 'synced-1',
        title: 'Already synced',
        syncStatus: 'synced',
        createdAt: '2026-03-13T10:00:00.000Z',
      })
      const pendingTask = createTask({
        id: 'pending-1',
        title: 'New pending task',
        syncStatus: 'pending',
        createdAt: '2026-03-14T10:00:00.000Z',
      })
      useSyncStore.setState({ tasks: [syncedTask, pendingTask] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(1)

      // Verify the file content includes BOTH tasks (all repo tasks)
      const call = mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      const content = decodeURIComponent(escape(atob(call.content)))
      expect(content).toContain('**Already synced**')
      expect(content).toContain('**New pending task**')

      // Only the pending task should have been marked as synced
      const state = useSyncStore.getState()
      expect(state.tasks.find((t: Task) => t.id === 'synced-1')?.syncStatus).toBe('synced')
      expect(state.tasks.find((t: Task) => t.id === 'pending-1')?.syncStatus).toBe('synced')

      expect(call.message).toBe('sync: 2 tasks (2 active, 0 completed) via code-tasks')
    })

    it('only syncs tasks belonging to the current user', async () => {
      const myTask = createTask({ id: '1', username: 'testuser' })
      const otherTask = createTask({ id: '2', username: 'otheruser' })
      useSyncStore.setState({ tasks: [myTask, otherTask] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(1)
      // Only testuser's task should be synced
      const state = useSyncStore.getState()
      expect(state.tasks.find((t) => t.id === '1')?.syncStatus).toBe('synced')
      expect(state.tasks.find((t) => t.id === '2')?.syncStatus).toBe('pending')
    })

    it('only syncs tasks belonging to the currently selected repository', async () => {
      const myRepoTask = createTask({ id: '1', repoFullName: 'testuser/my-repo' })
      const otherRepoTask = createTask({ id: '2', repoFullName: 'testuser/other-repo' })
      useSyncStore.setState({ 
        tasks: [myRepoTask, otherRepoTask],
        selectedRepo: { id: 1, fullName: 'testuser/my-repo', owner: 'testuser' }
      })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(1)
      // Only task for my-repo should be synced
      const state = useSyncStore.getState()
      expect(state.tasks.find((t) => t.id === '1')?.syncStatus).toBe('synced')
      expect(state.tasks.find((t) => t.id === '2')?.syncStatus).toBe('pending')
    })

    it('uses getScopedFileName for the target file path', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      await syncPendingTasks()

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.path).toBe('captured-ideas-testuser.md')
    })

    it('returns 0 when user is null', async () => {
      useSyncStore.setState({ user: null })

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(0)
      expect(result.error).toBe('No repo or user selected')
    })

    it('returns errorType branch-protection for 403 with protection message', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 403,
        message: 'push declined due to repository rule violations',
      })

      const result = await syncPendingTasks({ maxRetries: 0 })

      expect(result.errorType).toBe('branch-protection')
      expect(result.syncedCount).toBe(0)
    })

    it('returns errorType branch-protection for 422 with protected branch message', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 422,
        message: 'protected branch hook declined',
      })

      const result = await syncPendingTasks({ maxRetries: 0 })

      expect(result.errorType).toBe('branch-protection')
    })

    it('returns errorType auth for 401 error', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 401,
        message: 'Bad credentials',
      })

      const result = await syncPendingTasks({ maxRetries: 0 })

      expect(result.errorType).toBe('auth')
    })

    it('returns errorType unknown for generic errors', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValue({
        status: 400,
        message: 'Something went wrong',
      })

      const result = await syncPendingTasks({ maxRetries: 0 })

      expect(result.errorType).toBe('unknown')
    })

    it('passes branch parameter to commitTasks and getFileContent', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } })
      mockOctokit.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'main-sha' } } })
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks({ branch: 'gitty/user' })

      expect(result.syncedCount).toBe(1)
      expect(mockOctokit.rest.repos.getContent).toHaveBeenCalledWith(
        expect.objectContaining({ ref: 'gitty/user' })
      )
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({ branch: 'gitty/user' })
      )
    })

    it('creates branch from default branch HEAD when it does not exist', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } })
      // First getRef for target branch fails with 404
      mockOctokit.rest.git.getRef
        .mockRejectedValueOnce({ status: 404 })
        // Second getRef for default branch succeeds
        .mockResolvedValueOnce({ data: { object: { sha: 'main-sha' } } })
      
      mockOctokit.rest.git.createRef.mockResolvedValue({})
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      await syncPendingTasks({ branch: 'gitty/user' })

      expect(mockOctokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'testuser',
        repo: 'my-repo',
        ref: 'refs/heads/gitty/user',
        sha: 'main-sha',
      })
    })

    it('adds [skip ci] to commit message when skipCi option is passed', async () => {
      const task = createTask()
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks({ skipCi: true })

      expect(result.syncedCount).toBe(1)
      const call = mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.message).toContain('[skip ci]')
    })

    it('safely merges a branch push when only the remote SHA changed', async () => {
      const task = createTask()
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 1,
            conflict: null,
          }
        }
      })

      mockOctokit.rest.repos.get.mockResolvedValue({ data: { default_branch: 'main' } })
      mockOctokit.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'main-sha' } } })
      // Branch remote SHA differs from the recorded baseline — must trigger the conflict gate
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: { content: btoa('# content'), sha: 'new-remote-sha' } })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks({ branch: 'gitty/user' })

      expect(result.status).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalled()
    })
  })

  describe('syncAllRepoTasks', () => {
    it('excludes archived tasks from the commit message counts', async () => {
      // 1 active + 1 completed + 1 archived-completed. The archived task is
      // omitted from the file, so the counts must not include it.
      const activeTask = createTask({
        id: 'active-1',
        title: 'Active task',
        body: 'still open',
        isCompleted: false,
      })
      const completedTask = createTask({
        id: 'completed-1',
        title: 'Completed task',
        body: 'done',
        isCompleted: true,
        completedAt: '2026-03-14T12:00:00.000Z',
      })
      const archivedTask = createTask({
        id: 'archived-1',
        title: 'Archived task',
        body: '[Archived] no longer relevant',
        isCompleted: true,
        completedAt: '2026-03-14T13:00:00.000Z',
      })
      useSyncStore.setState({ tasks: [activeTask, completedTask, archivedTask] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      await syncAllRepoTasks()

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      // 2 tasks counted (1 active, 1 completed) — archived excluded
      expect(call.message).toBe(
        'sync: 2 tasks (1 active, 1 completed) via code-tasks',
      )

      // Sanity: archived task is not in the written file content
      const content = decodeURIComponent(escape(atob(call.content)))
      expect(content).not.toContain('**Archived task**')
    })

    it('re-reads and retries safely when remote moves mid-push (409)', async () => {
      const task = createTask({ id: 'race-1', title: 'Race task', captureRevision: 'race-1' })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'sha-baseline',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 1,
            conflict: null,
          },
        },
      })

      // Initial fetch matches the baseline. The retry reads the new SHA and the
      // remote inbox again before rebuilding the Markdown.
      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({ data: { content: btoa('# content'), sha: 'sha-baseline' } })
        .mockResolvedValueOnce({ data: { content: btoa('# agent edit'), sha: 'agent-sha' } })
        .mockResolvedValueOnce({ data: { content: btoa('# agent edit'), sha: 'agent-sha' } })

      mockOctokit.rest.repos.createOrUpdateFileContents
        .mockRejectedValueOnce({ status: 409 })
        .mockResolvedValueOnce({ data: { content: { sha: 'merged-sha' } } })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.status).toBeUndefined()
      expect(result.error).toBeUndefined()
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2)
      expect(mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[1][0].sha).toBe('agent-sha')
    })

    it('opens a task-level conflict when the same capture revision diverges during a 409 retry', async () => {
      const task = createTask({
        id: 'race-1',
        title: 'Race task',
        body: 'Phone version',
        captureRevision: 'race-1',
      })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'sha-baseline',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 1,
            conflict: null,
          },
        },
      })

      const remoteContent = '- [ ] **Race task** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Capture revision: race-1] <!-- ct:race-1 -->\n  Repository version'
      const encodedRemoteContent = Buffer.from(remoteContent, 'utf-8').toString('base64')
      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({ data: { content: btoa('# content'), sha: 'sha-baseline' } })
        .mockResolvedValueOnce({ data: { content: encodedRemoteContent, sha: 'agent-sha' } })
        .mockResolvedValueOnce({ data: { content: encodedRemoteContent, sha: 'agent-sha' } })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockRejectedValueOnce({ status: 409 })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.status).toBe('conflict')
      expect(result.remoteSha).toBe('agent-sha')
      expect(useSyncStore.getState().repoSyncMeta['testuser/my-repo'].conflict?.taskIds).toEqual(['race-1'])
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(1)
    })

    it('keeps an edit made during the active PUT pending for the next sync', async () => {
      const task = createTask({
        id: 'in-flight-edit',
        body: 'Snapshot body',
        captureRevision: 'revision-before-put',
      })
      useSyncStore.setState({ tasks: [task] })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockImplementationOnce(async () => {
        useSyncStore.getState().updateTask(task.id, { body: 'Edited while PUT was active' })
        return { data: { content: { sha: 'uploaded-sha' } } }
      })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.syncedCount).toBe(1)
      const current = useSyncStore.getState().tasks.find((item) => item.id === task.id)
      expect(current).toMatchObject({
        body: 'Edited while PUT was active',
        syncStatus: 'pending',
      })
      expect(current?.captureRevision).not.toBe('revision-before-put')
      expect(useSyncStore.getState().repoSyncMeta['testuser/my-repo'].deliveryState).toBe('queued')

      const uploaded = decodeURIComponent(escape(atob(
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0].content,
      )))
      expect(uploaded).toContain('Snapshot body')
      expect(uploaded).not.toContain('Edited while PUT was active')
    })

    it('keeps an edit made during the remote merge read', async () => {
      const task = createTask({
        id: 'remote-read-edit',
        body: 'Snapshot body',
        captureRevision: 'revision-before-read',
      })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 0,
            conflict: null,
          },
        },
      })

      const remoteContent = '- [ ] **Test Task** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Capture revision: revision-before-read] <!-- ct:remote-read-edit -->\n  Snapshot body'
      const encoded = Buffer.from(remoteContent, 'utf-8').toString('base64')
      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({ data: { content: encoded, sha: 'new-sha' } })
        .mockImplementationOnce(async () => {
          useSyncStore.getState().updateTask(task.id, { body: 'Edited while remote read was active' })
          return { data: { content: encoded, sha: 'new-sha' } }
        })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: { content: { sha: 'uploaded-sha' } },
      })

      await syncAllRepoTasks({ maxRetries: 0 })

      const current = useSyncStore.getState().tasks.find((item) => item.id === task.id)
      expect(current).toMatchObject({
        body: 'Edited while remote read was active',
        syncStatus: 'synced',
      })
      const uploaded = decodeURIComponent(escape(atob(
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0].content,
      )))
      expect(uploaded).toContain('Edited while remote read was active')
      expect(uploaded).not.toContain('Snapshot body')
    })

    it('clears only tombstones included in the sync snapshot', async () => {
      const snapshotTombstone = {
        taskId: 'deleted-before-sync',
        captureRevision: 'revision-1',
        deletedAt: '2026-03-14T10:00:00.000Z',
      }
      const newerTombstone = {
        taskId: 'deleted-during-sync',
        captureRevision: 'revision-2',
        deletedAt: '2026-03-14T10:01:00.000Z',
      }
      useSyncStore.setState({
        repoTombstones: { 'testuser/my-repo': [snapshotTombstone] },
      })

      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockImplementationOnce(async () => {
        useSyncStore.setState((state) => ({
          repoTombstones: {
            ...state.repoTombstones,
            'testuser/my-repo': [
              ...(state.repoTombstones['testuser/my-repo'] ?? []),
              newerTombstone,
            ],
          },
        }))
        return { data: { content: { sha: 'uploaded-sha' } } }
      })

      await syncAllRepoTasks({ maxRetries: 0 })

      expect(useSyncStore.getState().repoTombstones['testuser/my-repo']).toEqual([newerTombstone])
      expect(useSyncStore.getState().repoSyncMeta['testuser/my-repo'].deliveryState).toBe('queued')
    })

    it('preserves connect-pending after a successful inbox sync', async () => {
      const task = createTask()
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: null,
            lastSyncAt: null,
            localRevision: 1,
            lastSyncedRevision: 0,
            conflict: null,
            setupState: 'connect-pending',
          },
        },
      })
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404 })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: { content: { sha: 'uploaded-sha' } },
      })

      await syncAllRepoTasks({ maxRetries: 0 })

      expect(useSyncStore.getState().repoSyncMeta['testuser/my-repo'].setupState).toBe('connect-pending')
    })

    it('aborts when the remote merge read fails instead of merging an empty inbox', async () => {
      const task = createTask({ captureRevision: 'revision-1' })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 0,
            conflict: null,
          },
        },
      })
      mockOctokit.rest.repos.getContent
        .mockResolvedValueOnce({ data: { content: btoa('# moved'), sha: 'new-sha' } })
        .mockRejectedValueOnce({ status: 500, message: 'Remote read failed' })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.syncedCount).toBe(0)
      expect(result.error).toBe('Network error. Please check your connection.')
      expect(result.rawError?.message).toBe('Remote read failed')
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled()
      expect(useSyncStore.getState().tasks[0].syncStatus).toBe('pending')
    })

    it('merges a verified agent receipt only when the capture revision and content match', async () => {
      const task = createTask({
        id: 'receipt-task',
        title: 'Phone capture',
        body: 'Original details',
        captureRevision: 'revision-1',
      })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 0,
            conflict: null,
          },
        },
      })
      const remoteContent = '- [x] **Phone capture** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Capture revision: revision-1] [Gitty: Done] [Proof: https://github.com/testuser/my-repo/pull/42] [Handled: 2026-03-14T11:00:00.000Z] [Processed by: Codex] <!-- ct:receipt-task -->\n  Original details'
      const encoded = Buffer.from(remoteContent, 'utf-8').toString('base64')
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: encoded, sha: 'receipt-sha' },
      })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: { content: { sha: 'merged-sha' } },
      })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.status).toBeUndefined()
      expect(useSyncStore.getState().tasks[0]).toMatchObject({
        body: 'Original details',
        captureRevision: 'revision-1',
        handoffStatus: 'done',
        processedBy: 'Codex',
        proofUrl: 'https://github.com/testuser/my-repo/pull/42',
        syncStatus: 'synced',
      })
    })

    it('keeps a newer phone capture and does not import a stale receipt', async () => {
      const task = createTask({
        id: 'stale-receipt-task',
        title: 'New phone title',
        body: 'New phone details',
        captureRevision: 'phone-revision-2',
      })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 2,
            lastSyncedRevision: 1,
            conflict: null,
          },
        },
      })
      const remoteContent = '- [x] **Old phone title** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Capture revision: phone-revision-1] [Gitty: Done] [Proof: https://github.com/testuser/my-repo/pull/41] [Handled: 2026-03-14T11:00:00.000Z] [Processed by: Codex] <!-- ct:stale-receipt-task -->\n  Old phone details'
      const encoded = Buffer.from(remoteContent, 'utf-8').toString('base64')
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: encoded, sha: 'stale-receipt-sha' },
      })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: { content: { sha: 'new-phone-sha' } },
      })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.status).toBeUndefined()
      expect(useSyncStore.getState().tasks[0]).toMatchObject({
        title: 'New phone title',
        body: 'New phone details',
        captureRevision: 'phone-revision-2',
        handoffStatus: null,
        processedBy: null,
        proofUrl: null,
      })
      const uploaded = decodeURIComponent(escape(atob(
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0].content,
      )))
      expect(uploaded).toContain('[Capture revision: phone-revision-2]')
      expect(uploaded).not.toMatch(/- \[[ x]\].*\[Gitty: Done\]/)
    })

    it('conflicts when capture content diverges on the same revision even with a receipt', async () => {
      const task = createTask({
        id: 'divergent-task',
        title: 'Same title',
        body: 'Phone content',
        captureRevision: 'shared-revision',
      })
      useSyncStore.setState({
        tasks: [task],
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 1,
            lastSyncedRevision: 0,
            conflict: null,
          },
        },
      })
      const remoteContent = '- [x] **Same title** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Capture revision: shared-revision] [Gitty: Done] [Proof: https://github.com/testuser/my-repo/pull/42] [Handled: 2026-03-14T11:00:00.000Z] [Processed by: Codex] <!-- ct:divergent-task -->\n  Repository content'
      const encoded = Buffer.from(remoteContent, 'utf-8').toString('base64')
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: encoded, sha: 'divergent-sha' },
      })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.status).toBe('conflict')
      expect(useSyncStore.getState().repoSyncMeta['testuser/my-repo'].conflict?.taskIds).toEqual(['divergent-task'])
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled()
      expect(useSyncStore.getState().tasks[0]).toMatchObject({
        body: 'Phone content',
        syncStatus: 'pending',
        handoffStatus: null,
      })
    })

    it('conflicts instead of deleting a remote task with a different capture revision', async () => {
      const tombstone = {
        taskId: 'deleted-task',
        captureRevision: 'deleted-revision-1',
        deletedAt: '2026-03-14T10:00:00.000Z',
      }
      useSyncStore.setState({
        repoTombstones: { 'testuser/my-repo': [tombstone] },
        repoSyncMeta: {
          'testuser/my-repo': {
            lastSyncedSha: 'old-sha',
            lastSyncAt: '2026-03-14T10:00:00.000Z',
            localRevision: 2,
            lastSyncedRevision: 1,
            conflict: null,
          },
        },
      })
      const remoteContent = '- [ ] **Recreated remotely** ([Created: 2026-03-14]) (Priority: ⚪ Normal) [Capture revision: remote-revision-2] <!-- ct:deleted-task -->'
      const encoded = Buffer.from(remoteContent, 'utf-8').toString('base64')
      mockOctokit.rest.repos.getContent.mockResolvedValue({
        data: { content: encoded, sha: 'new-remote-sha' },
      })

      const result = await syncAllRepoTasks({ maxRetries: 0 })

      expect(result.status).toBe('conflict')
      expect(useSyncStore.getState().repoSyncMeta['testuser/my-repo'].conflict?.taskIds).toEqual(['deleted-task'])
      expect(useSyncStore.getState().repoTombstones['testuser/my-repo']).toEqual([tombstone])
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled()
    })
  })

  describe('classifySyncError', () => {
    it('returns branch-protection for 403 with protection message', () => {
      const result = classifySyncError({
        status: 403,
        message: 'push declined due to repository rule violations',
      })
      expect(result.errorType).toBe('branch-protection')
    })

    it('returns branch-protection for 422 with protected branch message', () => {
      const result = classifySyncError({
        status: 422,
        message: 'protected branch hook declined',
      })
      expect(result.errorType).toBe('branch-protection')
    })

    it('returns branch-protection for 422 with pull request message', () => {
      const result = classifySyncError({
        status: 422,
        message: 'Changes must be made through a pull request',
      })
      expect(result.errorType).toBe('branch-protection')
    })

    it('returns auth for 401 error', () => {
      const result = classifySyncError({ status: 401, message: 'Bad credentials' })
      expect(result.errorType).toBe('auth')
    })

    it('returns auth for 403 with token message', () => {
      const result = classifySyncError({
        status: 403,
        message: 'Resource not accessible by personal access token',
      })
      expect(result.errorType).toBe('auth')
      expect(result.message).toContain('cannot write to this repository')
    })

    it('returns network for errors without status', () => {
      const result = classifySyncError(new TypeError('Failed to fetch'))
      expect(result.errorType).toBe('network')
    })

    it('returns unknown for null/undefined', () => {
      expect(classifySyncError(null).errorType).toBe('unknown')
      expect(classifySyncError(undefined).errorType).toBe('unknown')
    })

    it('returns unknown for generic errors with status', () => {
      const result = classifySyncError({ status: 400, message: 'Bad request' })
      expect(result.errorType).toBe('unknown')
    })
  })

  describe('prepareAgentConnectBranch', () => {
    beforeEach(() => {
      mockOctokit.rest.repos.getContent.mockReset()
      mockOctokit.rest.repos.createOrUpdateFileContents.mockReset()
    })

    it('creates exact signed blocks on a deterministic setup branch', async () => {
      const { prepareAgentConnectBranch } = await import('./sync-service')
      mockOctokit.rest.git.getRef.mockResolvedValue({ data: { object: { sha: 'setup-sha' } } })
      mockOctokit.rest.repos.getContent.mockRejectedValue({
        status: 404,
        message: 'Not Found',
      })

      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({
        data: { content: { sha: 'newsha' } },
      })

      const result = await prepareAgentConnectBranch({
        repo: 'owner/repo',
        defaultBranch: 'main',
        captureBranch: 'gitty/tholo91',
        username: 'tholo91',
      })
      expect(result.setupBranch).toBe('gitty/connect-tholo91')
      expect(result.compareUrl).toContain('main...gitty%2Fconnect-tholo91')
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledTimes(2)
      const decoded = Buffer.from(mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0].content, 'base64').toString('utf-8')
      expect(decoded).toContain('origin/gitty/tholo91:captured-ideas-tholo91.md')
    })
  })
})
