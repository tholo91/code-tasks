import '@testing-library/jest-dom'

// Node 26 ships a native experimental `localStorage` global that throws on
// access unless `--localstorage-file` is passed, and it shadows the jsdom
// implementation. Zustand's persist middleware reads `localStorage` at import
// time, so without a working global the whole store-backed suite fails with
// "Cannot read properties of undefined (reading 'setItem')". Provide a simple
// in-memory implementation so `npm test` works with no extra Node flags.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  clear(): void {
    this.store.clear()
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
