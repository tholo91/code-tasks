import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
  useDragControls: () => ({ start: vi.fn() }),
}))

import { BranchFallbackPrompt } from './BranchFallbackPrompt'

describe('BranchFallbackPrompt', () => {
  it('renders with pre-filled branch name', () => {
    render(
      <BranchFallbackPrompt
        visible={true}
        defaultBranchName="gitty/testuser"
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    const input = screen.getByTestId('branch-name-input') as HTMLInputElement
    expect(input.value).toBe('gitty/testuser')
  })

  it('calls onConfirm with branch name on submit', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()

    render(
      <BranchFallbackPrompt
        visible={true}
        defaultBranchName="gitty/testuser"
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    )

    await user.click(screen.getByTestId('branch-fallback-confirm'))
    expect(onConfirm).toHaveBeenCalledWith('gitty/testuser')
  })

  it('calls onConfirm with edited branch name', async () => {
    const onConfirm = vi.fn()
    const user = userEvent.setup()

    render(
      <BranchFallbackPrompt
        visible={true}
        defaultBranchName="gitty/testuser"
        onConfirm={onConfirm}
        onDismiss={vi.fn()}
      />,
    )

    const input = screen.getByTestId('branch-name-input')
    await user.clear(input)
    await user.type(input, 'my-custom-branch')
    await user.click(screen.getByTestId('branch-fallback-confirm'))
    expect(onConfirm).toHaveBeenCalledWith('my-custom-branch')
  })

  it('calls onDismiss on cancel', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    render(
      <BranchFallbackPrompt
        visible={true}
        defaultBranchName="gitty/testuser"
        onConfirm={vi.fn()}
        onDismiss={onDismiss}
      />,
    )

    await user.click(screen.getByTestId('branch-fallback-dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not render when not visible', () => {
    render(
      <BranchFallbackPrompt
        visible={false}
        defaultBranchName="gitty/testuser"
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('branch-fallback-prompt')).not.toBeInTheDocument()
  })

  it('disables confirm button when branch name is empty', async () => {
    const user = userEvent.setup()

    render(
      <BranchFallbackPrompt
        visible={true}
        defaultBranchName="gitty/testuser"
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    const input = screen.getByTestId('branch-name-input')
    await user.clear(input)

    const confirmBtn = screen.getByTestId('branch-fallback-confirm')
    expect(confirmBtn).toBeDisabled()
  })

  it('shows explanatory text about branch protection', () => {
    render(
      <BranchFallbackPrompt
        visible={true}
        defaultBranchName="gitty/testuser"
        onConfirm={vi.fn()}
        onDismiss={vi.fn()}
      />,
    )

    expect(screen.getByText(/branch protection/)).toBeInTheDocument()
    expect(screen.getByText(/Push to a branch instead/)).toBeInTheDocument()
  })
})
