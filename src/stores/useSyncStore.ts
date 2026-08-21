import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StorageService } from '../services/storage/storage-service'
import { TokenVault } from '../services/storage/token-vault'
import { clearOctokitInstance } from '../services/github/auth-service'
import { generateUUID } from '../utils/uuid'
import { buildMergedTaskList } from '../utils/task-diff'
import type { GitHubUser } from '../services/github/auth-service'
import type { Task, SortMode } from '../types/task'
import type { SyncErrorType, RawSyncError } from '../services/github/sync-service'

export interface SelectedRepo {
  id: number
  fullName: string
  owner: string
  defaultBranch: string
}

export type SyncEngineStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'
export type RepoSetupState = 'unconfigured' | 'inbox-ready' | 'connect-pending' | 'ready'
export type RepoDeliveryState = 'local-only' | 'queued' | 'syncing' | 'in-repo' | 'needs-attention'
export type RepoMutationKind = 'capture' | 'edit' | 'reorder' | 'completion' | 'deletion'

export interface RepoTombstone {
  taskId: string
  captureRevision: string
  deletedAt: string
}

export interface RepoSyncMeta {
  lastSyncedSha: string | null
  lastSyncAt: string | null
  localRevision: number
  lastSyncedRevision: number
  conflict: {
    remoteSha: string | null
    detectedAt: string
    taskIds: string[]
  } | null
  setupState: RepoSetupState
  deliveryState: RepoDeliveryState
  lastMutationKind: RepoMutationKind | null
  lastMutationAt: string | null
  retryCount: number
  nextRetryAt: string | null
}

export interface RepoSyncError {
  error: string
  errorType: SyncErrorType
  rawError: RawSyncError | null
  timestamp: string
}

export interface CaptureDraft {
  title: string
  notes: string
  isImportant: boolean
}

const isEmptyDraft = (draft: CaptureDraft) =>
  draft.title.length === 0 && draft.notes.length === 0 && !draft.isImportant

const normalizeRepoKey = (repoFullName: string) => repoFullName.toLowerCase()

const createDefaultRepoMeta = (): RepoSyncMeta => ({
  lastSyncedSha: null,
  lastSyncAt: null,
  localRevision: 0,
  lastSyncedRevision: 0,
  conflict: null,
  setupState: 'unconfigured',
  deliveryState: 'local-only',
  lastMutationKind: null,
  lastMutationAt: null,
  retryCount: 0,
  nextRetryAt: null,
})

const withMutation = (meta: RepoSyncMeta, kind: RepoMutationKind): RepoSyncMeta => ({
  ...meta,
  localRevision: meta.localRevision + 1,
  deliveryState: 'queued',
  lastMutationKind: kind,
  lastMutationAt: new Date().toISOString(),
})

interface SyncState {
  isAuthenticated: boolean
  user: GitHubUser | null
  token: string | null
  selectedRepo: SelectedRepo | null
  isImportant: boolean
  tasks: Task[]
  isSyncing: boolean
  lastSyncedAt: string | null
  repoSyncMeta: Record<string, RepoSyncMeta>
  syncEngineStatus: SyncEngineStatus
  syncError: string | null
  syncErrorType: SyncErrorType | null
  authError: string | null
  repoTombstones: Record<string, RepoTombstone[]>
  repoAutoSync: Record<string, boolean>
  repoSortModes: Record<string, SortMode>
  repoSyncBranches: Record<string, string>
  repoSkipCi: Record<string, boolean>
  repoClaudeCodeHintSeen: Record<string, boolean>
  repoSyncErrors: Record<string, RepoSyncError>
  errorSheetOpen: boolean
  repoDrafts: Record<string, CaptureDraft>

