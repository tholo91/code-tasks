import { StorageService } from './storage-service'

const VAULT_DB = 'code-tasks-vault'
const VAULT_STORE = 'vault'
const VAULT_KEY_ID = 'token-key'

const TOKEN_STORAGE_KEY = 'token-ciphertext'
const SECURE_KEY_ALIAS = 'code-tasks:token-key'

const IV_LENGTH = 12

let cachedKey: CryptoKey | null = null
let dbPromise: Promise<IDBDatabase> | null = null

function getSecureStoragePlugin(): {
  get: (options: { key: string }) => Promise<{ value?: string } | string | null>
  set: (options: { key: string; value: string }) => Promise<void>
  remove: (options: { key: string }) => Promise<void>
} | null {
  const capacitor = (globalThis as { Capacitor?: { Plugins?: Record<string, any> } }).Capacitor
  const plugins = capacitor?.Plugins
  const candidate =
    plugins?.SecureStorage ??
    plugins?.SecureStoragePlugin ??
    plugins?.SecureStorageAdapter ??
    null

  if (!candidate) return null

  if (typeof candidate.get === 'function' && typeof candidate.set === 'function' && typeof candidate.remove === 'function') {
    return candidate
  }

  return null
}

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

function isIndexedDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined'
}

async function openVaultDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(VAULT_DB, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(VAULT_STORE)) {
        db.createObjectStore(VAULT_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => {
      dbPromise = null
      reject(request.error)
    }
  })

  return dbPromise
}

async function idbGetKey(): Promise<CryptoKey | null> {
  if (!isIndexedDBAvailable()) return null
  const db = await openVaultDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readonly')
    const request = tx.objectStore(VAULT_STORE).get(VAULT_KEY_ID)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function idbSetKey(key: CryptoKey): Promise<void> {
  if (!isIndexedDBAvailable()) return
  const db = await openVaultDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite')
    tx.objectStore(VAULT_STORE).put(key, VAULT_KEY_ID)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function idbDeleteKey(): Promise<void> {
  if (!isIndexedDBAvailable()) return
  const db = await openVaultDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VAULT_STORE, 'readwrite')
    tx.objectStore(VAULT_STORE).delete(VAULT_KEY_ID)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

async function generateKey(extractable: boolean): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    extractable,
    ['encrypt', 'decrypt'],
  )
}

async function loadKeyFromSecureStorage(): Promise<CryptoKey | null> {
  const secureStorage = getSecureStoragePlugin()
  if (!secureStorage) return null

  try {
    const response = await secureStorage.get({ key: SECURE_KEY_ALIAS })
    const value =
      typeof response === 'string'
        ? response
        : response && typeof response === 'object'
          ? response.value
          : null
    if (!value) return null

    const raw = base64ToBuffer(value)
    return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt'])
  } catch {
    return null
  }
}

async function storeKeyInSecureStorage(key: CryptoKey): Promise<boolean> {
  const secureStorage = getSecureStoragePlugin()
  if (!secureStorage) return false
  try {
    const raw = await crypto.subtle.exportKey('raw', key)
    const encoded = bufferToBase64(raw)
    await secureStorage.set({ key: SECURE_KEY_ALIAS, value: encoded })
    return true
  } catch {
    return false
  }
}

async function removeKeyFromSecureStorage(): Promise<void> {
  const secureStorage = getSecureStoragePlugin()
  if (!secureStorage) return
  try {
    await secureStorage.remove({ key: SECURE_KEY_ALIAS })
  } catch {
    // ignore
  }
}

async function getOrCreateKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey

  const secureKey = await loadKeyFromSecureStorage()
  if (secureKey) {
    cachedKey = secureKey
    return secureKey
  }

  const storedKey = await idbGetKey()
  if (storedKey) {
    cachedKey = storedKey
    return storedKey
  }

  // Generate new key. Prefer secure storage when available.
  const secureStorageAvailable = Boolean(getSecureStoragePlugin())
  const key = await generateKey(secureStorageAvailable)

  if (secureStorageAvailable) {
    const stored = await storeKeyInSecureStorage(key)
    if (!stored) {
      await idbSetKey(key)
    }
  } else {
    await idbSetKey(key)
  }

  cachedKey = key
  return key
}

async function encryptWithKey(plaintext: string, key: CryptoKey): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)

  const packed = new Uint8Array(iv.byteLength + ciphertext.byteLength)
  packed.set(iv, 0)
  packed.set(new Uint8Array(ciphertext), iv.byteLength)
  return bufferToBase64(packed.buffer)
}

async function decryptWithKey(ciphertext: string, key: CryptoKey): Promise<string> {
  const packed = new Uint8Array(base64ToBuffer(ciphertext))
  const iv = packed.slice(0, IV_LENGTH)
  const payload = packed.slice(IV_LENGTH)
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, payload)
  return new TextDecoder().decode(decrypted)
}

export const TokenVault = {
  async storeToken(token: string): Promise<void> {
    if (!token) return
    const key = await getOrCreateKey()
    const cipherText = await encryptWithKey(token, key)
    StorageService.setItem(TOKEN_STORAGE_KEY, cipherText)
  },

  async loadToken(): Promise<string | null> {
    const cipherText = StorageService.getItem<string>(TOKEN_STORAGE_KEY)
    if (!cipherText) return null

    try {
      const key = await getOrCreateKey()
      return await decryptWithKey(cipherText, key)
    } catch {
      await this.clearToken()
      return null
    }
  },

  async clearToken(): Promise<void> {
    StorageService.removeItem(TOKEN_STORAGE_KEY)
    cachedKey = null
    await removeKeyFromSecureStorage()
    await idbDeleteKey()
  },
}
