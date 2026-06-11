import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PriorityFilterPills } from './PriorityFilterPills'

// Mock framer-motion to render plain buttons
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      animate,
      whileTap,
      transition,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      animate?: Record<string, unknown>
      whileTap?: Record<string, unknown>
      transition?: Record<string, unknown>
    }) => (
      <button {...props}>{children}</button>
    ),
    span: ({
      children,
      layoutId,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLSpanElement> & {
      layoutId?: string
      transition?: Record<string, unknown>
    }) => <span {...props}>{children}</span>,
  },
}))

describe('PriorityFilterPills', () => {
  it('renders three pills — All, Important, Normal', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Important')).toBeInTheDocument()
    expect(screen.getByText('Normal')).toBeInTheDocument()
  })

  it('All pill is active by default', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    const allPill = screen.getByTestId('priority-filter-all')
    expect(allPill).toHaveAttribute('aria-pressed', 'true')
    // Active segment uses the primary text color; the sliding background
    // lives on a separate span, not the button itself.
    expect(allPill.style.color).toBe('var(--color-text-primary)')
  })

  it('inactive pills have ghost styling', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    const importantPill = screen.getByTestId('priority-filter-important')
    expect(importantPill).toHaveAttribute('aria-pressed', 'false')
    expect(importantPill.style.color).toBe('var(--color-text-secondary)')
  })

  it('clicking Important pill calls onChange with "important"', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<PriorityFilterPills currentFilter="all" onChange={handleChange} />)

    await user.click(screen.getByTestId('priority-filter-important'))
    expect(handleChange).toHaveBeenCalledWith('important')
  })

  it('clicking Not Important pill calls onChange with "not-important"', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<PriorityFilterPills currentFilter="all" onChange={handleChange} />)

    await user.click(screen.getByTestId('priority-filter-not-important'))
    expect(handleChange).toHaveBeenCalledWith('not-important')
  })

  it('clicking All pill calls onChange with "all"', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<PriorityFilterPills currentFilter="important" onChange={handleChange} />)

    await user.click(screen.getByTestId('priority-filter-all'))
    expect(handleChange).toHaveBeenCalledWith('all')
  })

  it('active pill has distinct styling from inactive pills', () => {
    render(<PriorityFilterPills currentFilter="important" onChange={() => {}} />)

    const activePill = screen.getByTestId('priority-filter-important')
    const inactivePill = screen.getByTestId('priority-filter-all')

    expect(activePill).toHaveAttribute('aria-pressed', 'true')
    expect(inactivePill).toHaveAttribute('aria-pressed', 'false')
    expect(activePill.style.color).toBe('var(--color-text-primary)')
    expect(inactivePill.style.color).toBe('var(--color-text-secondary)')
  })

  it('has accessible group label', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Filter tasks by priority' })).toBeInTheDocument()
  })
})
