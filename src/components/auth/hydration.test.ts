import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock crypto-utils
vi.mock('../../services/storage/crypto-utils', () => ({
  encryptData: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
  decryptData: vi.fn().mockResolvedValue('decrypted-token'),
}))

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

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock })

import { getHydrationPromise, resetHydration } from './hydration'
import { useSyncStore } from '../../stores/useSyncStore'

describe('hydration', () => {
  beforeEach(() => {
    localStorageMock.clear()
    sessionStorageMock.clear()
    vi.clearAllMocks()
    resetHydration()
    useSyncStore.setState({
      isAuthenticated: false,
      user: null,
      encryptedToken: null,
    })
    vi.spyOn(useSyncStore.persist, 'rehydrate').mockImplementation(() => Promise.resolve())
    mockValidateToken.mockResolvedValue({ valid: true, user: { login: 'test', avatarUrl: '', name: null } })
    mockGetOctokit.mockReturnValue({} as never)
    mockValidateRepoAccess.mockResolvedValue(true)
  })

  it('clears auth when no token exists after rehydration', async () => {
    await getHydrationPromise()

    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('validates session when token and passphrase exist', async () => {
    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'dGVzdA==',
    })
    sessionStorageMock.setItem('code-tasks:passphrase', 'test-pass')

    await getHydrationPromise()

    expect(mockValidateToken).toHaveBeenCalledWith('decrypted-token')
    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(true)
  })

  it('sets needsPassphrase when no passphrase in sessionStorage', async () => {
    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'dGVzdA==',
    })

    await getHydrationPromise()

    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(true)
    expect(state.needsPassphrase).toBe(true)
    expect(state.encryptedToken).toBe('dGVzdA==')
  })

  it('trusts local state when offline (AC 7)', async () => {
    const originalOnLine = navigator.onLine
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'dGVzdA==',
    })

    await getHydrationPromise()

    expect(mockValidateToken).not.toHaveBeenCalled()
    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(true)

    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true })
  })

  it('clears auth when token validation fails (AC 6)', async () => {
    mockValidateToken.mockResolvedValueOnce({ valid: false, error: 'Token expired' })

    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'dGVzdA==',
    })
    sessionStorageMock.setItem('code-tasks:passphrase', 'test-pass')

    await getHydrationPromise()

    const state = useSyncStore.getState()
    expect(state.isAuthenticated).toBe(false)
  })

  it('clears auth when decryption throws', async () => {
    const { decryptData } = await import('../../services/storage/crypto-utils')
    vi.mocked(decryptData).mockRejectedValueOnce(new Error('decrypt failed'))

    useSyncStore.setState({
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'dGVzdA==',
    })
    sessionStorageMock.setItem('code-tasks:passphrase', 'test-pass')

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

  describe('last-used repo validation (Story 2.2)', () => {
    const validAuthState = {
      isAuthenticated: true,
      user: { login: 'testuser', avatarUrl: '', name: 'Test' },
      encryptedToken: 'dGVzdA==',
      selectedRepo: { id: 42, fullName: 'testuser/my-repo', owner: 'testuser' },
    }

    it('keeps selectedRepo when validation succeeds (AC 3, 4)', async () => {
      useSyncStore.setState(validAuthState)
      sessionStorageMock.setItem('code-tasks:passphrase', 'test-pass')
      mockValidateRepoAccess.mockResolvedValueOnce(true)

      await getHydrationPromise()

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toEqual(validAuthState.selectedRepo)
      expect(mockValidateRepoAccess).toHaveBeenCalledWith(expect.anything(), 42)
    })

    it('clears selectedRepo when repo is no longer accessible (AC 5)', async () => {
      useSyncStore.setState(validAuthState)
      sessionStorageMock.setItem('code-tasks:passphrase', 'test-pass')
      mockValidateRepoAccess.mockResolvedValueOnce(false)

      await getHydrationPromise()

      const state = useSyncStore.getState()
      expect(state.selectedRepo).toBeNull()
      expect(state.isAuthenticated).toBe(true) // auth should remain valid
    })

    it('skips repo validation when no selectedRepo is persisted', async () => {
      useSyncStore.setState({
        ...validAuthState,
        selectedRepo: null,
      })
      sessionStorageMock.setItem('code-tasks:passphrase', 'test-pass')

      await getHydrationPromise()

      expect(mockValidateRepoAccess).not.toHaveBeenCalled()
    })

    it('skips repo validation when offline (trusts local state)', async () => {
      const originalOnLine = navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      useSyncStore.setState(validAuthState)

      await getHydrationPromise()

      expect(mockValidateRepoAccess).not.toHaveBeenCalled()
      const state = useSyncStore.getState()
      expect(state.selectedRepo).toEqual(validAuthState.selectedRepo)

      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true })
    })
  })
})
