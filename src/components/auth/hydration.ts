import { useSyncStore, base64ToArrayBuffer } from '../../stores/useSyncStore'
import { decryptData } from '../../services/storage/crypto-utils'
import { validateToken } from '../../services/github/auth-service'
import { validateRepoAccess } from '../../services/github/repo-service'
import { getOctokit } from '../../services/github/auth-service'

const PASSPHRASE_KEY = 'code-tasks:passphrase'

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

  const { encryptedToken, isAuthenticated } = useSyncStore.getState()

  if (!isAuthenticated || !encryptedToken) {
    // Truly not authenticated — nothing to recover
    return
  }

  // Offline: trust local state (AC 7)
  if (!navigator.onLine) {
    return
  }

  const passphrase = sessionStorage.getItem(PASSPHRASE_KEY)
  if (!passphrase) {
    // Passphrase lost (tab was closed) but encrypted token still exists.
    // Don't destroy credentials — let the user re-enter their passphrase.
    useSyncStore.getState().setNeedsPassphrase(true)
    return
  }

  try {
    const buffer = base64ToArrayBuffer(encryptedToken)
    const token = await decryptData(buffer, passphrase)
    const result = await validateToken(token)

    if (!result.valid) {
      useSyncStore.getState().clearAuth()
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
    useSyncStore.getState().clearAuth()
  }
}
