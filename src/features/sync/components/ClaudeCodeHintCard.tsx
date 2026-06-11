import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TRANSITION_NORMAL } from '../../../config/motion'

interface ClaudeCodeHintCardProps {
  onDismiss: () => void
}

export function ClaudeCodeHintCard({ onDismiss }: ClaudeCodeHintCardProps) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -24, opacity: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_NORMAL}
        className="fixed left-0 right-0 top-24 z-40 px-4"
        data-testid="claude-code-hint-card"
      >
        <div
          className="mx-auto flex w-full max-w-[640px] items-start justify-between gap-3 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: '#162030',
            borderColor: 'rgba(56, 139, 253, 0.6)',
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-info)' }}>
              Desktop ready
            </span>
            <span className="text-caption" style={{ color: 'var(--color-text-primary)' }}>
              Open this repo in Claude Code and run{' '}
              <code
                className="rounded px-1 py-0.5 font-mono text-xs"
                style={{ backgroundColor: 'rgba(56, 139, 253, 0.15)', color: 'var(--color-info)' }}
              >
                /captured-ideas
              </code>{' '}
              to hand your tasks to your AI agent.
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="btn-ghost shrink-0"
            aria-label="Dismiss hint"
          >
            Dismiss
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
