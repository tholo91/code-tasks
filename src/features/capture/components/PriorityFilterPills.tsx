import { motion } from 'framer-motion'
import { TRANSITION_SPRING } from '../../../config/motion'
import type { PriorityFilter } from '../../../types/task'

interface PriorityFilterPillsProps {
  currentFilter: PriorityFilter
  onChange: (filter: PriorityFilter) => void
}

const filters: { value: PriorityFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'important', label: 'Important' },
  { value: 'not-important', label: 'Not Important' },
]

export function PriorityFilterPills({ currentFilter, onChange }: PriorityFilterPillsProps) {
  return (
    <div
      className="flex gap-2 overflow-x-auto"
      style={{ WebkitOverflowScrolling: 'touch' }}
      role="group"
      aria-label="Filter tasks by priority"
      data-testid="priority-filter-pills"
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
            whileTap={{ scale: 0.95 }}
            transition={TRANSITION_SPRING}
            className="whitespace-nowrap rounded-full text-label font-semibold"
            style={{
              minWidth: '44px',
              minHeight: '44px',
              padding: '6px 14px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitTapHighlightColor: 'transparent',
              border: '1px solid',
              backgroundColor: isActive ? 'var(--color-accent)' : 'transparent',
              borderColor: isActive ? 'var(--color-accent)' : 'var(--color-border)',
              color: isActive ? 'var(--color-canvas)' : 'var(--color-text-secondary)',
            }}
          >
            {label}
          </motion.button>
        )
      })}
    </div>
  )
}
