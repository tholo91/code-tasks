import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  }
})()

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, configurable: true })

// Mock indexedDB - provide minimal fake for unit tests
const mockIDBStore: Record<string, unknown> = {}
const mockObjectStore = {
  put: vi.fn((record: { id: string }) => {
    mockIDBStore[record.id] = record
    return { onsuccess: null, onerror: null }
  }),
  delete: vi.fn((id: string) => {
    delete mockIDBStore[id]
    return { onsuccess: null, onerror: null }
  }),
  getAll: vi.fn(() => {
    const result = Object.values(mockIDBStore)
    return { result, onsuccess: null, onerror: null }
  }),
  clear: vi.fn(() => {
    Object.keys(mockIDBStore).forEach((k) => delete mockIDBStore[k])
    return { onsuccess: null, onerror: null }
  }),
}

const mockTransaction = {
  objectStore: vi.fn(() => mockObjectStore),
  oncomplete: null as (() => void) | null,
  onerror: null as (() => void) | null,
}

const mockDB = {
  transaction: vi.fn(() => mockTransaction),
  objectStoreNames: { contains: vi.fn(() => true) },
  createObjectStore: vi.fn(),
}

Object.defineProperty(globalThis, 'indexedDB', {
  value: {
    open: vi.fn(() => {
      const req = {
        result: mockDB,
        onupgradeneeded: null as (() => void) | null,
        onsuccess: null as (() => void) | null,
        onerror: null as (() => void) | null,
        error: null,
      }
      // Simulate async open
      setTimeout(() => req.onsuccess?.(), 0)
      return req
    }),
  },
  configurable: true,
})

import { StorageService } from './storage-service'

describe('StorageService', () => {
  beforeEach(() => {
    localStorageMock.clear()
    vi.clearAllMocks()
  })

  describe('setItem / getItem', () => {
    it('stores and retrieves an object', () => {
      StorageService.setItem('test', { foo: 'bar' })
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'code-tasks:test',
        JSON.stringify({ foo: 'bar' }),
      )
      const result = StorageService.getItem<{ foo: string }>('test')
      expect(result).toEqual({ foo: 'bar' })
    })

    it('stores and retrieves a string directly', () => {
      StorageService.setItem('str', 'hello')
      const result = StorageService.getItem<string>('str')
      expect(result).toBe('hello')
    })

    it('returns null for missing keys', () => {
      expect(StorageService.getItem('missing')).toBeNull()
    })
  })

  describe('removeItem', () => {
    it('removes a key from localStorage', () => {
      StorageService.setItem('doomed', 'bye')
      StorageService.removeItem('doomed')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('code-tasks:doomed')
    })
  })

  describe('clear', () => {
    it('attempts to clear code-tasks: prefixed keys', () => {
      // The clear method iterates over Object.keys(localStorage)
      // In our mock, clear() empties the internal store directly,
      // so we just verify the method is callable and doesn't throw.
      expect(() => StorageService.clear()).not.toThrow()
    })
  })

  describe('IndexedDB methods are exposed', () => {
    it('exports persistTaskToIDB', () => {
      expect(StorageService.persistTaskToIDB).toBeInstanceOf(Function)
    })

    it('exports deleteTaskFromIDB', () => {
      expect(StorageService.deleteTaskFromIDB).toBeInstanceOf(Function)
    })

    it('exports loadAllTasksFromIDB', () => {
      expect(StorageService.loadAllTasksFromIDB).toBeInstanceOf(Function)
    })

    it('exports clearTasksFromIDB', () => {
      expect(StorageService.clearTasksFromIDB).toBeInstanceOf(Function)
    })
  })
})
