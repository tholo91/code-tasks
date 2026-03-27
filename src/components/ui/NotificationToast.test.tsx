import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NotificationToast } from './NotificationToast'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial, animate, exit, transition, whileHover, whileTap, variants, ...domProps } = props
      return <div {...domProps}>{children as React.ReactNode}</div>
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
  useDragControls: () => ({ start: vi.fn() }),
}))

describe('NotificationToast', () => {
  it('renders message text when notification is provided', () => {
    render(
      <NotificationToast
        notification={{ type: 'sync-result', message: 'Synced to owner/repo' }}
        onDismiss={vi.fn()}
      />,
    )
    expect(screen.getByText('Synced to owner/repo')).toBeInTheDocument()
  })

  it('does not render when notification is null', () => {
    const { container } = render(
      <NotificationToast notification={null} onDismiss={vi.fn()} />,
    )
    expect(container.innerHTML).toBe('')
  })

  it('calls onDismiss when clicked', async () => {
    const onDismiss = vi.fn()
    render(
      <NotificationToast
        notification={{ type: 'sync-result', message: 'Done' }}
        onDismiss={onDismiss}
      />,
    )
    screen.getByTestId('notification-toast').click()
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('has correct data-testid and ARIA attributes', () => {
    render(
      <NotificationToast
        notification={{ type: 'import-feedback', message: 'Imported' }}
        onDismiss={vi.fn()}
      />,
    )
    const toast = screen.getByTestId('notification-toast')
    expect(toast).toHaveAttribute('role', 'status')
    expect(toast).toHaveAttribute('aria-live', 'polite')
  })
})
