import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Task } from '../../types/task'

// Mock octokit-provider — must use vi.hoisted for variables in vi.mock factories
const { mockOctokit } = vi.hoisted(() => {
  const mockOctokit = {
    rest: {
      repos: {
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
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
  formatTasksAsMarkdown,
  getFileContent,
  commitTasks,
} from './sync-service'
import { useSyncStore } from '../../stores/useSyncStore'

function createTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'test-id-1',
    username: 'testuser',
    title: 'Fix the login bug',
    body: 'Users are seeing an error on the login page',
    createdAt: '2026-03-14T10:00:00.000Z',
    isImportant: false,
    syncStatus: 'pending',
    githubIssueNumber: null,
    ...overrides,
  }
}

describe('sync-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    sessionStorageMock.clear()
    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'encrypted',
      selectedRepo: {
        id: 1,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      },
      tasks: [],
      isSyncing: false,
      lastSyncedAt: null,
      syncEngineStatus: 'idle',
      syncError: null,
    })
  })

  describe('formatTasksAsMarkdown', () => {
    it('formats a single task without body', () => {
      const task = createTask({ body: '', isImportant: false })
      const result = formatTasksAsMarkdown([task])
      expect(result).toBe(
        '- [ ] **Fix the login bug** ([Created: 2026-03-14]) (Priority: ⚪ Normal)',
      )
    })

    it('formats a task with body', () => {
      const task = createTask()
      const result = formatTasksAsMarkdown([task])
      expect(result).toContain('- [ ] **Fix the login bug**')
      expect(result).toContain(
        '\n  Users are seeing an error on the login page',
      )
    })

    it('formats an important task', () => {
      const task = createTask({ isImportant: true })
      const result = formatTasksAsMarkdown([task])
      expect(result).toContain('Priority: 🔴 Important')
    })

    it('formats multiple tasks separated by newlines', () => {
      const tasks = [
        createTask({ id: '1', title: 'Task 1', body: '' }),
        createTask({ id: '2', title: 'Task 2', body: '' }),
      ]
      const result = formatTasksAsMarkdown(tasks)
      const lines = result.split('\n')
      expect(lines).toHaveLength(2)
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
      )

      expect(
        mockOctokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'testuser',
          repo: 'my-repo',
          path: 'captured-ideas-testuser.md',
          message: 'sync: add 1 captured idea from code-tasks',
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
        ),
      ).rejects.toEqual({ status: 409 })

      // Verify it attempted all 3 retries
      expect(
        mockOctokit.rest.repos.createOrUpdateFileContents,
      ).toHaveBeenCalledTimes(3)
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
      )

      const call =
        mockOctokit.rest.repos.createOrUpdateFileContents.mock.calls[0][0]
      expect(call.message).toBe(
        'sync: add 2 captured ideas from code-tasks',
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

    it('returns 0 when user is null', async () => {
      useSyncStore.setState({ user: null })

      const result = await syncPendingTasks()

      expect(result.syncedCount).toBe(0)
      expect(result.error).toBe('No repo or user selected')
    })
  })
})
