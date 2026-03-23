import { BottomSheet } from '../ui/BottomSheet'
import { SettingsMenuItem } from '../ui/SettingsMenuItem'

interface SettingsSheetProps {
  onClose: () => void
  onOpenRoadmap: () => void
  onOpenAbout: () => void
}

export function SettingsSheet({ onClose, onOpenRoadmap, onOpenAbout }: SettingsSheetProps) {
  return (
    <BottomSheet
      onClose={onClose}
      ariaLabel="Settings"
      testId="settings-sheet"
    >
      <div className="flex flex-col gap-1">
        <SettingsMenuItem
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-accent)' }}
            >
              <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
              <path d="M9 3v15" />
              <path d="M15 6v15" />
            </svg>
          }
          label="Roadmap"
          onClick={() => {
            onClose()
            onOpenRoadmap()
          }}
          testId="settings-roadmap"
        />

        <SettingsMenuItem
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 16 16"
              fill="currentColor"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
          }
          label="GitHub"
          href="https://github.com/tholo91/code-tasks"
          testId="settings-github"
        />

        <SettingsMenuItem
          icon={
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          }
          label="About Gitty"
          onClick={() => {
            onClose()
            onOpenAbout()
          }}
          testId="settings-about"
        />

        {/* Version */}
        <div className="mt-3 text-center">
          <span className="text-caption" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
            Gitty-Tasks v0.0.1
          </span>
        </div>
      </div>
    </BottomSheet>
  )
}