  setAuth: (token: string, user: GitHubUser) => Promise<void>
  clearAuth: (error?: string) => void
  setAuthError: (error: string | null) => void
  setSelectedRepo: (repo: SelectedRepo | null) => void
  toggleImportant: () => void
  addTask: (title: string, body: string) => Task
  updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>>) => void
  moveTaskToRepo: (taskId: string, targetRepoFullName: string) => void
  toggleComplete: (taskId: string) => void
  reorderTasks: (repoFullName: string, orderedTaskIds: string[]) => void
  markTaskSynced: (taskId: string, githubIssueNumber: number | null) => void
  removeTask: (taskId: string) => void
  removeTasks: (taskIds: string[]) => void
  setRepoDraft: (repoFullName: string, draft: CaptureDraft) => void
  clearRepoDraft: (repoFullName: string) => void
  loadTasksFromIDB: () => Promise<void>
  setSyncStatus: (status: SyncEngineStatus, error?: string, errorType?: SyncErrorType, rawError?: RawSyncError) => void
  setRepoSyncError: (repoFullName: string, error: string, errorType: SyncErrorType, rawError?: RawSyncError) => void
  clearRepoSyncError: (repoFullName: string) => void
  setErrorSheetOpen: (open: boolean) => void
  updateLastSyncedAt: () => void
  setRepoSyncMeta: (repoFullName: string, updates: Partial<RepoSyncMeta>) => void
  clearRepoConflict: (repoFullName: string) => void
  replaceTasksForRepo: (repoFullName: string, importedTasks: Task[]) => void
  mergeRemoteTasksForRepo: (repoFullName: string, remoteTasks: Task[]) => void
  setRepoSortMode: (repoFullName: string, mode: SortMode) => void
  setRepoSyncBranch: (repoFullName: string, branch: string | null) => void
  setRepoSkipCi: (repoFullName: string, enabled: boolean) => void
  setRepoAutoSync: (repoFullName: string, enabled: boolean) => void
  clearRepoTombstones: (repoFullName: string) => void
  setRepoClaudeCodeHintSeen: (repoFullName: string, seen: boolean) => void
}

/**
 * Selector for pending sync count scoped to current user and repo.
 */
export const selectPendingSyncCount = (state: SyncState) => {
  const { tasks, user, selectedRepo, repoTombstones } = state
  if (!user || !selectedRepo) return 0

  const selectedLower = selectedRepo.fullName.toLowerCase()
  const pendingCount = tasks.filter(
    (t) =>
      t.syncStatus === 'pending' &&
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower
  ).length
  // Treat pending deletions as at least 1 pending change for SyncFAB visibility
  return (repoTombstones[selectedLower]?.length ?? 0) > 0 ? Math.max(pendingCount, 1) : pendingCount
}

/**
 * Selector for unified change detection — includes pending tasks AND pending deletions.
 * Used by SyncFAB to determine visibility.
 */
export const selectHasUnsyncedChanges = (state: SyncState) => {
  const { tasks, user, selectedRepo, repoTombstones } = state
  if (!user || !selectedRepo) return false

  const selectedLower = selectedRepo.fullName.toLowerCase()
  if ((repoTombstones[selectedLower]?.length ?? 0) > 0) return true

  return tasks.some(
    (t) =>
      t.syncStatus === 'pending' &&
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower
  )
}

let lastPendingCountsTasks: Task[] | null = null
let lastPendingCountsUser: GitHubUser | null = null
let lastPendingCountsTombstones: Record<string, RepoTombstone[]> | null = null
let lastPendingCountsResult: Record<string, number> = {}

export const selectPendingSyncCountsByRepo = (state: SyncState) => {
  const { tasks, user, repoTombstones } = state
  if (
    tasks === lastPendingCountsTasks &&
    user === lastPendingCountsUser &&
    repoTombstones === lastPendingCountsTombstones
  ) {
    return lastPendingCountsResult
  }

  const counts: Record<string, number> = {}
  if (user) {
    for (const task of tasks) {
      if (task.syncStatus !== 'pending' || task.username !== user.login) continue
      const repoKey = task.repoFullName.toLowerCase()
      counts[repoKey] = (counts[repoKey] ?? 0) + 1
    }
    for (const [repoKey, tombstones] of Object.entries(repoTombstones)) {
      if (tombstones.length > 0) counts[repoKey] = (counts[repoKey] ?? 0) + tombstones.length
    }
  }

  lastPendingCountsTasks = tasks
  lastPendingCountsUser = user
  lastPendingCountsTombstones = repoTombstones
  lastPendingCountsResult = counts
  return counts
}

export const selectRepoSyncErrors = (state: SyncState) => state.repoSyncErrors

export const selectSyncBranch = (repoFullName: string) => (state: SyncState) =>
  state.repoSyncBranches[repoFullName.toLowerCase()] ?? null

export const selectRepoSkipCi = (repoFullName: string) => (state: SyncState) =>
  state.repoSkipCi[repoFullName.toLowerCase()] ?? true

export const selectRepoAutoSync = (repoFullName: string) => (state: SyncState) =>
  state.repoAutoSync[repoFullName.toLowerCase()] ?? false

export const selectRepoClaudeCodeHintSeen = (repoFullName: string) => (state: SyncState) =>
  state.repoClaudeCodeHintSeen[repoFullName.toLowerCase()] ?? false

export const selectRepoDraft = (repoFullName: string) => (state: SyncState) =>
  state.repoDrafts[repoFullName.toLowerCase()] ?? null

