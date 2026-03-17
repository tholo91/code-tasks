import { motion, useReducedMotion } from 'framer-motion'

interface SettingsSheetProps {
  onClose: () => void
  onOpenRoadmap: () => void
}

const SHEET_SPRING = { type: 'spring' as const, stiffness: 400, damping: 35 }

export function SettingsSheet({ onClose, onOpenRoadmap }: SettingsSheetProps) {
  const prefersReducedMotion = useReducedMotion()
  const sheetTransition = prefersReducedMotion ? { duration: 0.15 } : SHEET_SPRING

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={prefersReducedMotion ? { duration: 0.15 } : undefined}
      className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      data-testid="settings-sheet"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={sheetTransition}
        drag="y"
        dragConstraints={{ top: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y > 100 || info.velocity.y > 300) {
            onClose()
          }
        }}
        className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Handle bar */}
        <div
          className="mx-auto mb-5 mt-1 h-1.5 w-12 rounded-full"
          style={{ backgroundColor: 'rgba(139, 148, 158, 0.4)' }}
        />

        <div className="flex flex-col gap-1">
          {/* Roadmap */}
          <button
            onClick={() => {
              onClose()
              onOpenRoadmap()
            }}
            className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-canvas)' }}
            data-testid="settings-roadmap"
          >
            <div className="flex items-center gap-3">
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
              <span className="text-body font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Roadmap
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <path d="M4 2L8 6L4 10" />
            </svg>
          </button>

          {/* GitHub link */}
          <a
            href="https://github.com/tholo91/code-tasks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--color-canvas)' }}
            data-testid="settings-github"
          >
            <div className="flex items-center gap-3">
              <svg
                width="18"
                height="18"
                viewBox="0 0 16 16"
                fill="currentColor"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span className="text-body font-medium" style={{ color: 'var(--color-text-primary)' }}>
                GitHub
              </span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>

          {/* Version */}
          <div className="mt-3 text-center">
            <span className="text-caption" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
              code-tasks v0.0.1
            </span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
