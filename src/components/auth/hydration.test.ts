import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock auth-service
const { mockValidateToken, mockGetOctokit, mockClearOctokitInstance } = vi.hoisted(() => ({
  mockValidateToken: vi.fn(),
  mockGetOctokit: vi.fn(),
  mockClearOctokitInstance: vi.fn(),
}))
vi.mock('../../services/github/auth-service', () => ({
  validateToken: mockValidateToken,
  getOctokit: mockGetOctokit,
  clearOctokitInstance: mockClearOctokitInstance,
}))

// Mock repo-service
const { mockValidateRepoAccess } = vi.hoisted(() => ({
  mockValidateRepoAccess: vi.fn(),
}))
vi.mock('../../services/github/repo-service', () => ({
  validateRepoAccess: mockValidateRepoAccess,
}))

// Mock token-vault
const { mockLoadToken, mockStoreToken, mockClearToken } = vi.hoisted(() => ({
  mockLoadToken: vi.fn(),
  mockStoreToken: vi.fn(),
  mockClearToken: vi.fn(),
}))
vi.mock('../../services/storage/token-vault', () => ({
  TokenVault: {
    loadToken: (...args: unknown[]) => mockLoadToken(...args),
    storeToken: (...args: unknown[]) => mockStoreToken(...args),
    clearToken: (...args: unknown[]) => mockClearToken(...args),
  },
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

import { getHydrationPromise, resetHydration } from './hydration'
import { useSyncStore } from '../../stores/useSyncStore'

describe('hydration', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
    resetHydration()
    useSyncStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
    })
    vi.spyOn(useSyncStore.persist, 'rehydrate').mockImplementation(() => Promise.resolve())
    mockValidateToken.mockResolvedValue({ valid: true, user: { login: 'test', avatarUrl: '', name: null } })
    mockGetOctokit.mockReturnValue({} as never)
    mockValidateRepoAccess.mockResolvedValue(true)
    mockLoadToken.mockResolvedValue(null)
  })

  it('does nothing when no token exists after rehydration', async () => {
    await getHydrationPromise()

    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(mockValidateToken).not.toHaveBeenCalled()
  })

  it('validates token after recovery from vault', async () => {
    mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')
    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      token: null,
    })

    await getHydrationPromise()

    expect(mockValidateToken).toHaveBeenCalledWith('ghp_validtoken123')
    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(true)
  })

  it('trusts local state when offline (AC 7)', async () => {
    const originalOnLine = navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')
    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      token: null,
    })

    await getHydrationPromise()

    expect(mockValidateToken).not.toHaveBeenCalled()
    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(true)

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true })
  })

  it('clears auth with message when token validation fails (expired/revoked)', async () => {
    mockValidateToken.mockResolvedValueOnce({ valid: false, error: 'Token expired' })
    mockLoadToken.mockResolvedValueOnce('ghp_expiredtoken')

    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      token: null,
    })

    await getHydrationPromise()

    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
    expect(state.authError).toBe('Token expired — please reconnect')
  })

  it('clears auth when validateToken throws', async () => {
    mockValidateToken.mockRejectedValueOnce(new Error('network error'))
    mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')

    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      token: null,
    })

    await getHydrationPromise()

    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('caches the hydration promise on subsequent calls', async () => {
    const promise1 = getHydrationPromise()
    const promise2 = getHydrationPromise()
    expect(promise1).toBe(promise2)
    await promise1
  })

  describe('legacy token migration', () => {
    it('migrates base64 token from persisted store when vault is empty', async () => {
      mockLoadToken.mockResolvedValueOnce(null)
      const encodedToken = btoa('ghp_validtoken123')

      useSyncStore.setState({
        isAuthenticated: true,
        user: { login: 'testuser', avatarUrl: '', name: 'Test' },
        token: encodedToken,
      })

      await getHydrationPromise()

      expect(mockStoreToken).toHaveBeenCalledWith('ghp_validtoken123')
      expect(mockValidateToken).toHaveBeenCalledWith('ghp_validtoken123')
    })
  })

  describe('last-used repo validation (Story 2.2)', () => {
    const validAuthState = {
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      token: null,
      selectedRepo: { id: 42, fullName: 'testuser/my-repo', owner: 'testuser' },
    }

    it('keeps selectedRepo when validation succeeds', async () => {
      mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')
      useSyncStore.setState(validAuthState)
      mockValidateRepoAccess.mockResolvedValueOnce(true)

      await getHydrationPromise()

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toEqual(validAuthState.selectedRepo)
      expect(mockValidateRepoAccess).toHaveBeenCalledWith(expect.anything(), 42)
    })

    it('clears selectedRepo when repo is no longer accessible', async () => {
      mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')
      useSyncStore.setState(validAuthState)
      mockValidateRepoAccess.mockResolvedValueOnce(false)

      await getHydrationPromise()

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toBeNull()
      expect(state.isAuthenticated).toBe(true)
    })

    it('skips repo validation when no selectedRepo is persisted', async () => {
      mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')
      useSyncStore.setState({
        ...validAuthState,
        selectedRepo: null,
      })

      await getHydrationPromise()

      expect(mockValidateRepoAccess).not.toHaveBeenCalled()
    })

    it('skips repo validation when offline', async () => {
      const originalOnLine = navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      mockLoadToken.mockResolvedValueOnce('ghp_validtoken123')
      useSyncStore.setState(validAuthState)

      await getHydrationPromise()

      expect(mockValidateRepoAccess).not.toHaveBeenCalled()
      const state = useSyncStore.getState()
      expect(state.selectedRepo).toEqual(validAuthState.selectedRepo)

      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true })
    })
  })
})
