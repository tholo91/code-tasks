import { motion, useReducedMotion } from 'framer-motion'
import { pageVariants, TRANSITION_NORMAL } from '../../../config/motion'
import type { Variants } from 'framer-motion'

interface AboutGittyViewProps {
  onClose: () => void
}

export function AboutGittyView({ onClose }: AboutGittyViewProps) {
  const prefersReducedMotion = useReducedMotion()

  const variants: Variants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : pageVariants

  const transition = prefersReducedMotion ? { duration: 0 } : TRANSITION_NORMAL

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}
      className="flex flex-col w-full max-w-[640px] px-4 py-6 gap-6"
      data-testid="about-gitty-view"
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <h2 className="text-title font-bold" style={{ color: 'var(--color-text-primary)' }}>
          About Gitty
        </h2>
        <button
          onClick={onClose}
          aria-label="Close about"
          className="flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.05)]"
          style={{ minWidth: '44px', minHeight: '44px' }}
          data-testid="about-close-button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {/* App identity */}
      <div className="flex flex-col gap-1">
        <p className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Gitty Tasks
        </p>
        <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
          Task capture for developers
        </p>
      </div>

      {/* Story of Gitty */}
      <div className="flex flex-col gap-2">
        <h3 className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
          Story of Gitty
        </h3>
        <p className="text-body leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
          Gitty was born out of frustration with task apps that don&apos;t speak GitHub. Built for developers who think in repos, not lists.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3">
        <a
          href="https://github.com/tholo91/code-tasks"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg font-semibold text-body"
          style={{
            minHeight: '44px',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-canvas)',
            textDecoration: 'none',
          }}
          data-testid="about-star-link"
        >
          ⭐ Star on GitHub
        </a>

        <a
          href="https://github.com/tholo91/code-tasks/issues/new"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg text-body"
          style={{
            minHeight: '44px',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-secondary)',
            textDecoration: 'none',
          }}
          data-testid="about-report-link"
        >
          Report an Issue
        </a>
      </div>

      {/* Version */}
      <div className="text-center mt-2">
        <span className="text-caption" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
          code-tasks v0.0.1
        </span>
      </div>
    </motion.div>
  )
}
