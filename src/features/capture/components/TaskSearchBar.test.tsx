import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { TaskSearchBar } from './TaskSearchBar'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate,
      transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: Record<string, unknown>
      transition?: Record<string, unknown>
    }) => {
      const animatedStyle = animate
        ? { ...(props.style || {}), opacity: animate.opacity as number }
        : props.style
      return (
        <div {...props} style={animatedStyle}>
          {children}
        </div>
      )
    },
  },
  useReducedMotion: () => false,
}))

describe('TaskSearchBar', () => {
  it('renders de-emphasized when taskCount < 5', () => {
    render(<TaskSearchBar value="" onChange={() => {}} taskCount={3} />)
    const bar = screen.getByTestId('task-search-bar')
    expect(bar.style.opacity).toBe('0.4')
  })

  it('renders prominent when taskCount >= 5', () => {
    render(<TaskSearchBar value="" onChange={() => {}} taskCount={5} />)
    const bar = screen.getByTestId('task-search-bar')
    expect(bar.style.opacity).toBe('1')
  })

  it('calls onChange when user types', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<TaskSearchBar value="" onChange={handleChange} taskCount={5} />)

    const input = screen.getByTestId('task-search-input')
    await user.type(input, 'test')
    expect(handleChange).toHaveBeenCalledTimes(4)
    expect(handleChange).toHaveBeenLastCalledWith('t')
  })

  it('does not show clear button when input is empty', () => {
    render(<TaskSearchBar value="" onChange={() => {}} taskCount={5} />)
    expect(screen.queryByTestId('task-search-clear')).not.toBeInTheDocument()
  })

  it('shows clear button when input has value', () => {
    render(<TaskSearchBar value="search" onChange={() => {}} taskCount={5} />)
    expect(screen.getByTestId('task-search-clear')).toBeInTheDocument()
  })

  it('clears input when clear button is clicked', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<TaskSearchBar value="search" onChange={handleChange} taskCount={5} />)

    await user.click(screen.getByTestId('task-search-clear'))
    expect(handleChange).toHaveBeenCalledWith('')
  })

  it('has accessible label on search input', () => {
    render(<TaskSearchBar value="" onChange={() => {}} taskCount={5} />)
    expect(screen.getByLabelText('Search tasks')).toBeInTheDocument()
  })

  it('has accessible label on clear button', () => {
    render(<TaskSearchBar value="test" onChange={() => {}} taskCount={5} />)
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument()
  })
})