export const selectPendingSyncCountAllRepos = (state: SyncState) => {
  const counts = selectPendingSyncCountsByRepo(state)
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
}

let lastOpenCountsTasks: Task[] | null = null
let lastOpenCountsUser: GitHubUser | null = null
let lastOpenCountsResult: Record<string, number> = {}

/**
 * Selector for open (non-completed) task counts per repository.
 * Memoized to avoid recomputation on unrelated state changes.
 */
export const selectOpenTaskCountsByRepo = (state: SyncState) => {
  const { tasks, user } = state
  if (tasks === lastOpenCountsTasks && user === lastOpenCountsUser) {
    return lastOpenCountsResult
  }

  const counts: Record<string, number> = {}
  if (user) {
    for (const task of tasks) {
      if (task.isCompleted || task.username !== user.login) continue
      const repoKey = task.repoFullName.toLowerCase()
      counts[repoKey] = (counts[repoKey] ?? 0) + 1
    }
  }

  lastOpenCountsTasks = tasks
  lastOpenCountsUser = user
  lastOpenCountsResult = counts
  return counts
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      selectedRepo: null,
      isImportant: false,
      tasks: [],
      isSyncing: false,
      lastSyncedAt: null,
      repoSyncMeta: {},
      syncEngineStatus: 'idle' as SyncEngineStatus,
      syncError: null,
      syncErrorType: null,
      authError: null,
      repoTombstones: {},
      repoAutoSync: {},
      repoSortModes: {},
      repoSyncBranches: {},
      repoSkipCi: {},
      repoClaudeCodeHintSeen: {},
      repoSyncErrors: {},
      errorSheetOpen: false,
      repoDrafts: {},

      setAuth: async (token: string, user: GitHubUser) => {
        try {
          await TokenVault.storeToken(token)
          set({
            isAuthenticated: true,
            user,
            token,
            authError: null
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to secure token'
          set({ authError: message })
          throw error
        }
      },

      clearAuth: (error?: string) => {
        // Reset the hydration promise so next login triggers a fresh hydration cycle
        import('../components/auth/hydration').then(m => m.resetHydration())

        // Cleanup Octokit instance
        clearOctokitInstance()
        Promise.resolve(TokenVault.clearToken()).catch(() => {})

        set({ 
          isAuthenticated: false, 
          user: null, 
          token: null, 
          selectedRepo: null, 
          isImportant: false,
          authError: error ?? null
        })
      },

      setAuthError: (error: string | null) => {
        set({ authError: error })
      },

      setSelectedRepo: (repo: SelectedRepo | null) => {
        if (repo) {
          const repoKey = normalizeRepoKey(repo.fullName)
          const repoError = get().repoSyncErrors[repoKey]
          if (repoError) {
            // Restore this repo's error state
            set({
              selectedRepo: repo,
              syncEngineStatus: 'error',
              syncError: repoError.error,
              syncErrorType: repoError.errorType,
            })
          } else {
            // No error for this repo — clear global error state
            set({ selectedRepo: repo, syncEngineStatus: 'idle', syncErrorType: null, syncError: null })
          }
        } else {
          set({ selectedRepo: repo, syncErrorType: null, syncError: null })
        }
      },

      toggleImportant: () => {
        set((state) => ({ isImportant: !state.isImportant }))
      },

      addTask: (title: string, body: string): Task => {
        const { user, selectedRepo, isImportant } = get()
        const username = user?.login ?? 'anonymous'

        if (!selectedRepo) {
          throw new Error('Cannot create task without a selected repository')
        }

        const taskId = generateUUID()
        const task: Task = {
          id: taskId,
          username,
          repoFullName: selectedRepo.fullName,
          title,
          body,
          isImportant,
          isCompleted: false,
          completedAt: null,
          updatedAt: null,
          order: 0,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
          githubIssueNumber: null,
          captureRevision: taskId,
          handoffStatus: null,
          proofUrl: null,
          handledAt: null,
        }

        // Async: persist to IndexedDB (fire-and-forget, non-blocking)
        StorageService.persistTaskToIDB(task)

        // Update Zustand store — shift existing active tasks' order down
        set((state) => {
          const repoLower = normalizeRepoKey(selectedRepo!.fullName)
          const existingMeta = state.repoSyncMeta[repoLower] ?? createDefaultRepoMeta()
          const updatedTasks = state.tasks.map(t => {
            if (t.repoFullName.toLowerCase() === repoLower && !t.isCompleted) {
              const shifted = { ...t, order: (t.order ?? 0) + 1 }
              StorageService.persistTaskToIDB(shifted).catch(() => {})
              return shifted
            }
            return t
          })
          return {
            tasks: [task, ...updatedTasks],
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoLower]: {
                ...withMutation(existingMeta, 'capture'),
              },
            },
          }
        })

        return task
      },

      updateTask: (taskId: string, updates: Partial<Pick<Task, 'title' | 'body' | 'isImportant'>>) => {
        set((state) => {
          let targetRepoKey: string | null = null
          const updatedTasks = state.tasks.map(t => {
            if (t.id !== taskId) return t
            targetRepoKey = normalizeRepoKey(t.repoFullName)
            const captureChanged =
              ('title' in updates && updates.title !== t.title) ||
              ('body' in updates && updates.body !== t.body) ||
              ('isImportant' in updates && updates.isImportant !== t.isImportant)

            return {
              ...t,
              ...updates,
              updatedAt: new Date().toISOString(),
              syncStatus: 'pending' as const,
              ...(captureChanged
                ? {
                    captureRevision: generateUUID(),
                    handoffStatus: null,
                    proofUrl: null,
                    handledAt: null,
                    processedBy: null,
                    ...(t.handoffStatus === 'done'
                      ? { isCompleted: false, completedAt: null }
                      : {}),
                  }
                : {}),
            }
          })
          const updatedTask = updatedTasks.find(t => t.id === taskId)
          if (updatedTask) {
            StorageService.persistTaskToIDB(updatedTask).catch(() => {})
          }
          if (!targetRepoKey) {
            return { tasks: updatedTasks }
          }
          const existingMeta = state.repoSyncMeta[targetRepoKey] ?? createDefaultRepoMeta()
          return {
            tasks: updatedTasks,
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [targetRepoKey]: {
                ...withMutation(existingMeta, 'edit'),
              },
            },
          }
        })
      },

      moveTaskToRepo: (taskId: string, targetRepoFullName: string) => {
        set((state) => {
          const sourceTask = state.tasks.find((task) => task.id === taskId)
          const sourceRepoKey = sourceTask ? normalizeRepoKey(sourceTask.repoFullName) : null
          const targetRepoKey = normalizeRepoKey(targetRepoFullName)
          const updatedTasks = state.tasks.map(t => {
            if (t.id !== taskId) return t
            return { ...t, repoFullName: targetRepoFullName, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
          })
          const updatedTask = updatedTasks.find(t => t.id === taskId)
          if (updatedTask) {
            StorageService.persistTaskToIDB(updatedTask).catch(() => {})
          }
          const nextMeta = { ...state.repoSyncMeta }
          const nextTombstones = { ...state.repoTombstones }
          if (sourceRepoKey) {
            const existingMeta = nextMeta[sourceRepoKey] ?? createDefaultRepoMeta()
            nextMeta[sourceRepoKey] = {
              ...withMutation(existingMeta, 'deletion'),
            }
            if (sourceTask) {
              nextTombstones[sourceRepoKey] = [
                ...(nextTombstones[sourceRepoKey] ?? []),
                {
                  taskId: sourceTask.id,
                  captureRevision: sourceTask.captureRevision ?? sourceTask.id,
                  deletedAt: new Date().toISOString(),
                },
              ]
            }
          }
          const targetMeta = nextMeta[targetRepoKey] ?? createDefaultRepoMeta()
          nextMeta[targetRepoKey] = {
            ...withMutation(targetMeta, 'capture'),
          }
          return { tasks: updatedTasks, repoSyncMeta: nextMeta, repoTombstones: nextTombstones }
        })
      },

      toggleComplete: (taskId: string) => {
        const task = get().tasks.find(t => t.id === taskId)
        if (!task) return

        const nowCompleting = !task.isCompleted
        const updatedTask: Task = {
          ...task,
          isCompleted: nowCompleting,
          completedAt: nowCompleting ? new Date().toISOString() : null,
          syncStatus: 'pending' as const,
        }

        set((state) => ({
          tasks: state.tasks.map(t => t.id === taskId ? updatedTask : t),
          repoSyncMeta: (() => {
            const repoKey = normalizeRepoKey(task.repoFullName)
            const existingMeta = state.repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
            return {
              ...state.repoSyncMeta,
              [repoKey]: {
                ...withMutation(existingMeta, 'completion'),
              },
            }
          })(),
        }))

        StorageService.persistTaskToIDB(updatedTask).catch(() => {})
      },

      reorderTasks: (repoFullName: string, orderedTaskIds: string[]) => {
        const repoLower = normalizeRepoKey(repoFullName)
        set((state) => {
          const orderMap = new Map(orderedTaskIds.map((id, idx) => [id, idx]))
          const updatedTasks = state.tasks.map(t => {
            if (t.repoFullName.toLowerCase() !== repoLower) return t
            const newOrder = orderMap.get(t.id)
            if (newOrder === undefined || newOrder === t.order) return t
            const updated = { ...t, order: newOrder, syncStatus: 'pending' as const }
            StorageService.persistTaskToIDB(updated).catch(() => {})
            return updated
          })
          const existingMeta = state.repoSyncMeta[repoLower] ?? createDefaultRepoMeta()
          return {
            tasks: updatedTasks,
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoLower]: {
                ...withMutation(existingMeta, 'reorder'),
              },
            },
          }
        })
      },

      markTaskSynced: (taskId: string, githubIssueNumber: number | null) => {
        set((state) => {
          const updatedTasks = state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, syncStatus: 'synced' as const, githubIssueNumber }
              : t,
          )

          // Async: update in IndexedDB
          const updatedTask = updatedTasks.find((t) => t.id === taskId)
          if (updatedTask) {
            StorageService.persistTaskToIDB(updatedTask)
          }

          return { tasks: updatedTasks }
        })
      },

      removeTask: (taskId: string) => {
        set((state) => {
          const targetTask = state.tasks.find((t) => t.id === taskId)
          const updatedTasks = state.tasks.filter((t) => t.id !== taskId)

          // Async: remove from IndexedDB
          StorageService.deleteTaskFromIDB(taskId)

          if (!targetTask) {
            return { tasks: updatedTasks }
          }
          const repoKey = normalizeRepoKey(targetTask.repoFullName)
          const existingMeta = state.repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
          const tombstone: RepoTombstone = {
            taskId: targetTask.id,
            captureRevision: targetTask.captureRevision ?? targetTask.id,
            deletedAt: new Date().toISOString(),
          }
          return {
            tasks: updatedTasks,
            repoTombstones: {
              ...state.repoTombstones,
              [repoKey]: [...(state.repoTombstones[repoKey] ?? []), tombstone],
            },
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoKey]: {
                ...withMutation(existingMeta, 'deletion'),
              },
            },
          }
        })
      },

      removeTasks: (taskIds: string[]) => {
        if (taskIds.length === 0) return
        set((state) => {
          const idSet = new Set(taskIds)
          const targetTasks = state.tasks.filter((t) => idSet.has(t.id))
          if (targetTasks.length === 0) return state
          const remainingTasks = state.tasks.filter((t) => !idSet.has(t.id))

          // Async: remove from IndexedDB
          for (const t of targetTasks) {
            StorageService.deleteTaskFromIDB(t.id)
          }

          // Bump localRevision for each affected repo
          const nextMeta = { ...state.repoSyncMeta }
          const nextTombstones = { ...state.repoTombstones }
          const affectedRepoKeys = new Set(
            targetTasks.map((t) => normalizeRepoKey(t.repoFullName)),
          )
          for (const repoKey of affectedRepoKeys) {
            const existingMeta = nextMeta[repoKey] ?? createDefaultRepoMeta()
            nextMeta[repoKey] = {
              ...withMutation(existingMeta, 'deletion'),
            }
            nextTombstones[repoKey] = [
              ...(nextTombstones[repoKey] ?? []),
              ...targetTasks
                .filter((task) => normalizeRepoKey(task.repoFullName) === repoKey)
                .map((task) => ({
                  taskId: task.id,
                  captureRevision: task.captureRevision ?? task.id,
                  deletedAt: new Date().toISOString(),
                })),
            ]
          }

          return {
            tasks: remainingTasks,
            repoTombstones: nextTombstones,
            repoSyncMeta: nextMeta,
          }
        })
      },

      setRepoDraft: (repoFullName: string, draft: CaptureDraft) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => {
          // Auto-clear empty drafts so the persisted store doesn't accumulate noise
          if (isEmptyDraft(draft)) {
            if (!(key in state.repoDrafts)) return state
            const next = { ...state.repoDrafts }
            delete next[key]
            return { repoDrafts: next }
          }
          return {
            repoDrafts: { ...state.repoDrafts, [key]: draft },
          }
        })
      },

      clearRepoDraft: (repoFullName: string) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => {
          if (!(key in state.repoDrafts)) return state
          const next = { ...state.repoDrafts }
          delete next[key]
          return { repoDrafts: next }
        })
      },

      loadTasksFromIDB: async () => {
        const idbTasks = await StorageService.loadAllTasksFromIDB<Task>()
        if (idbTasks.length > 0) {
          const { tasks: localTasks, selectedRepo } = get()
          // Merge: IDB tasks that are not already in local state
          const localIds = new Set(localTasks.map((t) => t.id))
          let merged = [...localTasks]

          let migrated = false

          for (const t of idbTasks) {
            if (!localIds.has(t.id)) {
              // Migration: Assign repoFullName if missing and a repo is selected
              if (!t.repoFullName && selectedRepo) {
                t.repoFullName = selectedRepo.fullName
                migrated = true
              }
              merged.push(t)
            }
          }

          // Order migration: assign order to tasks missing the field without overwriting existing order
          let orderMigrated = false
          const needsOrder = (t: Task) => !Number.isFinite(t.order)
          const orderAssignments = new Map<string, number>()

          if (merged.some(needsOrder)) {
            const repoGroups = new Map<string, Task[]>()
            for (const t of merged) {
              const key = (t.repoFullName || '').toLowerCase()
              if (!repoGroups.has(key)) repoGroups.set(key, [])
              repoGroups.get(key)!.push(t)
            }

            for (const [, repoGroup] of repoGroups) {
              const active = repoGroup.filter(t => !t.isCompleted)
              const completed = repoGroup.filter(t => t.isCompleted)

              const activeWithOrder = active.filter(t => !needsOrder(t))
              const activeMissing = active.filter(t => needsOrder(t))

              let nextOrder = 0
              if (activeWithOrder.length > 0) {
                const maxOrder = Math.max(...activeWithOrder.map(t => t.order))
                nextOrder = maxOrder + 1
                if (activeMissing.length > 0) {
                  activeMissing.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  activeMissing.forEach((t, idx) => {
                    orderAssignments.set(t.id, nextOrder + idx)
                  })
                  nextOrder += activeMissing.length
                }
              } else if (activeMissing.length > 0) {
                activeMissing.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                activeMissing.forEach((t, idx) => {
                  orderAssignments.set(t.id, idx)
                })
                nextOrder = activeMissing.length
              }

              const completedMissing = completed.filter(t => needsOrder(t))
              if (completedMissing.length > 0) {
                completedMissing.sort((a, b) => {
                  const aTime = a.completedAt ? new Date(a.completedAt).getTime() : new Date(a.createdAt).getTime()
                  const bTime = b.completedAt ? new Date(b.completedAt).getTime() : new Date(b.createdAt).getTime()
                  return bTime - aTime
                })
                completedMissing.forEach((t, idx) => {
                  orderAssignments.set(t.id, nextOrder + idx)
                })
              }
            }
          }

          if (orderAssignments.size > 0) {
            orderMigrated = true
            merged = merged.map(t => {
              const newOrder = orderAssignments.get(t.id)
              return newOrder === undefined ? t : { ...t, order: newOrder }
            })
          }

          // Sort by order (lower = higher in list)
          merged.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

          set({ tasks: merged })

          // Persist migrated tasks back to IDB
          if (migrated || orderMigrated) {
            for (const t of merged) {
              if (t.repoFullName) {
                StorageService.persistTaskToIDB(t)
              }
            }
          }
        }
      },

      setSyncStatus: (status: SyncEngineStatus, error?: string, errorType?: SyncErrorType, rawError?: RawSyncError) => {
        const selectedRepo = get().selectedRepo
        const updates: Partial<SyncState> = {
          syncEngineStatus: status,
          isSyncing: status === 'syncing',
          syncError: error ?? null,
          syncErrorType: status === 'error' ? (errorType ?? 'unknown') : null,
        }
        if (selectedRepo) {
          const repoKey = normalizeRepoKey(selectedRepo.fullName)
          const existingMeta = get().repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
          updates.repoSyncMeta = {
            ...get().repoSyncMeta,
            [repoKey]: {
              ...existingMeta,
              deliveryState:
                status === 'syncing' ? 'syncing' :
                status === 'success' ? (existingMeta.deliveryState === 'queued' ? 'queued' : 'in-repo') :
                status === 'error' || status === 'conflict' ? 'needs-attention' :
                existingMeta.deliveryState,
              retryCount: status === 'success' ? 0 : existingMeta.retryCount,
              nextRetryAt: status === 'success' ? null : existingMeta.nextRetryAt,
            },
          }
        }
        if (status === 'success') {
          // Clear per-repo error on success
          if (selectedRepo) {
            const repoKey = normalizeRepoKey(selectedRepo.fullName)
            const nextErrors = { ...get().repoSyncErrors }
            delete nextErrors[repoKey]
            updates.repoSyncErrors = nextErrors
          }
        }
        if (status === 'error' && selectedRepo && error) {
          const repoKey = normalizeRepoKey(selectedRepo.fullName)
          updates.repoSyncErrors = {
            ...get().repoSyncErrors,
            [repoKey]: {
              error,
              errorType: errorType ?? 'unknown',
              rawError: rawError ?? null,
              timestamp: new Date().toISOString(),
            },
          }
        }
        set(updates as SyncState)
      },

      setRepoSyncError: (repoFullName: string, error: string, errorType: SyncErrorType, rawError?: RawSyncError) => {
        const repoKey = normalizeRepoKey(repoFullName)
        set((state) => ({
          repoSyncErrors: {
            ...state.repoSyncErrors,
            [repoKey]: {
              error,
              errorType,
              rawError: rawError ?? null,
              timestamp: new Date().toISOString(),
            },
          },
        }))
      },

      clearRepoSyncError: (repoFullName: string) => {
        const repoKey = normalizeRepoKey(repoFullName)
        set((state) => {
          const nextErrors = { ...state.repoSyncErrors }
          delete nextErrors[repoKey]
          return { repoSyncErrors: nextErrors }
        })
      },

      setErrorSheetOpen: (open: boolean) => {
        set({ errorSheetOpen: open })
      },

      updateLastSyncedAt: () => {
        const now = new Date().toISOString()
        const selectedRepo = get().selectedRepo
        if (!selectedRepo) {
          set({ lastSyncedAt: now })
          return
        }
        const repoKey = normalizeRepoKey(selectedRepo.fullName)
        set((state) => {
          const existingMeta = state.repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
          return {
            lastSyncedAt: now,
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoKey]: {
                ...existingMeta,
                lastSyncAt: now,
              },
            },
          }
        })
      },

      setRepoSyncMeta: (repoFullName: string, updates: Partial<RepoSyncMeta>) => {
        const repoKey = normalizeRepoKey(repoFullName)
        set((state) => {
          const existingMeta = state.repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
          return {
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoKey]: {
                ...existingMeta,
                ...updates,
              },
            },
          }
        })
      },

      clearRepoConflict: (repoFullName: string) => {
        const repoKey = normalizeRepoKey(repoFullName)
        set((state) => {
          const existingMeta = state.repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
          return {
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoKey]: {
                ...existingMeta,
                conflict: null,
              },
            },
          }
        })
      },

      replaceTasksForRepo: (repoFullName: string, importedTasks: Task[]) => {
        const repoKey = normalizeRepoKey(repoFullName)
        set((state) => {
          const remainingTasks = state.tasks.filter(
            (t) => t.repoFullName.toLowerCase() !== repoKey,
          )
          const removedTasks = state.tasks.filter(
            (t) => t.repoFullName.toLowerCase() === repoKey,
          )

          for (const removed of removedTasks) {
            StorageService.deleteTaskFromIDB(removed.id)
          }
          for (const task of importedTasks) {
            StorageService.persistTaskToIDB(task).catch(() => {})
          }

          return { tasks: [...remainingTasks, ...importedTasks] }
        })
      },

      mergeRemoteTasksForRepo: (repoFullName: string, remoteTasks: Task[]) => {
        const repoKey = normalizeRepoKey(repoFullName)
        set((state) => {
          const localTasks = state.tasks.filter((t) => t.repoFullName.toLowerCase() === repoKey)
          const merged = buildMergedTaskList(localTasks, remoteTasks)

          const remainingTasks = state.tasks.filter((t) => t.repoFullName.toLowerCase() !== repoKey)

          // Persist merged tasks to IDB; delete IDB entries for tasks that were dropped
          const mergedIds = new Set(merged.map((t) => t.id))
          for (const local of localTasks) {
            if (!mergedIds.has(local.id)) {
              StorageService.deleteTaskFromIDB(local.id)
            }
          }
          for (const task of merged) {
            StorageService.persistTaskToIDB(task).catch(() => {})
          }

          const existingMeta = state.repoSyncMeta[repoKey] ?? createDefaultRepoMeta()
          return {
            tasks: [...remainingTasks, ...merged],
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [repoKey]: {
                ...existingMeta,
                localRevision: existingMeta.localRevision + 1,
              },
            },
          }
        })
      },

      setRepoSortMode: (repoFullName: string, mode: SortMode) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => ({
          repoSortModes: { ...state.repoSortModes, [key]: mode },
        }))
      },

      setRepoSyncBranch: (repoFullName: string, branch: string | null) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => {
          const previousBranch = state.repoSyncBranches[key] ?? null
          if (previousBranch === branch) return state
          const updated = { ...state.repoSyncBranches }
          if (branch) {
            updated[key] = branch
          } else {
            delete updated[key]
          }
          const existingMeta = state.repoSyncMeta[key] ?? createDefaultRepoMeta()
          const wasConfigured =
            Object.prototype.hasOwnProperty.call(state.repoSyncBranches, key) ||
            existingMeta.setupState !== 'unconfigured' ||
            state.tasks.some((task) => task.repoFullName.toLowerCase() === key)
          if (!wasConfigured) return { repoSyncBranches: updated }

          const tasks = state.tasks.map((task) => {
            if (task.repoFullName.toLowerCase() !== key) return task
            const pendingTask = { ...task, syncStatus: 'pending' as const }
            StorageService.persistTaskToIDB(pendingTask).catch(() => {})
            return pendingTask
          })
          return {
            tasks,
            repoSyncBranches: updated,
            repoSyncMeta: {
              ...state.repoSyncMeta,
              [key]: {
                ...withMutation(existingMeta, 'edit'),
                setupState: 'unconfigured',
                conflict: null,
              },
            },
          }
        })
      },

      setRepoSkipCi: (repoFullName: string, enabled: boolean) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => {
          // Persist `false` explicitly: with the selector default now `true`,
          // an absent key reads as ON, so an explicit OFF must be stored.
          const updated = { ...state.repoSkipCi, [key]: enabled }
          return { repoSkipCi: updated }
        })
      },

      setRepoAutoSync: (repoFullName: string, enabled: boolean) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => ({
          repoAutoSync: { ...state.repoAutoSync, [key]: enabled },
        }))
      },

      clearRepoTombstones: (repoFullName: string) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => {
          const next = { ...state.repoTombstones }
          delete next[key]
          return { repoTombstones: next }
        })
      },

      setRepoClaudeCodeHintSeen: (repoFullName: string, seen: boolean) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => ({ repoClaudeCodeHintSeen: { ...state.repoClaudeCodeHintSeen, [key]: seen } }))
      },
    }),
    {
      name: 'code-tasks:store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        selectedRepo: state.selectedRepo,
        isImportant: state.isImportant,
        tasks: state.tasks,
        lastSyncedAt: state.lastSyncedAt,
        repoSyncMeta: state.repoSyncMeta,
        repoSortModes: state.repoSortModes,
        repoSyncBranches: state.repoSyncBranches,
        repoSkipCi: state.repoSkipCi,
        repoAutoSync: state.repoAutoSync,
        repoTombstones: state.repoTombstones,
        repoClaudeCodeHintSeen: state.repoClaudeCodeHintSeen,
        repoSyncErrors: state.repoSyncErrors,
        repoDrafts: state.repoDrafts,
      }),
      version: 3,
      migrate: (persisted, version) => {
        type LegacyTask = Task & { seenRevision?: string | null; seenAt?: string | null; seenBy?: string | null }
        const state = persisted as Omit<Partial<SyncState>, 'tasks'> & { tasks?: LegacyTask[] }
        if (version < 2) {
          if (state.selectedRepo && !state.selectedRepo.defaultBranch) {
            state.selectedRepo = { ...state.selectedRepo, defaultBranch: '' }
          }
          state.tasks = (state.tasks ?? []).map((task): Task => {
            const cleanTask = { ...task }
            delete cleanTask.seenRevision
            delete cleanTask.seenAt
            delete cleanTask.seenBy
            return cleanTask as Task
          })
        }
        if (version < 3) {
          if (state.selectedRepo && !state.selectedRepo.defaultBranch) {
            state.selectedRepo = { ...state.selectedRepo, defaultBranch: '' }
          }
          state.repoTombstones = state.repoTombstones ?? {}
          state.repoAutoSync = state.repoAutoSync ?? {}
          state.repoSyncMeta = Object.fromEntries(
            Object.entries(state.repoSyncMeta ?? {}).map(([key, rawMeta]) => {
              const meta = { ...createDefaultRepoMeta(), ...rawMeta }
              const legacyConflict = meta.conflict && !Array.isArray(meta.conflict.taskIds)
              return [
                key,
                {
                  ...meta,
                  conflict: legacyConflict ? null : meta.conflict,
                  deliveryState:
                    meta.deliveryState === 'syncing' || legacyConflict
                      ? 'queued'
                      : meta.deliveryState,
                },
              ]
            }),
          )
        }
        return state as SyncState
      },
      skipHydration: true,
    },
  ),
)
