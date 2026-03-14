/**
 * Haptic feedback service using Capacitor's Haptics API.
 * Falls back to a no-op on platforms without haptic support (desktop browsers).
 */

/**
 * Trigger a light impact haptic pattern for launch confirmation.
 * Uses Capacitor Haptics plugin when available, otherwise no-op.
 *
 * Haptic pattern: Light/Sharp - as specified in UX requirements.
 */
export async function triggerLaunchHaptic(): Promise<void> {
  try {
    // Dynamic import to avoid bundling issues on platforms without Capacitor
    const haptics = await import('@capacitor/haptics')
    await haptics.Haptics.impact({ style: haptics.ImpactStyle.Light })
  } catch {
    // Haptics not available (desktop browser or missing plugin) - silently ignore
  }
}

/**
 * Trigger a selection-changed haptic for toggle interactions.
 * Uses Capacitor Haptics plugin when available, otherwise no-op.
 *
 * Pattern: selectionChanged — subtle, tactile feedback for state flips.
 */
export async function triggerSelectionHaptic(): Promise<void> {
  try {
    const { Haptics } = await import('@capacitor/haptics')
    await Haptics.selectionChanged()
  } catch {
    // Haptics not available (desktop browser or missing plugin) - silently ignore
  }
}
