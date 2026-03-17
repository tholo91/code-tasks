import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

import { BranchProtectionBanner } from './BranchProtectionBanner'

describe('BranchProtectionBanner', () => {
  it('renders with correct non-technical message when visible', () => {
    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={vi.fn()}
        onSwitchRepo={vi.fn()}
      />,
    )

    expect(screen.getByTestId('branch-protection-banner')).toBeInTheDocument()
    expect(
      screen.getByText(/Can't sync to this repo/),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/restrictions that prevent Gitty from saving directly/),
    ).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(
      <BranchProtectionBanner
        visible={false}
        onDismiss={vi.fn()}
        onSwitchRepo={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('branch-protection-banner')).not.toBeInTheDocument()
  })

  it('shows "saved locally" reassurance text', () => {
    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={vi.fn()}
        onSwitchRepo={vi.fn()}
      />,
    )

    expect(
      screen.getByText(/saved locally and won't be lost/),
    ).toBeInTheDocument()
  })

  it('"Switch Repo" button calls onSwitchRepo', async () => {
    const onSwitchRepo = vi.fn()
    const user = userEvent.setup()

    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={vi.fn()}
        onSwitchRepo={onSwitchRepo}
      />,
    )

    await user.click(screen.getByTestId('banner-switch-repo'))
    expect(onSwitchRepo).toHaveBeenCalledTimes(1)
  })

  it('dismiss button calls onDismiss', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()

    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={onDismiss}
        onSwitchRepo={vi.fn()}
      />,
    )

    await user.click(screen.getByTestId('banner-dismiss'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('contains no technical jargon', () => {
    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={vi.fn()}
        onSwitchRepo={vi.fn()}
      />,
    )

    const banner = screen.getByTestId('branch-protection-banner')
    const text = banner.textContent ?? ''

    expect(text).not.toContain('403')
    expect(text).not.toContain('422')
    expect(text).not.toContain('pull request')
    expect(text).not.toContain('createOrUpdateFileContents')
    expect(text).not.toContain('API')
  })

  it('has appropriate role for accessibility', () => {
    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={vi.fn()}
        onSwitchRepo={vi.fn()}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it('dismiss button has aria-label', () => {
    render(
      <BranchProtectionBanner
        visible={true}
        onDismiss={vi.fn()}
        onSwitchRepo={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Dismiss')).toBeInTheDocument()
  })
})
