import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITION_NORMAL } from '../../../config/motion'

interface BranchProtectionBannerProps {
  visible: boolean
  onDismiss: () => void
  onSwitchRepo: () => void
}

export function BranchProtectionBanner({
  visible,
  onDismiss,
  onSwitchRepo,
}: BranchProtectionBannerProps) {
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
              backgroundColor: 'rgba(210, 153, 34, 0.15)',
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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
