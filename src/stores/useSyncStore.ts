import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { encryptData } from '../services/storage/crypto-utils'
import { StorageService } from '../services/storage/storage-service'
import { clearOctokitInstance } from '../services/github/auth-service'
import { generateUUID } from '../utils/uuid'
import type { GitHubUser } from '../services/github/auth-service'
import type { Task } from '../types/task'

const AUTH_STORAGE_KEY = 'auth'
const REPO_STORAGE_KEY = 'selected-repo'
const DRAFT_STORAGE_KEY = 'current-draft'
const TASKS_STORAGE_KEY = 'tasks'
const PASSPHRASE_SESSION_KEY = 'code-tasks:passphrase'

export interface SelectedRepo {
  id: number
  fullName: string
  owner: string
}

interface SyncState {
  isAuthenticated: boolean
  user: GitHubUser | null
  encryptedToken: string | null
  selectedRepo: SelectedRepo | null
  currentDraft: string
  isImportant: boolean
  tasks: Task[]

  setAuth: (token: string, user: GitHubUser, passphrase: string) => Promise<void>
  clearAuth: () => void
  setSelectedRepo: (repo: SelectedRepo | null) => void
  setCurrentDraft: (draft: string) => void
  toggleImportant: () => void
  addTask: (title: string, body: string) => Task
  markTaskSynced: (taskId: string, githubIssueNumber: number) => void
  removeTask: (taskId: string) => void
  loadTasksFromIDB: () => Promise<void>
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      encryptedToken: null,
      selectedRepo: null,
      currentDraft: '',
      isImportant: false,
      tasks: [],

      setAuth: async (token: string, user: GitHubUser, passphrase: string) => {
        // "Write-Through" Pattern: Encrypt and persist to buffer BEFORE updating store
        const encrypted = await encryptData(token, passphrase)
        const base64Token = arrayBufferToBase64(encrypted)

        const authData = {
          isAuthenticated: true,
          user,
          encryptedToken: base64Token,
        }

        // 1. Persist to LocalStorage synchronously
        StorageService.setItem(AUTH_STORAGE_KEY, authData)

        // 2. Persist passphrase to SessionStorage (temporary session key)
        sessionStorage.setItem(PASSPHRASE_SESSION_KEY, passphrase)

        // 3. Update memory state
        set(authData)
        },

        clearAuth: () => {

        // "Write-Through" Pattern: Clear buffer before updating state
        StorageService.removeItem(AUTH_STORAGE_KEY)
        StorageService.removeItem(REPO_STORAGE_KEY)
        sessionStorage.removeItem(PASSPHRASE_SESSION_KEY)

        // Reset the hydration promise so next login triggers a fresh hydration cycle
        import('../components/auth/hydration').then(m => m.resetHydration())

        // Cleanup Octokit instance
        clearOctokitInstance()

        set({ isAuthenticated: false, user: null, encryptedToken: null, selectedRepo: null, currentDraft: '', isImportant: false })
      },

      setSelectedRepo: (repo: SelectedRepo | null) => {
        // "Write-Through" Pattern: Persist to buffer before updating store
        if (repo) {
          StorageService.setItem(REPO_STORAGE_KEY, repo)
        } else {
          StorageService.removeItem(REPO_STORAGE_KEY)
        }
        set({ selectedRepo: repo })
      },

      setCurrentDraft: (draft: string) => {
        // "Write-Through" Pattern: Persist draft to buffer before updating store
        StorageService.setItem(DRAFT_STORAGE_KEY, draft)
        set({ currentDraft: draft })
      },

      toggleImportant: () => {
        set((state) => ({ isImportant: !state.isImportant }))
      },

      addTask: (title: string, body: string): Task => {
        const username = get().user?.login ?? 'anonymous'
        const task: Task = {
          id: generateUUID(),
          username,
          title,
          body,
          createdAt: new Date().toISOString(),
          syncStatus: 'pending',
          githubIssueNumber: null,
        }

        // "Write-Through" Pattern: persist to localStorage BEFORE updating Zustand store
        const currentTasks = get().tasks
        const updatedTasks = [task, ...currentTasks]
        StorageService.setItem(TASKS_STORAGE_KEY, updatedTasks)

        // Async: persist to IndexedDB (fire-and-forget, non-blocking)
        StorageService.persistTaskToIDB(task)

        // Update Zustand store
        set({ tasks: updatedTasks })

        return task
      },

      markTaskSynced: (taskId: string, githubIssueNumber: number) => {
        const currentTasks = get().tasks
        const updatedTasks = currentTasks.map((t) =>
          t.id === taskId
            ? { ...t, syncStatus: 'synced' as const, githubIssueNumber }
            : t,
        )

        // Write-through: localStorage first
        StorageService.setItem(TASKS_STORAGE_KEY, updatedTasks)

        // Async: update in IndexedDB
        const updatedTask = updatedTasks.find((t) => t.id === taskId)
        if (updatedTask) {
          StorageService.persistTaskToIDB(updatedTask)
        }

        set({ tasks: updatedTasks })
      },

      removeTask: (taskId: string) => {
        const currentTasks = get().tasks
        const updatedTasks = currentTasks.filter((t) => t.id !== taskId)

        // Write-through: localStorage first
        StorageService.setItem(TASKS_STORAGE_KEY, updatedTasks)

        // Async: remove from IndexedDB
        StorageService.deleteTaskFromIDB(taskId)

        set({ tasks: updatedTasks })
      },

      loadTasksFromIDB: async () => {
        const idbTasks = await StorageService.loadAllTasksFromIDB<Task>()
        if (idbTasks.length > 0) {
          const localTasks = get().tasks
          // Merge: IDB tasks that are not already in local state
          const localIds = new Set(localTasks.map((t) => t.id))
          const merged = [...localTasks]
          for (const t of idbTasks) {
            if (!localIds.has(t.id)) {
              merged.push(t)
            }
          }
          // Sort by creation date, newest first
          merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          StorageService.setItem(TASKS_STORAGE_KEY, merged)
          set({ tasks: merged })
        }
      },
    }),
    {
      name: 'code-tasks:store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        encryptedToken: state.encryptedToken,
        selectedRepo: state.selectedRepo,
        currentDraft: state.currentDraft,
        isImportant: state.isImportant,
        tasks: state.tasks,
      }),
      skipHydration: true,
    },
  ),
)
