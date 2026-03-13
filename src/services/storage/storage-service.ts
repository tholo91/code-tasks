/**
 * storage-service.ts
 * Exclusive owner of LocalStorage interactions.
 * Acts as a synchronous local-first buffer for the application state.
 */

const APP_PREFIX = 'code-tasks:'

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
}
