import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

interface AppHeaderProps {
  isOnline: boolean
  onChangeRepo: () => void
  onOpenSettings: () => void
}

/**
 * Sticky nav-bar header — iOS-native feel.
 * Layout: [app icon] | [repo name ⇅] | [sync status]
 * Three-column grid keeps the repo selector truly centered at all widths.
 */
export function AppHeader({ isOnline, onChangeRepo, onOpenSettings }: AppHeaderProps) {
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  return (
    <header
      className="sticky top-0 z-[40] w-full max-w-[640px]"
      style={{
        backgroundColor: 'var(--color-canvas)',
        borderBottom: '1px solid var(--color-border)',
      }}
      data-testid="app-header"
    >
      <div
        className="grid items-center px-3"
        style={{
          gridTemplateColumns: '1fr auto 1fr',
          minHeight: '48px',
        }}
      >
        {/* ── Left: app icon → opens settings ── */}
        <button
          onClick={onOpenSettings}
          className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-50"
          style={{ WebkitTapHighlightColor: 'transparent' }}
          aria-label="Settings"
          data-testid="settings-button"
        >
          <img src="/pwa-64x64.png" alt="Gitty" className="h-6 w-6 rounded-full" />
        </button>

        {/* ── Center: repo selector ── */}
        {selectedRepo ? (
          <button
            onClick={onChangeRepo}
            className="flex min-w-0 max-w-[200px] items-center gap-1.5 rounded-md border px-2 py-1 transition-opacity active:opacity-50"
            style={{
              WebkitTapHighlightColor: 'transparent',
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
            }}
            data-testid="selected-repo"
            title="Change repository"
          >
            <span
              className="truncate text-[13px] font-semibold leading-none"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {selectedRepo.fullName.split('/').pop()}
            </span>

            {/* Stacked chevrons — signals "selector" without a pill border */}
            <span
              className="flex flex-shrink-0 flex-col items-center gap-[2.5px]"
              style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}
              aria-hidden="true"
            >
              {/* up triangle */}
              <svg width="7" height="4" viewBox="0 0 7 4" fill="currentColor">
                <path d="M3.5 0L7 4H0L3.5 0Z" />
              </svg>
              {/* down triangle */}
              <svg width="7" height="4" viewBox="0 0 7 4" fill="currentColor">
                <path d="M0 0H7L3.5 4L0 0Z" />
              </svg>
            </span>
          </button>
        ) : (
          <span />
        )}

        {/* ── Right: status ── */}
        <div className="flex items-center justify-end gap-1">
          {!isOnline && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: 'var(--color-warning)',
                border: '1px solid var(--color-border)',
              }}
              role="status"
              data-testid="offline-badge"
            >
              offline
            </span>
          )}

          <SyncHeaderStatus />

        </div>
      </div>
    </header>
  )
}
