import { motion } from 'framer-motion'
import type { PriorityFilter } from '../../../types/task'

interface PriorityFilterPillsProps {
  currentFilter: PriorityFilter
  onChange: (filter: PriorityFilter) => void
}

const filters: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'important', label: 'Important' },
  { value: 'not-important', label: 'Normal' },
]

/**
 * iOS-style segmented control — replaces three independent pills with a single
 * unified container and a spring-animated sliding background (Framer layoutId).
 * The active segment's background slides smoothly between positions on selection.
 */
export function PriorityFilterPills({ currentFilter, onChange }: PriorityFilterPillsProps) {
  return (
    <div
      className="mx-4 mb-2 flex rounded-[10px] p-[3px]"
      role="group"
      aria-label="Filter tasks by priority"
      data-testid="priority-filter-pills"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
      }}
    >
      {filters.map(({ value, label }) => {
        const isActive = currentFilter === value
        return (
          <motion.button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            data-testid={`priority-filter-${value}`}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="relative flex flex-1 items-center justify-center rounded-[7px]"
            style={{
              minHeight: '34px',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
            }}
          >
            {/* Sliding background — layoutId causes Framer to animate it
                between whichever button is active, giving the native
                segmented-control slide effect with zero position math. */}
            {isActive && (
              <motion.span
                layoutId="filter-active-bg"
                className="absolute inset-0 rounded-[7px]"
                style={{
                  backgroundColor: 'var(--color-canvas)',
                  boxShadow:
                    '0 1px 2px rgba(0,0,0,0.28), 0 0 0 0.5px rgba(255,255,255,0.04)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 40, mass: 0.8 }}
              />
            )}
            <span
              className="relative z-10 text-[12px] font-semibold"
              style={{ letterSpacing: '0.01em' }}
            >
              {label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
