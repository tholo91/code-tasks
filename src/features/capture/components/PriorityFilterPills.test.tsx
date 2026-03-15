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
  },
}))

describe('PriorityFilterPills', () => {
  it('renders three pills — All, Important, Not Important', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Important')).toBeInTheDocument()
    expect(screen.getByText('Not Important')).toBeInTheDocument()
  })

  it('All pill is active by default', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    const allPill = screen.getByTestId('priority-filter-all')
    expect(allPill).toHaveAttribute('aria-pressed', 'true')
    // Uses CSS var for background
    expect(allPill.style.backgroundColor).toBe('var(--color-accent)')
  })

  it('inactive pills have ghost styling', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    const importantPill = screen.getByTestId('priority-filter-important')
    expect(importantPill).toHaveAttribute('aria-pressed', 'false')
    expect(importantPill.style.backgroundColor).toBe('transparent')
    expect(importantPill.style.borderColor).toBe('var(--color-border)')
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

    expect(activePill.style.backgroundColor).toBe('var(--color-accent)')
    expect(activePill.style.color).toBe('var(--color-canvas)')
    expect(inactivePill.style.backgroundColor).toBe('transparent')
    expect(inactivePill.style.color).toBe('var(--color-text-secondary)')
  })

  it('has accessible group label', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Filter tasks by priority' })).toBeInTheDocument()
  })
})
