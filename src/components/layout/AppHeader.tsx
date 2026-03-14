import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

interface AppHeaderProps {
  isOnline: boolean
}

/**
 * App header with title, user info, repo selection, and sync status indicator.
 */
export function AppHeader({ isOnline }: AppHeaderProps) {
  const user = useSyncStore((s) => s.user)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  return (
    <header className="app-header" data-testid="app-header">
      <div className="flex items-center justify-between">
        <h1 className="app-title">code-tasks</h1>
        <div className="flex items-center gap-2">
          <SyncHeaderStatus />
          {!isOnline && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(210, 153, 34, 0.15)',
                color: '#d29922',
                border: '1px solid rgba(210, 153, 34, 0.2)',
              }}
              role="status"
              data-testid="offline-badge"
            >
              Offline
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-center">
        <p className="app-subtitle">
          {user ? `Welcome, ${user.login}` : 'GitHub issue capture for developers on the go'}
        </p>
        {selectedRepo && (
          <div className="flex items-center gap-2 mt-1">
            <p className="app-repo" data-testid="selected-repo">
              {selectedRepo.fullName}
            </p>
            <button
              onClick={() => useSyncStore.getState().setSelectedRepo(null as any)}
              className="text-[10px] hover:underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              (change)
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
