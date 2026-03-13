import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock crypto-utils
vi.mock('../services/storage/crypto-utils', () => ({
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

// Mock sessionStorage
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
import { useSyncStore } from './useSyncStore'

describe('useSyncStore', () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
    vi.clearAllMocks()
    // Reset store state
    useSyncStore.setState({
      isAuthenticated: false,
      user: null,
      encryptedToken: null,
      selectedRepo: null,
    })
  })

  it('has correct initial state', () => {
    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.user).toBeNull()
    expect(state.encryptedToken).toBeNull()
  })

  describe('setAuth', () => {
    it('encrypts token and persists via persist middleware', async () => {
      const { encryptData } = await import(
        '../services/storage/crypto-utils'
      )

      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
        'test-passphrase',
      )

      expect(encryptData).toHaveBeenCalledWith('ghp_testtoken123', 'test-passphrase')

      const state = useSyncStore.getState()
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual({
        login: 'testuser',
        avatarUrl: 'https://example.com/avatar.png',
        name: 'Test User',
      })
      expect(state.encryptedToken).not.toBeNull()
    })

    it('stores passphrase in sessionStorage for session recovery', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
        'test-passphrase',
      )

      expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
        'code-tasks:passphrase',
        'test-passphrase',
      )
    })
  })

  describe('clearAuth', () => {
    it('clears auth state, localStorage, and sessionStorage', async () => {
      await useSyncStore.getState().setAuth(
        'ghp_testtoken123',
        { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test User' },
        'test-passphrase',
      )

      useSyncStore.getState().clearAuth()

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('code-tasks:passphrase')

      const state = useSyncStore.getState()
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.encryptedToken).toBeNull()
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
        'test-passphrase',
      )

      useSyncStore.getState().clearAuth()

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toBeNull()
    })
  })

  describe('persist middleware', () => {
    it('is configured with skipHydration and persist API', () => {
      expect(useSyncStore.persist).toBeDefined()
      expect(useSyncStore.persist.rehydrate).toBeDefined()
    })
  })
})
