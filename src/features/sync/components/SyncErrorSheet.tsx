import { useState } from 'react'
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

const GITHUB_TOKEN_SETTINGS_URL = 'https://github.com/settings/personal-access-tokens'

export function SyncErrorSheet({ open, onClose }: SyncErrorSheetProps) {
  const syncError = useSyncStore((s) => s.syncError)
  const syncErrorType = useSyncStore((s) => s.syncErrorType)
  const lastSyncedAt = useSyncStore((s) => s.lastSyncedAt)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const repoSyncErrors = useSyncStore((s) => s.repoSyncErrors)
  const [copied, setCopied] = useState(false)

  const meta = errorMeta[syncErrorType ?? 'unknown']

  // Get per-repo raw error if available
  const repoKey = selectedRepo?.fullName.toLowerCase()
  const repoError = repoKey ? repoSyncErrors[repoKey] : null
  const rawError = repoError?.rawError
  const isTokenRepoAccessError =
    rawError?.status === 403 &&
    rawError.message.toLowerCase().includes('resource not accessible by personal access token')

  const handleCopyDebug = async () => {
    const lines = [
      `Error: ${meta.title}`,
      `Type: ${syncErrorType ?? 'unknown'}`,
      `Message: ${syncError ?? 'No details available'}`,
      `Repo: ${selectedRepo?.fullName ?? 'none'}`,
      `Last successful sync: ${lastSyncedAt ?? 'never'}`,
      `Time: ${repoError?.timestamp ?? new Date().toISOString()}`,
      `--- Raw API Error ---`,
      `HTTP Status: ${rawError?.status ?? 'N/A'}`,
      `API Message: ${rawError?.message ?? 'N/A'}`,
    ]
    await navigator.clipboard.writeText(lines.join('\n'))
    setCopied(true)
    setTimeout(() => {
      setCopied(false)
      onClose()
    }, 800)
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

            {isTokenRepoAccessError && (
              <div
                className="rounded-lg border p-3 text-sm leading-relaxed"
                style={{
                  borderColor: 'var(--color-border)',
                  backgroundColor: 'var(--color-canvas)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <p>
                  Add this repository to your GitHub token, then sync again. The token needs
                  Contents: Read and Write access.
                </p>
                <a
                  href={GITHUB_TOKEN_SETTINGS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-md px-3 py-2 text-center text-sm font-medium"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: '#ffffff',
                  }}
                >
                  Open GitHub token settings
                </a>
              </div>
            )}

            {/* Debug info box */}
            <div
              className="min-w-0 overflow-hidden rounded-lg p-3 text-xs font-mono space-y-0.5"
              style={{
                backgroundColor: 'var(--color-canvas)',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
              }}
            >
              <DebugLine label="Type" value={syncErrorType ?? 'unknown'} />
              <DebugLine label="Repo" value={selectedRepo?.fullName ?? '—'} />
              <DebugLine label="Last sync" value={lastSyncedAt ? new Date(lastSyncedAt).toLocaleString() : 'never'} />
              {rawError && (
                <div
                  className="min-w-0 truncate pt-1 mt-1"
                  title={`HTTP ${rawError.status ?? '?'}: ${rawError.message}`}
                  style={{ borderTop: '1px solid var(--color-border)' }}
                >
                  HTTP {rawError.status ?? '?'}: {rawError.message}
                </div>
              )}
            </div>

            {/* Copy action */}
            <button
              type="button"
              onClick={handleCopyDebug}
              className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors active:opacity-70"
              style={{
                backgroundColor: copied ? 'var(--color-success)' : 'var(--color-canvas)',
                color: copied ? '#ffffff' : 'var(--color-text-primary)',
                border: `1px solid ${copied ? 'var(--color-success)' : 'var(--color-border)'}`,
              }}
            >
              {copied ? 'Copied!' : 'Copy debug info'}
            </button>
          </div>
        </BottomSheet>
      )}
    </AnimatePresence>
  )
}

function DebugLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 gap-2">
      <span className="shrink-0">{label}:</span>
      <span className="min-w-0 truncate" title={value}>{value}</span>
    </div>
  )
}
