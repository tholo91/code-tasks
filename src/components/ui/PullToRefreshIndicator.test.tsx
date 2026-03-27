import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PullToRefreshIndicator } from './PullToRefreshIndicator'

// Mock framer-motion to render elements directly
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { 'data-testid': testId, className } = props as { 'data-testid'?: string; className?: string }
      return <div data-testid={testId} className={className}>{children}</div>
    },
    svg: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <svg {...(props as React.SVGProps<SVGSVGElement>)}>{children}</svg>
    ),
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
  useReducedMotion: () => false,
  useDragControls: () => ({ start: vi.fn() }),
}))

describe('PullToRefreshIndicator', () => {
  it('shows "Check for updates" text when pulling', () => {
    render(
      <PullToRefreshIndicator
        pullDistance={40}
        isRefreshing={false}
        threshold={80}
        result={null}
      />,
    )

    expect(screen.getByText('Check for updates')).toBeInTheDocument()
  })

  it('shows spinner and "Checking…" when isRefreshing is true', () => {
    render(
      <PullToRefreshIndicator
        pullDistance={0}
        isRefreshing={true}
        threshold={80}
        result={null}
      />,
    )

    expect(screen.getByText('Checking…')).toBeInTheDocument()
  })

  it('shows "Up to date" when result is up-to-date', () => {
    render(
      <PullToRefreshIndicator
        pullDistance={0}
        isRefreshing={false}
        threshold={80}
        result="up-to-date"
      />,
    )

    expect(screen.getByText('Up to date')).toBeInTheDocument()
  })

  it('has correct data-testid', () => {
    render(
      <PullToRefreshIndicator
        pullDistance={40}
        isRefreshing={false}
        threshold={80}
        result={null}
      />,
    )

    expect(screen.getByTestId('pull-to-refresh-indicator')).toBeInTheDocument()
  })

  it('renders nothing when not visible', () => {
    const { container } = render(
      <PullToRefreshIndicator
        pullDistance={0}
        isRefreshing={false}
        threshold={80}
        result={null}
      />,
    )

    expect(container.innerHTML).toBe('')
  })
})
