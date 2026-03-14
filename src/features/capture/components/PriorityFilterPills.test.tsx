import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { PriorityFilterPills } from './PriorityFilterPills'

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
    // jsdom converts hex to rgb
    expect(
      allPill.style.backgroundColor === '#58a6ff' ||
      allPill.style.backgroundColor === 'rgb(88, 166, 255)',
    ).toBe(true)
  })

  it('inactive pills have ghost styling', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    const importantPill = screen.getByTestId('priority-filter-important')
    expect(importantPill).toHaveAttribute('aria-pressed', 'false')
    expect(importantPill.style.backgroundColor).toBe('transparent')
    expect(
      importantPill.style.borderColor === '#30363d' ||
      importantPill.style.borderColor === 'rgb(48, 54, 61)',
    ).toBe(true)
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

    // jsdom converts hex to rgb
    expect(
      activePill.style.backgroundColor === '#58a6ff' ||
      activePill.style.backgroundColor === 'rgb(88, 166, 255)',
    ).toBe(true)
    expect(
      activePill.style.color === '#0d1117' ||
      activePill.style.color === 'rgb(13, 17, 23)',
    ).toBe(true)
    expect(inactivePill.style.backgroundColor).toBe('transparent')
    expect(
      inactivePill.style.color === '#8b949e' ||
      inactivePill.style.color === 'rgb(139, 148, 158)',
    ).toBe(true)
  })

  it('has accessible group label', () => {
    render(<PriorityFilterPills currentFilter="all" onChange={() => {}} />)
    expect(screen.getByRole('group', { name: 'Filter tasks by priority' })).toBeInTheDocument()
  })
})
