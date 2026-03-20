import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { BottomSheet } from '../../../components/ui/BottomSheet'

interface BranchFallbackPromptProps {
  visible: boolean
  defaultBranchName: string
  onConfirm: (branchName: string) => void
  onDismiss: () => void
}

export function BranchFallbackPrompt({
  visible,
  defaultBranchName,
  onConfirm,
  onDismiss,
}: BranchFallbackPromptProps) {
  const [branchName, setBranchName] = useState(defaultBranchName)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = branchName.trim()
    if (trimmed) onConfirm(trimmed)
  }

  return (
    <AnimatePresence>
      {visible && (
        <BottomSheet
          onClose={onDismiss}
          ariaLabel="Push to branch fallback"
          testId="branch-fallback-prompt"
        >
          <div className="flex flex-col gap-4 pt-4">
            {/* Branch icon */}
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0" style={{ color: 'var(--color-info)' }}>
                <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M11.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122V6A2.5 2.5 0 0110 8.5H6a1 1 0 00-1 1v1.128a2.251 2.251 0 11-1.5 0V5.372a2.25 2.25 0 111.5 0v1.836A2.492 2.492 0 016 7h4a1 1 0 001-1v-.628A2.25 2.25 0 019.5 3.25zM4.25 12a.75.75 0 100 1.5.75.75 0 000-1.5zM3.5 3.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0z" />
                </svg>
              </div>
              <h3 className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Push to a branch instead?
              </h3>
            </div>

            <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
              This repo has branch protection. Your tasks can be pushed to a separate branch instead.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="branch-name-input"
                  className="text-label font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Branch name
                </label>
                <input
                  id="branch-name-input"
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  className="w-full rounded-lg px-3 py-2.5 text-body"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                  }}
                  data-testid="branch-name-input"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onDismiss}
                  className="btn-ghost flex-1 rounded-lg py-2.5 text-body font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                  data-testid="branch-fallback-dismiss"
                >
                  Not now
                </button>
                <button
                  type="submit"
                  disabled={!branchName.trim()}
                  className="flex-1 rounded-lg py-2.5 text-body font-medium"
                  style={{
                    backgroundColor: 'var(--color-info)',
                    color: '#ffffff',
                    opacity: branchName.trim() ? 1 : 0.5,
                  }}
                  data-testid="branch-fallback-confirm"
                >
                  Push to branch
                </button>
              </div>

              <button
                type="button"
                onClick={() => onConfirm('')}
                className="btn-ghost w-full rounded-lg py-2 text-label font-medium"
                style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}
                data-testid="branch-fallback-disable"
              >
                Disable fallback (go back to "Can't sync")
              </button>
            </div>
            </form>
          </div>
        </BottomSheet>
      )}
    </AnimatePresence>
  )
}
