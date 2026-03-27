import { AnimatePresence } from 'framer-motion'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { useSyncStore } from '../../../stores/useSyncStore'
import type { SyncErrorType } from '../../../services/github/sync-service'

interface SyncErrorSheetProps {
  open: boolean
  onClose: () => void
}

const errorMeta: Record<SyncErrorType, { title: string; icon: string }> = {
  'branch-protection': { title: 'Sync Blocked', icon: '🔒' },
  auth: { title: 'Authentication Error', icon: '🔑' },
  network: { title: 'Network Error', icon: '📡' },
  unknown: { title: 'Sync Failed', icon: '⚠️' },
}

export function SyncErrorSheet({ open, onClose }: SyncErrorSheetProps) {
  const syncError = useSyncStore((s) => s.syncError)
  const syncErrorType = useSyncStore((s) => s.syncErrorType)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  const meta = errorMeta[syncErrorType ?? 'unknown']

  const handleCopyDebug = async () => {
    const lines = [
      `Error: ${meta.title}`,
      `Type: ${syncErrorType ?? 'unknown'}`,
      `Message: ${syncError ?? 'No details available'}`,
      `Repo: ${selectedRepo?.fullName ?? 'none'}`,
      `Last successful sync: ${lastSyncedAt ?? 'never'}`,
      `Time: ${new Date().toISOString()}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
  }

  return (
    <AnimatePresence>
      {open && (
        <BottomSheet onClose={onClose} ariaLabel="Sync error details" testId="sync-error-sheet">
          <div className="flex flex-col gap-4 pb-2">
            {/* Header */}
            <div className="flex items-center gap-3">
              <span className="text-2xl" role="img" aria-hidden="true">{meta.icon}</span>
              <h2
                className="text-lg font-semibold"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {meta.title}
              </h2>
            </div>

            {/* Error message */}
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {syncError ?? 'An unknown error occurred during sync.'}
            </p>

            {/* Debug info box */}
            <div
              className="rounded-lg p-3 text-xs font-mono"
              style={{
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <div>Type: {syncErrorType ?? 'unknown'}</div>
              <div>Repo: {selectedRepo?.fullName ?? '—'}</div>
              <div>Last sync: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'never'}</div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopyDebug}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors active:opacity-70"
                style={{
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                Copy debug info
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium transition-colors active:opacity-70"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  color: 'var(--color-canvas)',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </AnimatePresence>
  )
}
