import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PulseInput } from './PulseInput'
import { useSyncStore } from '../../../stores/useSyncStore'

// Mock the store
vi.mock('../../../stores/useSyncStore', () => ({
  useSyncStore: vi.fn(),
}))

describe('PulseInput', () => {
  const mockSetCurrentDraft = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        currentDraft: '',
        setCurrentDraft: mockSetCurrentDraft,
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
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('renders the pulse container with correct padding', () => {
    render(<PulseInput />)
    const container = screen.getByTestId('pulse-container')
    expect(container).toBeInTheDocument()
    expect(container.style.padding).toBe('32px 16px')
  })

  it('renders a textarea element', () => {
    render(<PulseInput />)
    const textarea = screen.getByTestId('pulse-input')
    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe('TEXTAREA')
  })

  it('renders the textarea with transparent color for overlay effect', () => {
    render(<PulseInput />)
    const textarea = screen.getByTestId('pulse-input')
    expect(textarea.style.color).toBe('transparent')
    expect(textarea.style.background).toBe('transparent')
  })

  it('has an accessible label', () => {
    render(<PulseInput />)
    const textarea = screen.getByLabelText('Capture your thought')
    expect(textarea).toBeInTheDocument()
  })

  it('shows placeholder text when empty', () => {
    render(<PulseInput />)
    const textarea = screen.getByPlaceholderText("What's on your mind?")
    expect(textarea).toBeInTheDocument()
  })

  it('applies title styling (24px, semi-bold) to the first line in the overlay', () => {
    render(<PulseInput />)
    const titleLine = document.querySelector('.pulse-title-line')
    expect(titleLine).toBeInTheDocument()
    expect(titleLine?.getAttribute('style')).toContain('font-size: 24px')
    expect(titleLine?.getAttribute('style')).toContain('font-weight: 600')
  })

  it('renders body lines with standard styling (16px, normal weight)', async () => {
    vi.useRealTimers()

    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        currentDraft: 'Title line\nBody line one\nBody line two',
        setCurrentDraft: mockSetCurrentDraft,
        isAuthenticated: true,
        user: null,
        encryptedToken: null,
        selectedRepo: null,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
      } as never),
    )

    render(<PulseInput />)

    const bodyLines = document.querySelectorAll('.pulse-body-line')
    expect(bodyLines.length).toBe(2)
    expect(bodyLines[0]?.getAttribute('style')).toContain('font-size: 16px')
    expect(bodyLines[0]?.getAttribute('style')).toContain('font-weight: 400')
  })

  it('debounces draft updates to the store', async () => {
    vi.useRealTimers()
    const user = userEvent.setup()

    render(<PulseInput />)
    const textarea = screen.getByTestId('pulse-input')

    await user.type(textarea, 'Hello')

    // Should not have been called immediately (debounce)
    expect(mockSetCurrentDraft).not.toHaveBeenCalled()

    // Wait for debounce (300ms)
    await new Promise((resolve) => setTimeout(resolve, 400))

    expect(mockSetCurrentDraft).toHaveBeenCalled()
  })

  it('applies no resize to the textarea', () => {
    render(<PulseInput />)
    const textarea = screen.getByTestId('pulse-input')
    expect(textarea.style.resize).toBe('none')
  })

  it('uses the accent color for the caret', () => {
    render(<PulseInput />)
    const textarea = screen.getByTestId('pulse-input')
    expect(textarea.style.caretColor).toBe('var(--color-accent)')
  })

  it('has an aria-hidden overlay for styled text', () => {
    render(<PulseInput />)
    const overlay = document.querySelector('.pulse-overlay')
    expect(overlay).toBeInTheDocument()
    expect(overlay).toHaveAttribute('aria-hidden', 'true')
  })

  it('loads initial draft from store', () => {
    vi.mocked(useSyncStore).mockImplementation((selector) =>
      selector({
        currentDraft: 'Existing draft',
        setCurrentDraft: mockSetCurrentDraft,
        isAuthenticated: true,
        user: null,
        encryptedToken: null,
        selectedRepo: null,
        setAuth: vi.fn(),
        clearAuth: vi.fn(),
        setSelectedRepo: vi.fn(),
      } as never),
    )

    render(<PulseInput />)
    const textarea = screen.getByTestId('pulse-input') as HTMLTextAreaElement
    expect(textarea.defaultValue).toBe('Existing draft')
  })

  it('renders with max-width of 640px', () => {
    render(<PulseInput />)
    const container = screen.getByTestId('pulse-container')
    expect(container.style.maxWidth).toBe('640px')
  })
})
