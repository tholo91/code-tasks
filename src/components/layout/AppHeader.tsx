import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

interface AppHeaderProps {
  isOnline: boolean
  onChangeRepo: () => void
}

/**
 * Compact single-row app header: [brand] [repo-chip] [sync-badge]
 */
export function AppHeader({ isOnline, onChangeRepo }: AppHeaderProps) {
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  return (
    <header
      className="flex w-full max-w-[640px] items-center justify-between px-4 py-3"
      data-testid="app-header"
    >
      {/* Brand */}
      <span
        className="text-label font-semibold"
        style={{ color: 'var(--color-accent)' }}
      >
        code-tasks
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
      </div>
    </header>
  )
}
