import { useSyncStore } from '../../stores/useSyncStore'
import { getOctokit, getExistingOctokit } from './auth-service'
import { TokenVault } from '../storage/token-vault'

/**
 * Recovers the Octokit instance by reading the stored token directly.
 * If an Octokit singleton already exists (e.g. right after login),
 * returns it immediately.
 */
export async function recoverOctokit() {
  // Fast path: reuse existing singleton
  const existing = getExistingOctokit()
  if (existing) return existing

  const { token: storedToken, isAuthenticated } = useSyncStore.getState()

  if (!isAuthenticated) {
    throw new Error('Not authenticated')
  }

  const token = storedToken ?? (await TokenVault.loadToken())
  if (!token) {
    throw new Error('Token missing')
  }

  if (!storedToken) {
    useSyncStore.setState({ token })
  }

  return getOctokit(token)
}
