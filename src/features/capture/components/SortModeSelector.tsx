import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { TRANSITION_SPRING } from '../../../config/motion'
import type { SortMode } from '../../../types/task'

interface SortModeSelectorProps {
  currentMode: SortMode
  onChange: (mode: SortMode) => void
}

const options: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'created-desc', label: 'Newest First' },
  { value: 'updated-desc', label: 'Recently Edited' },
  { value: 'priority-first', label: 'Priority First' },
]

export function SortModeSelector({ currentMode, onChange }: SortModeSelectorProps) {
  const [open, setOpen] = useState(false)
  const prefersReducedMotion = useReducedMotion()
  const containerRef = useRef<HTMLDivElement>(null)

  const isNonDefault = currentMode !== 'manual'

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  const dropdownVariants: Variants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, scale: 0.95, y: -4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -4 },
      }

  return (
    <div ref={containerRef} className="relative flex-shrink-0">
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label="Sort tasks"
        aria-expanded={open}
        aria-haspopup="listbox"
        data-testid="sort-mode-selector"
        style={{
          minWidth: 44,
          minHeight: 44,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          border: '1px solid',
          borderColor: isNonDefault ? 'var(--color-accent)' : 'var(--color-border)',
          backgroundColor: isNonDefault ? 'var(--color-accent)' : 'transparent',
          color: isNonDefault ? 'var(--color-canvas)' : 'var(--color-text-secondary)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          userSelect: 'none',
        }}
      >
        {/* Sort icon (↕) */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M5 4.5L8 1.5L11 4.5H5ZM5 11.5L8 14.5L11 11.5H5Z" />
          <path d="M7 3V13M9 3V13" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {/* Backdrop to close on outside click */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Dropdown panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Sort mode"
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={TRANSITION_SPRING}
            className="absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden"
            style={{
              minWidth: 180,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}
          >
            {options.map(({ value, label }) => {
              const isActive = currentMode === value
              return (
                <button
                  key={value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(value)
                    setOpen(false)
                  }}
                  data-testid={`sort-option-${value}`}
                  style={{
                    width: '100%',
                    minHeight: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 16px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    fontWeight: isActive ? 600 : 400,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <span>{label}</span>
                  {isActive && (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7L5.5 10.5L12 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
