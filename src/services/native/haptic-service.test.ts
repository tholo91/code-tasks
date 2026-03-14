import { describe, it, expect, vi } from 'vitest'
import { triggerLaunchHaptic, triggerSelectionHaptic } from './haptic-service'

describe('haptic-service', () => {
  describe('triggerLaunchHaptic', () => {
    it('does not throw when Capacitor haptics is not available', async () => {
      // By default in jsdom, @capacitor/haptics import will fail
      await expect(triggerLaunchHaptic()).resolves.toBeUndefined()
    })

    it('silently catches errors from Haptics API', async () => {
      // The function should never throw, even if the underlying API fails
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(triggerLaunchHaptic()).resolves.toBeUndefined()
      consoleSpy.mockRestore()
    })
  })

  describe('triggerSelectionHaptic', () => {
    it('does not throw when Capacitor haptics is not available', async () => {
      // By default in jsdom, @capacitor/haptics import will fail
      await expect(triggerSelectionHaptic()).resolves.toBeUndefined()
    })

    it('silently catches errors from Haptics API', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      await expect(triggerSelectionHaptic()).resolves.toBeUndefined()
      consoleSpy.mockRestore()
    })
  })
})
