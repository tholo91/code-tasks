import { useSyncStore } from '../../stores/useSyncStore'
import { validateToken } from '../../services/github/auth-service'
import { validateRepoAccess } from '../../services/github/repo-service'
import { getOctokit } from '../../services/github/auth-service'
import { TokenVault } from '../../services/storage/token-vault'

let hydrationPromise: Promise<void> | null = null

export function getHydrationPromise(): Promise<void> {
  if (!hydrationPromise) {
    hydrationPromise = performHydration()
  }
  return hydrationPromise
}

export function resetHydration() {
  hydrationPromise = null
}

async function performHydration(): Promise<void> {
  await useSyncStore.persist.rehydrate()

  const { token: persistedToken, isAuthenticated } = useSyncStore.getState()

  // Attempt to load encrypted token from vault
  let token = await TokenVault.loadToken()

  // Legacy migration: persisted base64 token
  if (!token && persistedToken) {
    let migratedToken = persistedToken
    try {
      const decoded = atob(persistedToken)
      if (decoded.startsWith('ghp_') || decoded.startsWith('github_pat_')) {
        migratedToken = decoded
      }
    } catch {
      // token may already be plaintext
    }
    try {
      await TokenVault.storeToken(migratedToken)
    } catch {
      useSyncStore.getState().clearAuth('Token vault error — please reconnect')
      return
    }
    token = migratedToken
    useSyncStore.setState({ token: migratedToken, isAuthenticated: true })
  }

  if (!token) {
    if (isAuthenticated) {
      useSyncStore.getState().clearAuth('Token missing — please reconnect')
    }
    return
  }

  useSyncStore.setState({ token, isAuthenticated: true })

  // Offline: trust local state (AC 7)
  if (!navigator.onLine) {
    return
  }

  try {
    const result = await validateToken(token)

    if (!result.valid) {
      useSyncStore.getState().clearAuth('Token expired — please reconnect')
      return
    }

    // Validate persisted "Last Used" repository access (Story 2.2, AC 4 & 5)
    const { selectedRepo } = useSyncStore.getState()
    if (selectedRepo) {
      const octokit = getOctokit(token)
      const hasAccess = await validateRepoAccess(octokit, selectedRepo.id)
      if (!hasAccess) {
        // Clear stale repo selection — user will be prompted to select a new repo
        useSyncStore.getState().setSelectedRepo(null)
      }
    }
  } catch {
    useSyncStore.getState().clearAuth('Connection failed — please check GitHub access')
  }
}
