import { useSyncStore, base64ToArrayBuffer } from '../../stores/useSyncStore'
import { decryptData } from '../storage/crypto-utils'
import { getOctokit, getExistingOctokit } from './auth-service'

const PASSPHRASE_SESSION_KEY = 'code-tasks:passphrase'

/**
 * Recovers the Octokit instance by decrypting the stored token.
 * If an Octokit singleton already exists (e.g. right after login),
 * returns it immediately without re-deriving the PBKDF2 key.
 */
export async function recoverOctokit() {
  // Fast path: reuse existing singleton (avoids expensive PBKDF2 re-derivation)
  const existing = getExistingOctokit()
  if (existing) return existing

  const { encryptedToken, isAuthenticated } = useSyncStore.getState()

  if (!isAuthenticated || !encryptedToken) {
    throw new Error('Not authenticated')
  }

  const passphrase = sessionStorage.getItem(PASSPHRASE_SESSION_KEY)
  if (!passphrase) {
    throw new Error('Passphrase missing from session')
  }

  const buffer = base64ToArrayBuffer(encryptedToken)
  const token = await decryptData(buffer, passphrase)

  return getOctokit(token)
}
