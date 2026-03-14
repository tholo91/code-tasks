import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PulseInput } from './PulseInput'
import { useSyncStore } from '../../../stores/useSyncStore'

// Mock the store
vi.mock('../../../stores/useSyncStore', () => ({
  useSyncStore: vi.fn(),
}))

// Mock haptic service
vi.mock('../../../services/native/haptic-service', () => ({
  triggerLaunchHaptic: vi.fn().mockResolvedValue(undefined),
}))

// Track animation finish callbacks for manual control
let animationFinishCallbacks: (() => void)[] = []

describe('PulseInput', () => {
  const mockSetCurrentDraft = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    animationFinishCallbacks = []

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

    // Mock Web Animations API
    const mockAnimate = vi.fn().mockImplementation(() => {
      const animation = {
        _onfinish: null as (() => void) | null,
        cancel: vi.fn(),
        set onfinish(cb: (() => void) | null) {
          animation._onfinish = cb
          if (cb) animationFinishCallbacks.push(cb)
        },
        get onfinish() {
          return animation._onfinish
        },
      }
      return animation
    })
    Element.prototype.animate = mockAnimate

    // Mock pointer capture
    Element.prototype.setPointerCapture = vi.fn()
    Element.prototype.releasePointerCapture = vi.fn()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  // --- Story 3-1 tests (preserved) ---

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

  // --- Story 3-2 tests: Launch gesture & visual feedback ---

  describe('Keyboard shortcut (Ctrl+Enter / Cmd+Enter)', () => {
    it('triggers launch on Ctrl+Enter when text is present', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'My task')
      await user.keyboard('{Control>}{Enter}{/Control}')

      // Should clear the draft in the store
      expect(mockSetCurrentDraft).toHaveBeenCalledWith('')
    })

    it('triggers launch on Meta+Enter (Cmd on Mac)', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Mac task')
      await user.keyboard('{Meta>}{Enter}{/Meta}')

      expect(mockSetCurrentDraft).toHaveBeenCalledWith('')
    })

    it('clears the textarea value after launch', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input') as HTMLTextAreaElement
      await user.type(textarea, 'Task to clear')
      await user.keyboard('{Control>}{Enter}{/Control}')

      expect(textarea.value).toBe('')
    })

    it('does not launch when textarea is empty', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.click(textarea)
      await user.keyboard('{Control>}{Enter}{/Control}')

      // setCurrentDraft should not have been called with ''
      // (no launch occurred since there was nothing to launch)
      expect(mockSetCurrentDraft).not.toHaveBeenCalledWith('')
    })

    it('does not launch when textarea has only whitespace', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, '   ')
      await user.keyboard('{Control>}{Enter}{/Control}')

      // The trim() check should prevent launch
      expect(mockSetCurrentDraft).not.toHaveBeenCalledWith('')
    })

    it('does not launch on plain Enter without modifier', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'My task')
      await user.keyboard('{Enter}')

      // Should not clear draft (plain Enter is newline, not launch)
      expect(mockSetCurrentDraft).not.toHaveBeenCalledWith('')
    })
  })

  describe('Swipe-up gesture', () => {
    // Note: jsdom PointerEvent does not support clientY (always 0).
    // Full gesture integration tests require a real browser.
    // Here we verify gesture-related UI elements and pointer event handling.

    it('drag area is rendered with touch-none for gesture handling', () => {
      render(<PulseInput />)
      const dragArea = screen.getByTestId('pulse-drag-area')
      expect(dragArea).toHaveClass('touch-none')
    })

    it('drag area responds to pointer events', () => {
      render(<PulseInput />)
      const dragArea = screen.getByTestId('pulse-drag-area')
      expect(dragArea).toBeInTheDocument()

      // Should not throw when firing pointer events
      fireEvent.pointerDown(dragArea, { button: 0 })
      fireEvent.pointerMove(dragArea)
      fireEvent.pointerUp(dragArea)
    })

    it('ignores non-primary pointer buttons', () => {
      render(<PulseInput />)
      const dragArea = screen.getByTestId('pulse-drag-area')

      // Right-click (button: 2) should not initiate drag
      fireEvent.pointerDown(dragArea, { button: 2 })
      fireEvent.pointerMove(dragArea)
      fireEvent.pointerUp(dragArea)

      expect(mockSetCurrentDraft).not.toHaveBeenCalledWith('')
    })

    it('pointerCancel does not trigger launch', () => {
      render(<PulseInput />)
      const dragArea = screen.getByTestId('pulse-drag-area')

      fireEvent.pointerDown(dragArea, { button: 0 })
      fireEvent.pointerCancel(dragArea)

      expect(mockSetCurrentDraft).not.toHaveBeenCalledWith('')
    })
  })

  describe('Haptic feedback', () => {
    it('triggers haptic feedback on launch', async () => {
      vi.useRealTimers()
      const { triggerLaunchHaptic } = await import(
        '../../../services/native/haptic-service'
      )
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Haptic test')
      await user.keyboard('{Control>}{Enter}{/Control}')

      expect(triggerLaunchHaptic).toHaveBeenCalled()
    })
  })

  describe('Launch animation', () => {
    it('shows launch ghost animation after launch', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Animated task')
      await user.keyboard('{Control>}{Enter}{/Control}')

      // Ghost element should appear
      const ghost = screen.getByTestId('launch-ghost')
      expect(ghost).toBeInTheDocument()
      expect(ghost).toHaveTextContent('Animated task')
    })

    it('textarea gets collapse transform during launch', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Collapse test')
      await user.keyboard('{Control>}{Enter}{/Control}')

      // During collapse, transform should be scaleY(0) and opacity 0
      expect(textarea.style.transform).toBe('scaleY(0)')
      expect(textarea.style.opacity).toBe('0')
    })

    it('animation elements are cleaned up after completion', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Cleanup test')
      await user.keyboard('{Control>}{Enter}{/Control}')

      // Ghost should be visible
      expect(screen.getByTestId('launch-ghost')).toBeInTheDocument()

      // Complete the ghost-rise animation
      act(() => {
        animationFinishCallbacks.forEach((cb) => cb())
      })

      // Now landing should appear
      expect(screen.getByTestId('launch-landing')).toBeInTheDocument()

      // Complete the landing animation
      act(() => {
        animationFinishCallbacks.forEach((cb) => cb())
      })

      // All animation elements should be gone
      expect(screen.queryByTestId('launch-ghost')).not.toBeInTheDocument()
      expect(screen.queryByTestId('launch-landing')).not.toBeInTheDocument()
    })
  })

  describe('Launch hint text', () => {
    it('shows hint when there is text to launch', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Something')

      expect(screen.getByTestId('launch-hint')).toBeInTheDocument()
      expect(screen.getByTestId('launch-hint')).toHaveTextContent(/to launch/i)
    })

    it('does not show hint when textarea is empty', () => {
      render(<PulseInput />)
      expect(screen.queryByTestId('launch-hint')).not.toBeInTheDocument()
    })
  })

  describe('Visual feedback latency', () => {
    it('applies collapse style synchronously on launch', async () => {
      vi.useRealTimers()
      const user = userEvent.setup()
      render(<PulseInput />)

      const textarea = screen.getByTestId('pulse-input')
      await user.type(textarea, 'Fast task')

      const startTime = performance.now()
      await user.keyboard('{Control>}{Enter}{/Control}')
      const elapsed = performance.now() - startTime

      // Visual feedback should be well under 100ms (AC: Feedback Latency)
      expect(elapsed).toBeLessThan(100)
      expect(textarea.style.transform).toBe('scaleY(0)')
    })
  })
})
