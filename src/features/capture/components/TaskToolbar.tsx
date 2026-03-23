import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion'
import { TRANSITION_SPRING } from '../../../config/motion'
import type { PriorityFilter, SortMode } from '../../../types/task'

interface TaskToolbarProps {
  priorityFilter: PriorityFilter
  onPriorityFilterChange: (filter: PriorityFilter) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  sortMode: SortMode
  onSortModeChange: (mode: SortMode) => void
  hasImportantTasks: boolean
}

/* ── Filter tab definitions ── */
const filters: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'important', label: 'Important' },
  { value: 'not-important', label: 'Normal' },
]

/* ── Sort options ── */
const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'created-desc', label: 'Newest First' },
  { value: 'updated-desc', label: 'Recently Edited' },
  { value: 'priority-first', label: 'Priority First' },
]

/* ── Spring tuning ── */
const SEGMENTED_SPRING = { type: 'spring' as const, stiffness: 500, damping: 40, mass: 0.8 }
const TOOLBAR_SPRING = { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.9 }

/* ── Animation variants ── */
const tabsVariants: Variants = {
  initial: { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.92, filter: 'blur(4px)' },
}

const searchVariants: Variants = {
  initial: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.95, filter: 'blur(4px)' },
}

export function TaskToolbar({
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchQueryChange,
  sortMode,
  onSortModeChange,
  hasImportantTasks,
}: TaskToolbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const sortContainerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const isNonDefaultSort = sortMode !== 'manual'

  // Focus search input when search opens
  useEffect(() => {
    if (isSearchOpen) {
      // Small delay lets AnimatePresence mount the input first
      const t = setTimeout(() => searchInputRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [isSearchOpen])

  // Close sort dropdown on Escape
  useEffect(() => {
    if (!sortOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSortOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [sortOpen])

  const handleCancelSearch = useCallback(() => {
    onSearchQueryChange('')
    setIsSearchOpen(false)
  }, [onSearchQueryChange])

  const spring = prefersReducedMotion ? { duration: 0 } : TOOLBAR_SPRING

  const dropdownVariants: Variants = prefersReducedMotion
    ? { initial: {}, animate: {}, exit: {} }
    : {
        initial: { opacity: 0, scale: 0.95, y: -4 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.95, y: -4 },
      }

  return (
    <div
      className="relative w-full"
      data-testid="task-toolbar"
    >
      <div
        className="flex items-center gap-2 px-3 py-2"
        style={{ minHeight: 52 }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isSearchOpen ? (
            /* ── Search mode ── */
            <motion.div
              key="search"
              variants={prefersReducedMotion ? {} : searchVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={spring}
              className="flex flex-1 items-center gap-2"
            >
              {/* Search input container */}
              <div
                className="relative flex flex-1 items-center rounded-xl"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {/* Magnifying glass inside input */}
                <svg
                  className="pointer-events-none absolute left-3 flex-shrink-0"
                  width="15"
                  height="15"
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
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  data-testid="task-search-input"
                  className="w-full bg-transparent text-[13px] font-medium outline-none"
                  style={{
                    color: 'var(--color-text-primary)',
                    padding: '10px 36px 10px 34px',
                    minHeight: 40,
                  }}
                />

                {/* Clear (X) button inside input */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchQueryChange('')
                      searchInputRef.current?.focus()
                    }}
                    aria-label="Clear search"
                    data-testid="task-search-clear"
                    className="absolute right-1 flex items-center justify-center rounded-full"
                    style={{
                      width: 28,
                      height: 28,
                      color: 'var(--color-text-secondary)',
                      backgroundColor: 'rgba(139, 148, 158, 0.12)',
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
                      <path d="M1.707.293A1 1 0 00.293 1.707L4.586 6 .293 10.293a1 1 0 101.414 1.414L6 7.414l4.293 4.293a1 1 0 001.414-1.414L7.414 6l4.293-4.293A1 1 0 0010.293.293L6 4.586 1.707.293z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Cancel button */}
              <motion.button
                type="button"
                onClick={handleCancelSearch}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05, ...TOOLBAR_SPRING }}
                className="flex-shrink-0 text-[13px] font-semibold"
                style={{
                  color: 'var(--color-accent)',
                  padding: '8px 4px',
                  WebkitTapHighlightColor: 'transparent',
                }}
                data-testid="task-search-cancel"
              >
                Cancel
              </motion.button>
            </motion.div>
          ) : (
            /* ── Normal mode: [search] [tabs] [sort] ── */
            <motion.div
              key="tabs"
              variants={prefersReducedMotion ? {} : tabsVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={spring}
              className="flex flex-1 items-center gap-2"
            >
              {/* Search icon button */}
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search tasks"
                data-testid="task-search-button"
                className="flex flex-shrink-0 items-center justify-center rounded-full transition-colors active:opacity-50"
                style={{
                  width: 38,
                  height: 38,
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
                  />
                </svg>
              </button>

              {/* Segmented control — priority filter */}
              {hasImportantTasks ? (
                <div
                  className="flex flex-1 rounded-xl p-[3px]"
                  role="group"
                  aria-label="Filter tasks by priority"
                  data-testid="priority-filter-pills"
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  {filters.map(({ value, label }) => {
                    const isActive = priorityFilter === value
                    return (
                      <motion.button
                        key={value}
                        type="button"
                        onClick={() => onPriorityFilterChange(value)}
                        aria-pressed={isActive}
                        data-testid={`priority-filter-${value}`}
                        whileTap={{ scale: 0.97 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        className="relative flex flex-1 items-center justify-center rounded-[9px]"
                        style={{
                          minHeight: 32,
                          padding: '0 10px',
                          userSelect: 'none',
                          WebkitTapHighlightColor: 'transparent',
                          color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {isActive && (
                          <motion.span
                            layoutId="filter-active-bg"
                            className="absolute inset-0 rounded-[9px]"
                            style={{
                              backgroundColor: 'var(--color-canvas)',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.04)',
                            }}
                            transition={prefersReducedMotion ? { duration: 0 } : SEGMENTED_SPRING}
                          />
                        )}
                        <span className="relative z-10 text-[12px] font-semibold" style={{ letterSpacing: '0.01em' }}>
                          {label}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              ) : (
                <div className="flex-1" />
              )}

              {/* Sort icon button */}
              <div ref={sortContainerRef} className="relative flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSortOpen(!sortOpen)}
                  aria-label="Sort tasks"
                  aria-expanded={sortOpen}
                  aria-haspopup="listbox"
                  data-testid="sort-mode-selector"
                  className="flex items-center justify-center rounded-full transition-colors active:opacity-50"
                  style={{
                    width: 38,
                    height: 38,
                    border: '1px solid',
                    borderColor: isNonDefaultSort ? 'var(--color-accent)' : 'var(--color-border)',
                    backgroundColor: isNonDefaultSort ? 'var(--color-accent)' : 'var(--color-surface)',
                    color: isNonDefaultSort ? 'var(--color-canvas)' : 'var(--color-text-secondary)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {/* Descending bars icon */}
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <line x1="3" y1="4" x2="13" y2="4" />
                    <line x1="3" y1="8" x2="10" y2="8" />
                    <line x1="3" y1="12" x2="7" y2="12" />
                  </svg>
                </button>

                {/* Sort backdrop */}
                {sortOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setSortOpen(false)}
                    aria-hidden="true"
                  />
                )}

                {/* Sort dropdown */}
                <AnimatePresence>
                  {sortOpen && (
                    <motion.div
                      role="listbox"
                      aria-label="Sort mode"
                      variants={dropdownVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={TRANSITION_SPRING}
                      className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-xl"
                      style={{
                        minWidth: 180,
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
                      }}
                    >
                      {sortOptions.map(({ value, label }) => {
                        const isActive = sortMode === value
                        return (
                          <button
                            key={value}
                            type="button"
                            role="option"
                            aria-selected={isActive}
                            onClick={() => {
                              onSortModeChange(value)
                              setSortOpen(false)
                            }}
                            data-testid={`sort-option-${value}`}
                            className="flex w-full items-center justify-between"
                            style={{
                              minHeight: 44,
                              padding: '10px 16px',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                              fontWeight: isActive ? 600 : 400,
                              fontSize: 14,
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
