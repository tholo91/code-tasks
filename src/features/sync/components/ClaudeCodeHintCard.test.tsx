import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClaudeCodeHintCard } from './ClaudeCodeHintCard'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}))

const baseProps = {
  onDismiss: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ClaudeCodeHintCard', () => {
  it('renders the /captured-ideas command in monospace', () => {
    render(<ClaudeCodeHintCard {...baseProps} />)
    const codeEl = screen.getByText('/captured-ideas')
    expect(codeEl.tagName.toLowerCase()).toBe('code')
  })

  it('mentions Claude Code explicitly', () => {
    render(<ClaudeCodeHintCard {...baseProps} />)
    expect(screen.getByText(/Claude Code/i)).toBeInTheDocument()
  })

  it('invokes onDismiss when the dismiss button is clicked', () => {
    const onDismiss = vi.fn()
    render(<ClaudeCodeHintCard onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button'))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('renders a data-testid for integration hooks', () => {
    render(<ClaudeCodeHintCard {...baseProps} />)
    expect(screen.getByTestId('claude-code-hint-card')).toBeInTheDocument()
  })
})
