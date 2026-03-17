import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    button: ({ children, whileTap: _whileTap, transition: _transition, ...props }: any) => (
      <button {...props}>{children}</button>
    ),
  },
}))

// Mock haptic service
vi.mock('../../../services/native/haptic-service', () => ({
  triggerSelectionHaptic: vi.fn(),
}))

import { CreateTaskFAB } from './CreateTaskFAB'

describe('CreateTaskFAB', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with correct test id', () => {
    render(<CreateTaskFAB onClick={vi.fn()} />)
    expect(screen.getByTestId('create-task-fab')).toBeInTheDocument()
  })

  it('has correct aria-label', () => {
    render(<CreateTaskFAB onClick={vi.fn()} />)
    expect(screen.getByTestId('create-task-fab')).toHaveAttribute('aria-label', 'Create new task')
  })

  it('calls onClick when tapped', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()
    render(<CreateTaskFAB onClick={onClick} />)

    await user.click(screen.getByTestId('create-task-fab'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('triggers haptic feedback on tap', async () => {
    const { triggerSelectionHaptic } = await import('../../../services/native/haptic-service')
    const user = userEvent.setup()
    render(<CreateTaskFAB onClick={vi.fn()} />)

    await user.click(screen.getByTestId('create-task-fab'))
    expect(triggerSelectionHaptic).toHaveBeenCalledTimes(1)
  })
})
