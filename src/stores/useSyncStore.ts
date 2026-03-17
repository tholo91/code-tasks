import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StorageService } from '../services/storage/storage-service'
import { TokenVault } from '../services/storage/token-vault'
import { clearOctokitInstance } from '../services/github/auth-service'
import { generateUUID } from '../utils/uuid'
import type { GitHubUser } from '../services/github/auth-service'
import type { Task, SortMode } from '../types/task'
import type { SyncErrorType } from '../services/github/sync-service'

export interface SelectedRepo {
  id: number
  fullName: string
  owner: string
}

export type SyncEngineStatus = 'idle' | 'syncing' | 'success' | 'error' | 'conflict'

export interface RepoSyncMeta {
  lastSyncedSha: string | null
  lastSyncAt: string | null
  localRevision: number
  lastSyncedRevision: number
  conflict: {
    remoteSha: string | null
    detectedAt: string
  } | null
}

const normalizeRepoKey = (repoFullName: string) => repoFullName.toLowerCase()

const createDefaultRepoMeta = (): RepoSyncMeta => ({
  lastSyncedSha: null,
  lastSyncAt: null,
  localRevision: 0,
  lastSyncedRevision: 0,
  conflict: null,
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
  hasPendingDeletions: boolean
  repoSortModes: Record<string, SortMode>

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
  loadTasksFromIDB: () => Promise<void>
  setSyncStatus: (status: SyncEngineStatus, error?: string, errorType?: SyncErrorType) => void
  updateLastSyncedAt: () => void
  setRepoSyncMeta: (repoFullName: string, updates: Partial<RepoSyncMeta>) => void
  clearRepoConflict: (repoFullName: string) => void
  replaceTasksForRepo: (repoFullName: string, importedTasks: Task[]) => void
  setRepoSortMode: (repoFullName: string, mode: SortMode) => void
}

/**
 * Selector for pending sync count scoped to current user and repo.
 */
export const selectPendingSyncCount = (state: SyncState) => {
  const { tasks, user, selectedRepo, hasPendingDeletions } = state
  if (!user || !selectedRepo) return 0

  const selectedLower = selectedRepo.fullName.toLowerCase()
  const pendingCount = tasks.filter(
    (t) =>
      t.syncStatus === 'pending' &&
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower
  ).length
  // Treat pending deletions as at least 1 pending change for SyncFAB visibility
  return hasPendingDeletions ? Math.max(pendingCount, 1) : pendingCount
}

/**
 * Selector for unified change detection — includes pending tasks AND pending deletions.
 * Used by SyncFAB to determine visibility.
 */
export const selectHasUnsyncedChanges = (state: SyncState) => {
  const { tasks, user, selectedRepo, hasPendingDeletions } = state
  if (!user || !selectedRepo) return false

  if (hasPendingDeletions) return true

  const selectedLower = selectedRepo.fullName.toLowerCase()
  return tasks.some(
    (t) =>
      t.syncStatus === 'pending' &&
      t.username === user.login &&
      t.repoFullName.toLowerCase() === selectedLower
  )
}

let lastPendingCountsTasks: Task[] | null = null
let lastPendingCountsUser: GitHubUser | null = null
let lastPendingCountsResult: Record<string, number> = {}

export const selectPendingSyncCountsByRepo = (state: SyncState) => {
  const { tasks, user } = state
  if (tasks === lastPendingCountsTasks && user === lastPendingCountsUser) {
    return lastPendingCountsResult
  }

  const counts: Record<string, number> = {}
  if (user) {
    for (const task of tasks) {
      if (task.syncStatus !== 'pending' || task.username !== user.login) continue
      const repoKey = task.repoFullName.toLowerCase()
      counts[repoKey] = (counts[repoKey] ?? 0) + 1
    }
  }

  lastPendingCountsTasks = tasks
  lastPendingCountsUser = user
  lastPendingCountsResult = counts
  return counts
}

export const selectPendingSyncCountAllRepos = (state: SyncState) => {
  const counts = selectPendingSyncCountsByRepo(state)
  return Object.values(counts).reduce((sum, count) => sum + count, 0)
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
      hasPendingDeletions: false,
      repoSortModes: {},

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
        set({ selectedRepo: repo, syncErrorType: null, syncError: null })
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

        const task: Task = {
          id: generateUUID(),
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
                ...existingMeta,
                localRevision: existingMeta.localRevision + 1,
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
            return { ...t, ...updates, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
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
                ...existingMeta,
                localRevision: existingMeta.localRevision + 1,
              },
            },
          }
        })
      },

      moveTaskToRepo: (taskId: string, targetRepoFullName: string) => {
        set((state) => {
          let sourceRepoKey: string | null = null
          const targetRepoKey = normalizeRepoKey(targetRepoFullName)
          const updatedTasks = state.tasks.map(t => {
            if (t.id !== taskId) return t
            sourceRepoKey = normalizeRepoKey(t.repoFullName)
            return { ...t, repoFullName: targetRepoFullName, updatedAt: new Date().toISOString(), syncStatus: 'pending' as const }
          })
          const updatedTask = updatedTasks.find(t => t.id === taskId)
          if (updatedTask) {
            StorageService.persistTaskToIDB(updatedTask).catch(() => {})
          }
          const nextMeta = { ...state.repoSyncMeta }
          if (sourceRepoKey) {
            const existingMeta = nextMeta[sourceRepoKey] ?? createDefaultRepoMeta()
            nextMeta[sourceRepoKey] = {
              ...existingMeta,
              localRevision: existingMeta.localRevision + 1,
            }
          }
          const targetMeta = nextMeta[targetRepoKey] ?? createDefaultRepoMeta()
          nextMeta[targetRepoKey] = {
            ...targetMeta,
            localRevision: targetMeta.localRevision + 1,
          }
          return { tasks: updatedTasks, repoSyncMeta: nextMeta }
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
                ...existingMeta,
                localRevision: existingMeta.localRevision + 1,
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
                ...existingMeta,
                localRevision: existingMeta.localRevision + 1,
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
          return {
            tasks: updatedTasks,
            hasPendingDeletions: true,
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

      setSyncStatus: (status: SyncEngineStatus, error?: string, errorType?: SyncErrorType) => {
        const updates: Partial<SyncState> = {
          syncEngineStatus: status,
          isSyncing: status === 'syncing',
          syncError: error ?? null,
          syncErrorType: status === 'error' ? (errorType ?? 'unknown') : null,
        }
        if (status === 'success') {
          updates.hasPendingDeletions = false
        }
        set(updates as SyncState)
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

      setRepoSortMode: (repoFullName: string, mode: SortMode) => {
        const key = normalizeRepoKey(repoFullName)
        set((state) => ({
          repoSortModes: { ...state.repoSortModes, [key]: mode },
        }))
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
      }),
      skipHydration: true,
    },
  ),
)
