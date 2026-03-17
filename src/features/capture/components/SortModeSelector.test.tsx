import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial: _i, animate: _a, exit: _e, transition: _t, variants: _v, ...props }: any) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}))

import { SortModeSelector } from './SortModeSelector'

describe('SortModeSelector', () => {
  it('renders the trigger button', () => {
    render(<SortModeSelector currentMode="manual" onChange={vi.fn()} />)
    expect(screen.getByTestId('sort-mode-selector')).toBeInTheDocument()
  })

  it('dropdown is not visible initially', () => {
    render(<SortModeSelector currentMode="manual" onChange={vi.fn()} />)
    expect(screen.queryByTestId('sort-option-manual')).not.toBeInTheDocument()
  })

  it('clicking trigger opens dropdown showing 4 options', async () => {
    const user = userEvent.setup()
    render(<SortModeSelector currentMode="manual" onChange={vi.fn()} />)
    await user.click(screen.getByTestId('sort-mode-selector'))
    expect(screen.getByTestId('sort-option-manual')).toBeInTheDocument()
    expect(screen.getByTestId('sort-option-created-desc')).toBeInTheDocument()
    expect(screen.getByTestId('sort-option-updated-desc')).toBeInTheDocument()
    expect(screen.getByTestId('sort-option-priority-first')).toBeInTheDocument()
  })

  it('selecting an option calls onChange with the correct mode', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<SortModeSelector currentMode="manual" onChange={onChange} />)
    await user.click(screen.getByTestId('sort-mode-selector'))
    await user.click(screen.getByTestId('sort-option-created-desc'))
    expect(onChange).toHaveBeenCalledWith('created-desc')
  })

  it('dropdown closes after selecting an option', async () => {
    const user = userEvent.setup()
    render(<SortModeSelector currentMode="manual" onChange={vi.fn()} />)
    await user.click(screen.getByTestId('sort-mode-selector'))
    await user.click(screen.getByTestId('sort-option-priority-first'))
    expect(screen.queryByTestId('sort-option-manual')).not.toBeInTheDocument()
  })

  it('active option has aria-selected=true', async () => {
    const user = userEvent.setup()
    render(<SortModeSelector currentMode="created-desc" onChange={vi.fn()} />)
    await user.click(screen.getByTestId('sort-mode-selector'))
    const activeOption = screen.getByTestId('sort-option-created-desc')
    expect(activeOption).toHaveAttribute('aria-selected', 'true')
    const inactiveOption = screen.getByTestId('sort-option-manual')
    expect(inactiveOption).toHaveAttribute('aria-selected', 'false')
  })
})
