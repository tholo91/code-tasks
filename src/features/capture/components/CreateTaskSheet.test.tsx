import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      drag: _drag,
      dragConstraints: _dragConstraints,
      dragElastic: _dragElastic,
      onDragEnd: _onDragEnd,
      ...props
    }: any) => <div {...props}>{children}</div>,
    button: ({
      children,
      whileTap: _whileTap,
      transition: _transition,
      animate: _animate,
      ...props
    }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
}))

// Mock haptic service
vi.mock('../../../services/native/haptic-service', () => ({
  triggerLaunchHaptic: vi.fn(),
  triggerSelectionHaptic: vi.fn(),
}))

// Mock crypto-utils (needed by store)
vi.mock('../../../services/storage/crypto-utils', () => ({
  encryptData: vi.fn().mockResolvedValue(new ArrayBuffer(64)),
  decryptData: vi.fn().mockResolvedValue('decrypted-token'),
}))

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
  }
})()
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock })

import { useSyncStore } from '../../../stores/useSyncStore'
import { CreateTaskSheet } from './CreateTaskSheet'

describe('CreateTaskSheet', () => {
  const defaultProps = {
    onClose: vi.fn(),
    onTaskCreated: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
    useSyncStore.setState({
      user: { login: 'testuser', avatarUrl: '', name: null },
      selectedRepo: { id: 1, fullName: 'testuser/my-repo', owner: 'testuser' },
      isImportant: false,
      tasks: [],
    })
  })

  it('renders the sheet with correct test id', () => {
    render(<CreateTaskSheet {...defaultProps} />)
    expect(screen.getByTestId('create-task-sheet')).toBeInTheDocument()
  })

  it('has role="dialog" and aria-modal="true"', () => {
    render(<CreateTaskSheet {...defaultProps} />)
    const dialog = screen.getByTestId('create-task-sheet')
    expect(dialog).toHaveAttribute('role', 'dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-label', 'Create new task')
  })

  it('closes on outside click without creating task', async () => {
    const onClose = vi.fn()
    render(<CreateTaskSheet {...defaultProps} onClose={onClose} />)

    // Click on the backdrop (the outer motion.div)
    const dialog = screen.getByTestId('create-task-sheet')
    fireEvent.click(dialog)

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(defaultProps.onTaskCreated).not.toHaveBeenCalled()
  })

  it('submit button is disabled when title is empty', () => {
    render(<CreateTaskSheet {...defaultProps} />)
    const submitBtn = screen.getByTestId('create-task-submit')
    expect(submitBtn).toBeDisabled()
  })

  it('submit button is enabled when title has content', async () => {
    const user = userEvent.setup()
    render(<CreateTaskSheet {...defaultProps} />)

    await user.type(screen.getByTestId('create-task-title'), 'My new task')
    expect(screen.getByTestId('create-task-submit')).not.toBeDisabled()
  })

  it('creates task on submit with correct data', async () => {
    const user = userEvent.setup()
    const onTaskCreated = vi.fn()
    const onClose = vi.fn()
    render(<CreateTaskSheet onClose={onClose} onTaskCreated={onTaskCreated} />)

    fireEvent.change(screen.getByTestId('create-task-title'), { target: { value: 'Buy groceries' } })
    fireEvent.change(screen.getByTestId('create-task-notes'), { target: { value: 'Milk and eggs' } })
    await user.click(screen.getByTestId('create-task-submit'))

    // Task should have been created in store
    const tasks = useSyncStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Buy groceries')
    expect(tasks[0].body).toBe('Milk and eggs')
    expect(tasks[0].repoFullName).toBe('testuser/my-repo')

    // Callback should be called with new task id
    expect(onTaskCreated).toHaveBeenCalledWith(tasks[0].id)
    expect(onClose).toHaveBeenCalled()
  })

  it('triggers haptic feedback on submit', async () => {
    const { triggerLaunchHaptic } = await import('../../../services/native/haptic-service')
    const user = userEvent.setup()
    render(<CreateTaskSheet {...defaultProps} />)

    await user.type(screen.getByTestId('create-task-title'), 'Test task')
    await user.click(screen.getByTestId('create-task-submit'))

    expect(triggerLaunchHaptic).toHaveBeenCalled()
  })

  it('Cmd+Enter keyboard shortcut submits the form', async () => {
    const user = userEvent.setup()
    const onTaskCreated = vi.fn()
    render(<CreateTaskSheet {...defaultProps} onTaskCreated={onTaskCreated} />)

    await user.type(screen.getByTestId('create-task-title'), 'Shortcut task')
    // Fire Cmd+Enter
    fireEvent.keyDown(document, { key: 'Enter', metaKey: true })

    const tasks = useSyncStore.getState().tasks
    expect(tasks).toHaveLength(1)
    expect(tasks[0].title).toBe('Shortcut task')
    expect(onTaskCreated).toHaveBeenCalledWith(tasks[0].id)
  })

  it('resets isImportant to false on submit', async () => {
    useSyncStore.setState({ isImportant: true })
    const user = userEvent.setup()
    render(<CreateTaskSheet {...defaultProps} />)

    await user.type(screen.getByTestId('create-task-title'), 'Important task')
    await user.click(screen.getByTestId('create-task-submit'))

    expect(useSyncStore.getState().isImportant).toBe(false)
  })

  it('resets isImportant to false on cancel (outside click)', () => {
    useSyncStore.setState({ isImportant: true })
    render(<CreateTaskSheet {...defaultProps} />)

    // Click on backdrop
    const dialog = screen.getByTestId('create-task-sheet')
    fireEvent.click(dialog)

    expect(useSyncStore.getState().isImportant).toBe(false)
  })

  it('renders PriorityPill toggle', () => {
    render(<CreateTaskSheet {...defaultProps} />)
    expect(screen.getByTestId('priority-pill')).toBeInTheDocument()
  })
})
