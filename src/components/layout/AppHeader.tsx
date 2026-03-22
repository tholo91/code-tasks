import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

interface AppHeaderProps {
  isOnline: boolean
  onChangeRepo: () => void
  onOpenSettings?: () => void
}

/**
 * Compact single-row app header: [brand] [repo-chip] [sync-badge]
 */
export function AppHeader({ isOnline, onChangeRepo, onOpenSettings }: AppHeaderProps) {
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  return (
    <header
      className="flex w-full max-w-[640px] items-center justify-between px-4 py-3 sticky top-0 z-[40]"
      style={{
        backgroundColor: 'var(--color-canvas)',
        boxShadow: '0 1px 0 var(--color-border)',
      }}
      data-testid="app-header"
    >
      {/* Brand — monospace font reinforces developer identity */}
      <span
        className="font-mono text-label font-semibold tracking-tight"
        style={{ color: 'var(--color-accent)' }}
      >
        Gitty Tasks
      </span>

      {/* Repo chip + status badges */}
      <div className="flex items-center gap-2">
        {selectedRepo && (
          <button
            onClick={onChangeRepo}
            className="rounded-full px-3 py-1 text-caption font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            data-testid="selected-repo"
            title="Change repository"
          >
            {selectedRepo.fullName}
          </button>
        )}

        <SyncHeaderStatus />

        {!isOnline && (
          <span
            className="badge badge-amber"
            role="status"
            data-testid="offline-badge"
          >
            Offline
          </span>
        )}

        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center justify-center rounded-full p-1.5 transition-opacity hover:opacity-80"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Settings"
            data-testid="settings-button"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        )}
      </div>
    </header>
  )
}
