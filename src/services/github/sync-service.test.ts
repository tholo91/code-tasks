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
  getFileContent,
  commitTasks,
  getScopedFileName,
} from './sync-service'
import { useSyncStore } from '../../stores/useSyncStore'
import { HEADER_SIGNATURE } from '../../features/sync/utils/markdown-templates'

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
      expect(content).toContain('Old manual task')
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
  })
})
