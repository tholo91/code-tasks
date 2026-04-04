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
  getFileContent,
  commitTasks,
  getScopedFileName,
  classifySyncError,
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
      expect(content).toContain('# Captured Ideas — testuser')
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

      // Commit message should reference 1 (pending count, not total)
      expect(call.message).toBe('sync: update 1 task via code-tasks')
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

    it('skips conflict detection when branch is provided', async () => {
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
      // Remote SHA is different (normally a conflict)
      mockOctokit.rest.repos.getContent.mockResolvedValue({ data: { content: btoa('# content'), sha: 'new-remote-sha' } })
      mockOctokit.rest.repos.createOrUpdateFileContents.mockResolvedValue({})

      const result = await syncPendingTasks({ branch: 'gitty/user' })

      expect(result.error).toBeUndefined()
      expect(result.syncedCount).toBe(1)
      expect(result.status).not.toBe('conflict')
      expect(mockOctokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalled()
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
})
