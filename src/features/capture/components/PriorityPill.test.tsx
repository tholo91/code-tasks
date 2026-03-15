import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PriorityPill } from './PriorityPill'
import { useSyncStore } from '../../../stores/useSyncStore'

// Mock the store
vi.mock('../../../stores/useSyncStore', () => ({
  useSyncStore: vi.fn(),
}))

// Mock haptic service
vi.mock('../../../services/native/haptic-service', () => ({
  triggerSelectionHaptic: vi.fn().mockResolvedValue(undefined),
}))

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    button: ({
      children,
      animate,
      whileTap,
      transition,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
      animate?: Record<string, unknown>
      whileTap?: Record<string, unknown>
      transition?: Record<string, unknown>
    }) => {
      // Apply animated styles as inline styles for testing
      const animatedStyle = animate
        ? {
            ...(props.style || {}),
            backgroundColor: animate.backgroundColor as string,
            borderColor: animate.borderColor as string,
            color: animate.color as string,
          }
        : props.style
      return (
        <button {...props} style={animatedStyle}>
          {children}
        </button>
      )
    },
  },
}))

describe('PriorityPill', () => {
  const mockToggleImportant = vi.fn()

  beforeEach(() => {
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isImportant: false,
        toggleImportant: mockToggleImportant,
        currentDraft: '',
        setCurrentDraft: vi.fn(),
        isAuthenticated: true,
        user: null,
        encryptedToken: null,
        selectedRepo: null,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
      } as never),
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renders with "Important" label', () => {
    render(<PriorityPill />)
    expect(screen.getByTestId('priority-pill')).toHaveTextContent('Important')
  })

  it('has aria-pressed="false" when not important', () => {
    render(<PriorityPill />)
    expect(screen.getByTestId('priority-pill')).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('has aria-pressed="true" when important', () => {
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isImportant: true,
        toggleImportant: mockToggleImportant,
        currentDraft: '',
        setCurrentDraft: vi.fn(),
        isAuthenticated: true,
        user: null,
        encryptedToken: null,
        selectedRepo: null,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
      } as never),
    )

    render(<PriorityPill />)
    expect(screen.getByTestId('priority-pill')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('has accessible label', () => {
    render(<PriorityPill />)
    expect(
      screen.getByLabelText('Toggle important priority'),
    ).toBeInTheDocument()
  })

  it('calls toggleImportant on click', async () => {
    const user = userEvent.setup()
    render(<PriorityPill />)

    await user.click(screen.getByTestId('priority-pill'))
    expect(mockToggleImportant).toHaveBeenCalledOnce()
  })

  it('triggers haptic feedback on click', async () => {
    const { triggerSelectionHaptic } = await import(
      '../../../services/native/haptic-service'
    )
    const user = userEvent.setup()
    render(<PriorityPill />)

    await user.click(screen.getByTestId('priority-pill'))
    expect(triggerSelectionHaptic).toHaveBeenCalledOnce()
  })

  it('responds to Enter key', async () => {
    const user = userEvent.setup()
    render(<PriorityPill />)

    const pill = screen.getByTestId('priority-pill')
    pill.focus()
    await user.keyboard('{Enter}')
    expect(mockToggleImportant).toHaveBeenCalled()
  })

  it('responds to Space key', async () => {
    const user = userEvent.setup()
    render(<PriorityPill />)

    const pill = screen.getByTestId('priority-pill')
    pill.focus()
    await user.keyboard(' ')
    expect(mockToggleImportant).toHaveBeenCalled()
  })

  it('has minimum 44x44px touch target', () => {
    render(<PriorityPill />)
    const pill = screen.getByTestId('priority-pill')
    expect(pill.style.minWidth).toBe('44px')
    expect(pill.style.minHeight).toBe('44px')
  })

  it('renders with ghost/outline style when not important', () => {
    render(<PriorityPill />)
    const pill = screen.getByTestId('priority-pill')
    expect(pill.style.backgroundColor).toBe('transparent')
    expect(pill.style.borderColor).toBe('var(--color-border)')
  })

  it('renders with filled accent style when important', () => {
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        isImportant: true,
        toggleImportant: mockToggleImportant,
        currentDraft: '',
        setCurrentDraft: vi.fn(),
        isAuthenticated: true,
        user: null,
        encryptedToken: null,
        selectedRepo: null,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
      } as never),
    )

    render(<PriorityPill />)
    const pill = screen.getByTestId('priority-pill')
    expect(pill.style.backgroundColor).toBe('var(--color-accent)')
    expect(pill.style.borderColor).toBe('var(--color-accent)')
  })
})
