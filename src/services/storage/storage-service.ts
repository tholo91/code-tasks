/**
 * storage-service.ts
 * Exclusive owner of LocalStorage and IndexedDB interactions.
 * Implements "Synchronous-then-Async" write pattern:
 *   1. Write to localStorage synchronously (buffer for immediate crash safety)
 *   2. Write to IndexedDB asynchronously (durable long-term store)
 */

const APP_PREFIX = 'code-tasks:'
const IDB_NAME = 'code-tasks-db'
const IDB_VERSION = 1
const IDB_STORE = 'tasks'

// --- IndexedDB helpers ---

let dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' })
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

async function idbPut<T>(record: T): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(record)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('StorageService: IndexedDB put failed', error)
  }
}

async function idbDelete(id: string): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('StorageService: IndexedDB delete failed', error)
  }
}

async function idbGetAll<T>(): Promise<T[]> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const request = tx.objectStore(IDB_STORE).getAll()
      request.onsuccess = () => resolve(request.result as T[])
      request.onerror = () => reject(request.error)
    })
  } catch (error) {
    console.error('StorageService: IndexedDB getAll failed', error)
    return []
  }
}

async function idbClear(): Promise<void> {
  try {
    const db = await openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  } catch (error) {
    console.error('StorageService: IndexedDB clear failed', error)
  }
}

// --- Public API ---

export const StorageService = {
  /**
   * Synchronously writes a value to LocalStorage.
   * This is the "Write-Through" buffer used before updating global state.
   */
  setItem(key: string, value: unknown): void {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)
      localStorage.setItem(`${APP_PREFIX}${key}`, serialized)
    } catch (error) {
      console.error(`StorageService: Failed to set item "${key}"`, error)
    }
  },

  /**
   * Synchronously reads a value from LocalStorage.
   */
  getItem<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(`${APP_PREFIX}${key}`)
      if (value === null) return null

      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    } catch (error) {
      console.error(`StorageService: Failed to get item "${key}"`, error)
      return null
    }
  },

  /**
   * Synchronously removes a value from LocalStorage.
   */
  removeItem(key: string): void {
    try {
      localStorage.removeItem(`${APP_PREFIX}${key}`)
    } catch (error) {
      console.error(`StorageService: Failed to remove item "${key}"`, error)
    }
  },

  /**
   * Clears all application-specific data from LocalStorage.
   */
  clear(): void {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith(APP_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('StorageService: Failed to clear storage', error)
    }
  },

  // --- IndexedDB (async durable store) ---

  /**
   * Persists a task record to IndexedDB (async, fire-and-forget safe).
   * Called AFTER the synchronous localStorage write.
   */
  persistTaskToIDB: idbPut,

  /**
   * Removes a task record from IndexedDB.
   */
  deleteTaskFromIDB: idbDelete,

  /**
   * Loads all task records from IndexedDB.
   * Used on app start to recover tasks that may have only been in localStorage buffer.
   */
  loadAllTasksFromIDB: idbGetAll,

  /**
   * Clears all tasks from IndexedDB.
   */
  clearTasksFromIDB: idbClear,
}
