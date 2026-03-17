import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Mock token-vault
const { mockStoreToken, mockClearToken } = vi.hoisted(() => ({
  mockStoreToken: vi.fn(),
  mockClearToken: vi.fn(),
}))
vi.mock('../services/storage/token-vault', () => ({
  TokenVault: {
    storeToken: (...args: unknown[]) => mockStoreToken(...args),
    loadToken: vi.fn().mockResolvedValue(null),
    clearToken: (...args: unknown[]) => mockClearToken(...args),
  },
}))

// Import after mocks
import { useSyncStore, selectHasUnsyncedChanges } from './useSyncStore'

describe('useSyncStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    // Reset store state
    useSyncStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      selectedRepo: null,
      isImportant: false,
      tasks: [],
      hasPendingDeletions: false,
      syncEngineStatus: 'idle',
      syncError: null,
      repoSyncMeta: {},
    })
  })

  it('has correct initial state', () => {
    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  describe('setAuth', () => {
    it('stores token via vault and resets authError', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )

      const state = useSyncStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.token).toBe('ghp_testtoken123')
      expect(state.authError).toBeNull()
      expect(mockStoreToken).toHaveBeenCalledWith('ghp_testtoken123')
    })
  })

  describe('clearAuth', () => {
    it('clears auth state and can set an error message', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )

      useSyncStore.getState().clearAuth('Session expired')

      const state = useSyncStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.token).toBeNull()
      expect(state.authError).toBe('Session expired')
      expect(mockClearToken).toHaveBeenCalled()
    })
  })

  describe('selectedRepo', () => {
    it('has null selectedRepo in initial state', () => {
      const state = useSyncStore.getState()
      expect(state.selectedRepo).toBeNull()
    })

    it('sets selected repo via setSelectedRepo', () => {
      const repo = {
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      }
      useSyncStore.getState().setSelectedRepo(repo)

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toEqual(repo)
    })

    it('clears selectedRepo when auth is cleared', async () => {
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })

      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )

      useSyncStore.getState().clearAuth()

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toBeNull()
    })
  })

  describe('isImportant', () => {
    it('has false as initial isImportant', () => {
      const state = useSyncStore.getState()
      expect(state.isImportant).toBe(false)
    })

    it('toggles isImportant from false to true', () => {
      useSyncStore.getState().toggleImportant()
      expect(useSyncStore.getState().isImportant).toBe(true)
    })

    it('toggles isImportant from true to false', () => {
      useSyncStore.getState().toggleImportant() // false -> true
      useSyncStore.getState().toggleImportant() // true -> false
      expect(useSyncStore.getState().isImportant).toBe(false)
    })

    it('resets isImportant when auth is cleared', async () => {
      useSyncStore.getState().toggleImportant()
      expect(useSyncStore.getState().isImportant).toBe(true)

      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )

      useSyncStore.getState().clearAuth()
      expect(useSyncStore.getState().isImportant).toBe(false)
    })
  })

  describe('addTask', () => {
    it('creates task with repoFullName from selected repo', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })

      const task = useSyncStore.getState().addTask('Test task', 'Task body')

      expect(task.repoFullName).toBe('testuser/my-repo')
      expect(task.username).toBe('testuser')
      expect(task.syncStatus).toBe('pending')
    })

    it('throws when no repo is selected', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )

      expect(() => useSyncStore.getState().addTask('Test task', 'Body')).toThrow(
        'Cannot create task without a selected repository',
      )
    })

    it('stores tasks scoped by repo — switching repos shows different tasks', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )

      // Add task to repo A
      useSyncStore.getState().setSelectedRepo({
        id: 1, fullName: 'testuser/repo-a', owner: 'testuser',
      })
      useSyncStore.getState().addTask('Task in A', '')

      // Add task to repo B
      useSyncStore.getState().setSelectedRepo({
        id: 2, fullName: 'testuser/repo-b', owner: 'testuser',
      })
      useSyncStore.getState().addTask('Task in B', '')

      const allTasks = useSyncStore.getState().tasks
      expect(allTasks).toHaveLength(2)

      const repoATasks = allTasks.filter((t) => t.repoFullName === 'testuser/repo-a')
      const repoBTasks = allTasks.filter((t) => t.repoFullName === 'testuser/repo-b')
      expect(repoATasks).toHaveLength(1)
      expect(repoATasks[0].title).toBe('Task in A')
      expect(repoBTasks).toHaveLength(1)
      expect(repoBTasks[0].title).toBe('Task in B')
    })
  })

  describe('toggleComplete', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('marks task as completed with isCompleted true and completedAt set', () => {
      const task = useSyncStore.getState().addTask('Test task', 'Body')
      useSyncStore.getState().toggleComplete(task.id)

      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.isCompleted).toBe(true)
      expect(updated.completedAt).toBeTruthy()
    })

    it('un-completes a completed task: isCompleted false, completedAt null', () => {
      const task = useSyncStore.getState().addTask('Test task', 'Body')
      useSyncStore.getState().toggleComplete(task.id)
      useSyncStore.getState().toggleComplete(task.id)

      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.isCompleted).toBe(false)
      expect(updated.completedAt).toBeNull()
    })

    it('resets syncStatus to pending when toggling a synced task', () => {
      const task = useSyncStore.getState().addTask('Test task', 'Body')
      useSyncStore.getState().markTaskSynced(task.id, 0)

      const synced = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(synced.syncStatus).toBe('synced')

      useSyncStore.getState().toggleComplete(task.id)
      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.syncStatus).toBe('pending')
    })
  })

  describe('updateTask', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('updates title, sets updatedAt, resets syncStatus to pending', () => {
      const task = useSyncStore.getState().addTask('Original title', 'Body')
      useSyncStore.getState().markTaskSynced(task.id, 1)

      useSyncStore.getState().updateTask(task.id, { title: 'New title' })

      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.title).toBe('New title')
      expect(updated.updatedAt).toBeTruthy()
      expect(updated.syncStatus).toBe('pending')
    })

    it('updates body', () => {
      const task = useSyncStore.getState().addTask('Title', '')

      useSyncStore.getState().updateTask(task.id, { body: 'New description' })

      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.body).toBe('New description')
    })

    it('updates isImportant', () => {
      const task = useSyncStore.getState().addTask('Title', '')

      useSyncStore.getState().updateTask(task.id, { isImportant: true })

      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.isImportant).toBe(true)
    })

    it('does nothing for nonexistent taskId', () => {
      useSyncStore.getState().addTask('Title', '')
      const tasksBefore = useSyncStore.getState().tasks.length

      useSyncStore.getState().updateTask('nonexistent-id', { title: 'Nope' })

      expect(useSyncStore.getState().tasks.length).toBe(tasksBefore)
    })
  })

  describe('moveTaskToRepo', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('changes repoFullName, sets updatedAt, resets syncStatus', () => {
      const task = useSyncStore.getState().addTask('Task to move', '')
      useSyncStore.getState().markTaskSynced(task.id, 1)

      useSyncStore.getState().moveTaskToRepo(task.id, 'testuser/other-repo')

      const updated = useSyncStore.getState().tasks.find(t => t.id === task.id)!
      expect(updated.repoFullName).toBe('testuser/other-repo')
      expect(updated.updatedAt).toBeTruthy()
      expect(updated.syncStatus).toBe('pending')
    })
  })

  describe('reorderTasks', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('assigns sequential order values based on orderedTaskIds', () => {
      const task1 = useSyncStore.getState().addTask('Task 1', '')
      const task2 = useSyncStore.getState().addTask('Task 2', '')
      const task3 = useSyncStore.getState().addTask('Task 3', '')

      // Reorder: task3, task1, task2
      useSyncStore.getState().reorderTasks('testuser/my-repo', [task3.id, task1.id, task2.id])

      const tasks = useSyncStore.getState().tasks
      expect(tasks.find(t => t.id === task3.id)!.order).toBe(0)
      expect(tasks.find(t => t.id === task1.id)!.order).toBe(1)
      expect(tasks.find(t => t.id === task2.id)!.order).toBe(2)
    })

    it('sets syncStatus to pending on reordered tasks', () => {
      const taskA = useSyncStore.getState().addTask('Task A', '')
      const taskB = useSyncStore.getState().addTask('Task B', '')
      useSyncStore.getState().markTaskSynced(taskA.id, null)
      useSyncStore.getState().markTaskSynced(taskB.id, null)
      expect(useSyncStore.getState().tasks.find(t => t.id === taskA.id)!.syncStatus).toBe('synced')
      expect(useSyncStore.getState().tasks.find(t => t.id === taskB.id)!.syncStatus).toBe('synced')

      // Swap order to force a change.
      useSyncStore.getState().reorderTasks('testuser/my-repo', [taskA.id, taskB.id])

      expect(useSyncStore.getState().tasks.find(t => t.id === taskA.id)!.syncStatus).toBe('pending')
      expect(useSyncStore.getState().tasks.find(t => t.id === taskB.id)!.syncStatus).toBe('pending')
    })

    it('does not affect tasks in other repos', () => {
      const task1 = useSyncStore.getState().addTask('Task 1', '')

      // Switch repo and add task
      useSyncStore.getState().setSelectedRepo({
        id: 2, fullName: 'testuser/other-repo', owner: 'testuser',
      })
      const task2 = useSyncStore.getState().addTask('Task 2', '')

      // Reorder only my-repo
      useSyncStore.getState().reorderTasks('testuser/my-repo', [task1.id])

      // task2 should be unchanged
      const otherTask = useSyncStore.getState().tasks.find(t => t.id === task2.id)!
      expect(otherTask.syncStatus).toBe('pending')
      expect(otherTask.order).toBe(0) // was set to 0 by addTask
    })
  })

  describe('addTask order', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('assigns order 0 to new task', () => {
      const task = useSyncStore.getState().addTask('Test task', '')
      expect(task.order).toBe(0)
    })

    it('increments order of existing active tasks when adding a new task', () => {
      const task1 = useSyncStore.getState().addTask('Task 1', '')
      const task2 = useSyncStore.getState().addTask('Task 2', '')

      const tasks = useSyncStore.getState().tasks
      // task2 is newest (order 0), task1 was shifted to order 1
      expect(tasks.find(t => t.id === task2.id)!.order).toBe(0)
      expect(tasks.find(t => t.id === task1.id)!.order).toBeGreaterThan(0)
    })
  })

  describe('removeTask', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('removes task from state', () => {
      const task = useSyncStore.getState().addTask('Task to delete', '')
      expect(useSyncStore.getState().tasks.find(t => t.id === task.id)).toBeDefined()

      useSyncStore.getState().removeTask(task.id)

      expect(useSyncStore.getState().tasks.find(t => t.id === task.id)).toBeUndefined()
    })

    it('sets hasPendingDeletions to true', () => {
      expect(useSyncStore.getState().hasPendingDeletions).toBe(false)

      const task = useSyncStore.getState().addTask('Task to delete', '')
      useSyncStore.getState().removeTask(task.id)

      expect(useSyncStore.getState().hasPendingDeletions).toBe(true)
    })

    it('does not affect other tasks', () => {
      const task1 = useSyncStore.getState().addTask('Keep this', '')
      const task2 = useSyncStore.getState().addTask('Delete this', '')

      useSyncStore.getState().removeTask(task2.id)

      const tasks = useSyncStore.getState().tasks
      expect(tasks.find(t => t.id === task1.id)).toBeDefined()
      expect(tasks.find(t => t.id === task2.id)).toBeUndefined()
    })

    it('increments localRevision for the task repo', () => {
      const task = useSyncStore.getState().addTask('Task', '')
      const repoKey = 'testuser/my-repo'
      const revisionBefore = useSyncStore.getState().repoSyncMeta[repoKey]?.localRevision ?? 0

      useSyncStore.getState().removeTask(task.id)

      const revisionAfter = useSyncStore.getState().repoSyncMeta[repoKey]?.localRevision ?? 0
      expect(revisionAfter).toBeGreaterThan(revisionBefore)
    })
  })

  describe('hasPendingDeletions', () => {
    it('is false in initial state', () => {
      expect(useSyncStore.getState().hasPendingDeletions).toBe(false)
    })

    it('resets to false when setSyncStatus is called with success', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
      const task = useSyncStore.getState().addTask('Task', '')
      useSyncStore.getState().removeTask(task.id)
      expect(useSyncStore.getState().hasPendingDeletions).toBe(true)

      useSyncStore.getState().setSyncStatus('success')

      expect(useSyncStore.getState().hasPendingDeletions).toBe(false)
    })

    it('does not reset on non-success status', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
      const task = useSyncStore.getState().addTask('Task', '')
      useSyncStore.getState().removeTask(task.id)

      useSyncStore.getState().setSyncStatus('syncing')
      expect(useSyncStore.getState().hasPendingDeletions).toBe(true)

      useSyncStore.getState().setSyncStatus('error', 'Some error')
      expect(useSyncStore.getState().hasPendingDeletions).toBe(true)
    })
  })

  describe('selectPendingSyncCount with hasPendingDeletions', () => {
    it('returns at least 1 when hasPendingDeletions is true even with 0 pending tasks', async () => {
      const { selectPendingSyncCount } = await import('./useSyncStore')
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
      // Add and immediately remove — no pending tasks left, but hasPendingDeletions = true
      const task = useSyncStore.getState().addTask('Task', '')
      useSyncStore.getState().markTaskSynced(task.id, null)
      useSyncStore.getState().removeTask(task.id)

      const count = selectPendingSyncCount(useSyncStore.getState())
      expect(count).toBeGreaterThanOrEqual(1)
    })
  })

  describe('syncErrorType', () => {
    it('setSyncStatus with error sets syncErrorType', () => {
      useSyncStore.getState().setSyncStatus('error', 'Branch protection', 'branch-protection')
      const state = useSyncStore.getState()
      expect(state.syncErrorType).toBe('branch-protection')
      expect(state.syncError).toBe('Branch protection')
    })

    it('setSyncStatus with error defaults errorType to unknown', () => {
      useSyncStore.getState().setSyncStatus('error', 'Something failed')
      expect(useSyncStore.getState().syncErrorType).toBe('unknown')
    })

    it('setSyncStatus with success resets syncErrorType to null', () => {
      useSyncStore.getState().setSyncStatus('error', 'err', 'branch-protection')
      expect(useSyncStore.getState().syncErrorType).toBe('branch-protection')

      useSyncStore.getState().setSyncStatus('success')
      expect(useSyncStore.getState().syncErrorType).toBeNull()
    })

    it('setSelectedRepo resets syncErrorType to null', () => {
      useSyncStore.getState().setSyncStatus('error', 'err', 'branch-protection')
      expect(useSyncStore.getState().syncErrorType).toBe('branch-protection')

      useSyncStore.getState().setSelectedRepo({ id: 2, fullName: 'user/other', owner: 'user' })
      expect(useSyncStore.getState().syncErrorType).toBeNull()
      expect(useSyncStore.getState().syncError).toBeNull()
    })

    it('syncErrorType is null initially', () => {
      expect(useSyncStore.getState().syncErrorType).toBeNull()
    })
  })

  describe('selectHasUnsyncedChanges', () => {
    beforeEach(async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
      )
      useSyncStore.getState().setSelectedRepo({
        id: 42,
        fullName: 'testuser/my-repo',
        owner: 'testuser',
      })
    })

    it('returns true when there are pending tasks', () => {
      useSyncStore.getState().addTask('Test task', '')
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(true)
    })

    it('returns false when all tasks are synced and no pending deletions', () => {
      const task = useSyncStore.getState().addTask('Test task', '')
      useSyncStore.getState().markTaskSynced(task.id, null)
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(false)
    })

    it('returns true when hasPendingDeletions is true', () => {
      const task = useSyncStore.getState().addTask('Test task', '')
      useSyncStore.getState().markTaskSynced(task.id, null)
      useSyncStore.getState().removeTask(task.id)
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(true)
    })

    it('returns false when no user is set', () => {
      useSyncStore.setState({ user: null })
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(false)
    })

    it('returns false when no repo is selected', () => {
      useSyncStore.setState({ selectedRepo: null })
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(false)
    })

    it('resets to false after successful sync status', () => {
      const task = useSyncStore.getState().addTask('Test task', '')
      useSyncStore.getState().markTaskSynced(task.id, null)
      useSyncStore.getState().removeTask(task.id)
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(true)

      useSyncStore.getState().setSyncStatus('success')
      expect(selectHasUnsyncedChanges(useSyncStore.getState())).toBe(false)
    })
  })

  describe('persist middleware', () => {
    it('is configured with skipHydration and persist API', () => {
      expect(useSyncStore.persist).toBeDefined()
      expect(useSyncStore.persist.rehydrate).toBeDefined()
    })
  })

  describe('setRepoSortMode', () => {
    it('stores sort mode for a repo under its normalized key', () => {
      useSyncStore.getState().setRepoSortMode('Owner/Repo', 'created-desc')
      const modes = useSyncStore.getState().repoSortModes
      expect(modes['owner/repo']).toBe('created-desc')
    })

    it('setting mode for repo A does not affect repo B', () => {
      useSyncStore.getState().setRepoSortMode('user/repo-a', 'priority-first')
      useSyncStore.getState().setRepoSortMode('user/repo-b', 'updated-desc')
      const modes = useSyncStore.getState().repoSortModes
      expect(modes['user/repo-a']).toBe('priority-first')
      expect(modes['user/repo-b']).toBe('updated-desc')
    })

    it('default (no key set) returns undefined — callers treat as manual', () => {
      const modes = useSyncStore.getState().repoSortModes
      expect(modes['nonexistent/repo']).toBeUndefined()
    })

    it('mode can be updated for the same repo', () => {
      useSyncStore.getState().setRepoSortMode('user/repo', 'created-desc')
      useSyncStore.getState().setRepoSortMode('user/repo', 'manual')
      expect(useSyncStore.getState().repoSortModes['user/repo']).toBe('manual')
    })
  })
})
