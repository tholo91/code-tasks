import { useSyncStore, base64ToArrayBuffer } from '../stores/useSyncStore'
import { decryptData } from '../services/storage/crypto-utils'
import { getOctokit } from '../services/github/auth-service'

const PASSPHRASE_SESSION_KEY = 'code-tasks:passphrase'

/**
 * Recovers the Octokit instance by decrypting the stored token.
 * This should only be called when the user is authenticated.
 */
export async function recoverOctokit() {
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
