import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { pageVariants, TRANSITION_NORMAL } from '../../../config/motion'
import { APP_VERSION } from '../../../config/app'
import { ShareQRSheet } from './ShareQRSheet'
import type { Variants } from 'framer-motion'

interface AboutGittyViewProps {
  onClose: () => void
}

const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
}

const fadeUp: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: TRANSITION_NORMAL },
}

function GittyMark() {
  return (
    <div
      className="relative flex items-center justify-center rounded-2xl"
      style={{
        width: 72,
        height: 72,
        background: 'linear-gradient(135deg, var(--color-accent), #3b82f6)',
        boxShadow: '0 8px 32px rgba(88, 166, 255, 0.25), 0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Git branch icon */}
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M6 21V9a9 9 0 009 9" />
      </svg>
    </div>
  )
}

export function AboutGittyView({ onClose }: AboutGittyViewProps) {
  const [showShareSheet, setShowShareSheet] = useState(false)
  const prefersReducedMotion = useReducedMotion()

  const containerVariants: Variants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : pageVariants

  const itemVariants: Variants = prefersReducedMotion
    ? { initial: {}, animate: {} }
    : fadeUp

  const stagger: Variants = prefersReducedMotion
    ? { animate: {} }
    : staggerContainer

  return (
    <motion.div
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col w-full max-w-[640px] px-4 py-6"
      data-testid="about-gitty-view"
    >
      {/* Close button */}
      <header className="flex items-center justify-end mb-2">
        <button
          onClick={onClose}
          aria-label="Close about"
          className="flex items-center justify-center rounded-full hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          style={{ minWidth: '44px', minHeight: '44px' }}
          data-testid="about-close-button"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      <motion.div
        variants={stagger}
        initial="initial"
        animate="animate"
        className="flex flex-col items-center gap-6"
      >
        {/* App icon + identity */}
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-3">
          <GittyMark />
          <div className="flex flex-col items-center gap-0.5 mt-1">
            <h2
              className="text-xl font-bold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Gitty Tasks
            </h2>
            <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
              Task capture for developers
            </p>
          </div>
        </motion.div>

        {/* Story */}
        <motion.div
          variants={itemVariants}
          className="w-full rounded-xl px-5 py-4"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
          }}
        >
          <p
            className="text-body leading-relaxed text-center"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Born out of frustration with task apps that don&apos;t speak GitHub.
            Built for developers who think in repos, not lists.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div variants={itemVariants} className="flex flex-col gap-2.5 w-full">
          <a
            href="https://github.com/tholo91/code-tasks"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl font-semibold text-body transition-opacity hover:opacity-90 active:opacity-80"
            style={{
              minHeight: '48px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-canvas)',
              textDecoration: 'none',
            }}
            data-testid="about-star-link"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z" />
            </svg>
            Star on GitHub
          </a>

          <a
            href="https://github.com/tholo91/code-tasks/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 rounded-xl text-body transition-colors hover:bg-[rgba(255,255,255,0.04)] active:bg-[rgba(255,255,255,0.06)]"
            style={{
              minHeight: '48px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              textDecoration: 'none',
            }}
            data-testid="about-report-link"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              <path fillRule="evenodd" d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
            </svg>
            Report an Issue
          </a>

          <button
            onClick={() => setShowShareSheet(true)}
            className="flex items-center justify-center gap-2.5 rounded-xl text-body transition-colors hover:bg-[rgba(255,255,255,0.04)] active:bg-[rgba(255,255,255,0.06)]"
            style={{
              minHeight: '48px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
            data-testid="about-share-button"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            Share Gitty
          </button>
        </motion.div>

        {/* Version */}
        <motion.div variants={itemVariants} className="pt-2 pb-1">
          <span
            className="text-caption tracking-wide"
            style={{ color: 'var(--color-text-secondary)', opacity: 0.4 }}
          >
            v{APP_VERSION}
          </span>
        </motion.div>
      </motion.div>

      {/* Share QR Sheet */}
      <AnimatePresence>
        {showShareSheet && (
          <ShareQRSheet onClose={() => setShowShareSheet(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
