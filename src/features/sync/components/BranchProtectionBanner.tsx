import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITION_NORMAL } from '../../../config/motion'

interface BranchProtectionBannerProps {
  visible: boolean
  fallbackBranch?: string | null
  onDismiss: () => void
  onSwitchRepo: () => void
  onChangeBranch?: () => void
}

export function BranchProtectionBanner({
  visible,
  fallbackBranch,
  onDismiss,
  onSwitchRepo,
  onChangeBranch,
}: BranchProtectionBannerProps) {
  const hasFallback = !!fallbackBranch

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={TRANSITION_NORMAL}
          className="w-full max-w-[640px] overflow-hidden"
          data-testid="branch-protection-banner"
          role="alert"
        >
          <div
            className="relative rounded-lg p-4"
            style={{
              backgroundColor: hasFallback
                ? 'rgba(56, 139, 253, 0.12)'
                : 'rgba(210, 153, 34, 0.15)',
              border: '1px solid var(--color-border)',
            }}
          >
            {/* Dismiss button */}
            <button
              onClick={onDismiss}
              className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Dismiss"
              data-testid="banner-dismiss"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M2 2L10 10M10 2L2 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <div className="flex gap-3 pr-6">
              {hasFallback ? (
                <>
                  {/* Git branch icon */}
                  <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-info)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                      Syncing to branch <code className="text-label font-mono" style={{ color: 'var(--color-info)' }}>{fallbackBranch}</code>
                    </p>
                    <button
                      onClick={onChangeBranch}
                      className="btn-ghost self-start text-label font-medium"
                      style={{ color: 'var(--color-accent)' }}
                      data-testid="banner-change-branch"
                    >
                      Change
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {/* Lock icon */}
                  <div className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-warning)' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M4 4v2h-.25A1.75 1.75 0 002 7.75v5.5c0 .966.784 1.75 1.75 1.75h8.5A1.75 1.75 0 0014 13.25v-5.5A1.75 1.75 0 0012.25 6H12V4a4 4 0 10-8 0zm6.5 2V4a2.5 2.5 0 00-5 0v2h5zM12.25 7.5a.25.25 0 01.25.25v5.5a.25.25 0 01-.25.25h-8.5a.25.25 0 01-.25-.25v-5.5a.25.25 0 01.25-.25h8.5z"
                      />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-2">
                    <p className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                      Can't sync to this repo — it has restrictions that prevent Gitty from saving
                      directly.
                    </p>
                    <p className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                      Your tasks are saved locally and won't be lost.
                    </p>
                    <button
                      onClick={onSwitchRepo}
                      className="btn-ghost self-start text-label font-medium"
                      style={{ color: 'var(--color-accent)' }}
                      data-testid="banner-switch-repo"
                    >
                      Switch Repo
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
