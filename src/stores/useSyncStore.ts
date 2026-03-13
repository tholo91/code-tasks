import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { encryptData } from '../services/storage/crypto-utils'
import { StorageService } from '../services/storage/storage-service'
import { clearOctokitInstance } from '../services/github/auth-service'
import type { GitHubUser } from '../services/github/auth-service'

const AUTH_STORAGE_KEY = 'auth'
const REPO_STORAGE_KEY = 'selected-repo'
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

  setAuth: (token: string, user: GitHubUser, passphrase: string) => Promise<void>
  clearAuth: () => void
  setSelectedRepo: (repo: SelectedRepo | null) => void
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
    (set) => ({
      isAuthenticated: false,
      user: null,
      encryptedToken: null,
      selectedRepo: null,

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
        
        set({ isAuthenticated: false, user: null, encryptedToken: null, selectedRepo: null })
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
    }),
    {
      name: 'code-tasks:store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        user: state.user,
        encryptedToken: state.encryptedToken,
        selectedRepo: state.selectedRepo,
      }),
      skipHydration: true,
    },
  ),
)
