import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { LaunchAnimation } from './LaunchAnimation'

// Track animation finish callbacks for manual control
let animationFinishCallbacks: (() => void)[] = []

beforeEach(() => {
  vi.clearAllMocks()
  animationFinishCallbacks = []

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
})

describe('LaunchAnimation', () => {
  it('renders the ghost element with the task text initially', () => {
    render(<LaunchAnimation text="Fix the bug" onComplete={vi.fn()} />)
    const ghost = screen.getByTestId('launch-ghost')
    expect(ghost).toBeInTheDocument()
    expect(ghost).toHaveTextContent('Fix the bug')
  })

  it('ghost element is aria-hidden', () => {
    render(<LaunchAnimation text="Fix the bug" onComplete={vi.fn()} />)
    const ghost = screen.getByTestId('launch-ghost')
    expect(ghost).toHaveAttribute('aria-hidden', 'true')
  })

  it('starts the ghost-rise animation on mount', () => {
    render(<LaunchAnimation text="Test task" onComplete={vi.fn()} />)
    expect(Element.prototype.animate).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ transform: 'translateY(0)', opacity: 1 }),
        expect.objectContaining({ transform: 'translateY(-200px)', opacity: 0 }),
      ]),
      expect.objectContaining({
        duration: 400,
        fill: 'forwards',
      }),
    )
  })

  it('transitions to landing phase after ghost-rise completes', () => {
    render(<LaunchAnimation text="Test task" onComplete={vi.fn()} />)

    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })

    expect(screen.getByTestId('launch-landing')).toBeInTheDocument()
    expect(screen.queryByTestId('launch-ghost')).not.toBeInTheDocument()
  })

  it('landing element displays the task text', () => {
    render(<LaunchAnimation text="Landing text" onComplete={vi.fn()} />)

    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })

    expect(screen.getByTestId('launch-landing')).toHaveTextContent('Landing text')
  })

  it('uses spring bounce easing for landing animation', () => {
    render(<LaunchAnimation text="Test task" onComplete={vi.fn()} />)

    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })

    const calls = (Element.prototype.animate as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.length).toBe(2)
    expect(calls[1][1]).toMatchObject({
      duration: 350,
      easing: expect.stringContaining('cubic-bezier'),
      fill: 'forwards',
    })
  })

  it('calls onComplete after the full animation sequence', () => {
    const onComplete = vi.fn()
    render(<LaunchAnimation text="Test task" onComplete={onComplete} />)

    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })
    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })

    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('renders nothing after animation completes', () => {
    const onComplete = vi.fn()
    const { container } = render(
      <LaunchAnimation text="Test task" onComplete={onComplete} />,
    )

    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })
    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })

    expect(container.innerHTML).toBe('')
  })

  it('does not call onComplete before landing animation finishes', () => {
    const onComplete = vi.fn()
    render(<LaunchAnimation text="Test task" onComplete={onComplete} />)

    act(() => {
      animationFinishCallbacks.forEach((cb) => cb())
    })

    expect(onComplete).not.toHaveBeenCalled()
  })
})
