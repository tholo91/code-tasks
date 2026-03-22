import { useSyncStore } from '../../stores/useSyncStore'
import { SyncHeaderStatus } from './SyncHeaderStatus'

interface AppHeaderProps {
  isOnline: boolean
  onChangeRepo: () => void
  onOpenSettings?: () => void
}

/**
 * Sticky nav-bar header — iOS-native feel.
 * Layout: [gitty brand] | [repo name ⇅] | [sync · settings]
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
        {/* ── Left: brand watermark ── */}
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: 'var(--color-accent)' }}
        >
          gitty
        </span>

        {/* ── Center: repo selector ── */}
        {selectedRepo ? (
          <button
            onClick={onChangeRepo}
            className="flex min-w-0 max-w-[200px] items-center gap-1.5 rounded-lg px-2 py-1.5 transition-opacity active:opacity-50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
            data-testid="selected-repo"
            title="Change repository"
          >
            <span
              className="truncate text-[13px] font-semibold leading-none"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {selectedRepo.fullName}
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

        {/* ── Right: status + settings ── */}
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

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="-mr-0.5 flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-80 active:opacity-50"
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
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
