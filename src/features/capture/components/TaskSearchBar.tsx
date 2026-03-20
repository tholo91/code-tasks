import { useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

interface TaskSearchBarProps {
  value: string
  onChange: (value: string) => void
  taskCount: number
}

export function TaskSearchBar({ value, onChange, taskCount }: TaskSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const isProminent = taskCount >= 5

  return (
    <motion.div
      className="relative w-full"
      animate={{ opacity: isProminent ? 1 : 0.4 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
      data-testid="task-search-bar"
    >
      <div className="relative flex items-center">
        {/* Search icon */}
        <svg
          className="pointer-events-none absolute left-3"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="currentColor"
          style={{ color: 'var(--color-text-secondary)' }}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          data-testid="task-search-input"
          className="input-field"
          style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            data-testid="task-search-clear"
            className="absolute right-1 flex items-center justify-center rounded"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              color: 'var(--color-text-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M1.707.293A1 1 0 00.293 1.707L4.586 6 .293 10.293a1 1 0 101.414 1.414L6 7.414l4.293 4.293a1 1 0 001.414-1.414L7.414 6l4.293-4.293A1 1 0 0010.293.293L6 4.586 1.707.293z"
              />
            </svg>
          </button>
        )}
      </div>
    </motion.div>
  )
}
