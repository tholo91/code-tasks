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

/**
 * Priority filter pills for the task list.
 *
 * Story 3-6: Priority Filter
 * - Three pill options: All | Important | Not Important
 * - Active pill: filled accent; inactive: ghost/outline
 * - 44×44px min touch targets on mobile
 */
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
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            data-testid={`priority-filter-${value}`}
            className="whitespace-nowrap rounded-full text-xs font-semibold"
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
              backgroundColor: isActive ? '#58a6ff' : 'transparent',
              borderColor: isActive ? '#58a6ff' : '#30363d',
              color: isActive ? '#0d1117' : '#8b949e',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
