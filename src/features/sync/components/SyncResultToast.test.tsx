import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  useReducedMotion: () => false,
  useDragControls: () => ({ start: vi.fn() }),
}))

import { SyncResultToast } from './SyncResultToast'

describe('SyncResultToast', () => {
  it('renders the message text', () => {
    render(<SyncResultToast message="Synced to owner/repo" onDismiss={() => {}} />)
    expect(screen.getByText('Synced to owner/repo')).toBeInTheDocument()
  })

  it('has data-testid="sync-result-toast"', () => {
    render(<SyncResultToast message="Synced" onDismiss={() => {}} />)
    expect(screen.getByTestId('sync-result-toast')).toBeInTheDocument()
  })

  it('has role="status" for accessibility', () => {
    render(<SyncResultToast message="Synced" onDismiss={() => {}} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('calls onDismiss when clicked', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<SyncResultToast message="Synced" onDismiss={onDismiss} />)
    await user.click(screen.getByTestId('sync-result-toast'))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
