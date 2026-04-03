import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: () => false,
  useDragControls: () => ({ start: vi.fn() }),
}))

// Mock the store
const mockSetRepoSyncBranch = vi.fn()
const mockSetRepoSkipCi = vi.fn()

vi.mock('../../../stores/useSyncStore', () => {
  const store = vi.fn((selector: any) => {
    // Return mock state based on what the selector requests
    const state = {
      selectedRepo: { id: 1, fullName: 'owner/repo', owner: 'owner' },
      user: { login: 'testuser' },
      setRepoSyncBranch: mockSetRepoSyncBranch,
      setRepoSkipCi: mockSetRepoSkipCi,
      repoSyncBranches: {},
      repoSkipCi: {},
    }
    return selector(state)
  })

  return {
    useSyncStore: store,
    selectSyncBranch: (repoFullName: string) => (state: any) =>
      state.repoSyncBranches[repoFullName.toLowerCase()] ?? null,
    selectRepoSkipCi: (repoFullName: string) => (state: any) =>
      state.repoSkipCi[repoFullName.toLowerCase()] ?? false,
  }
})

import { RepoSettingsSheet } from './RepoSettingsSheet'

describe('RepoSettingsSheet', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with repo name in title', () => {
    render(<RepoSettingsSheet onClose={vi.fn()} />)
    expect(screen.getByText('Repo Settings')).toBeInTheDocument()
    expect(screen.getByText('repo')).toBeInTheDocument()
  })

  it('renders branch strategy radio buttons', () => {
    render(<RepoSettingsSheet onClose={vi.fn()} />)
    expect(screen.getByTestId('branch-mode-default')).toBeInTheDocument()
    expect(screen.getByTestId('branch-mode-custom')).toBeInTheDocument()
  })

  it('renders skip CI toggle', () => {
    render(<RepoSettingsSheet onClose={vi.fn()} />)
    expect(screen.getByTestId('skip-ci-toggle')).toBeInTheDocument()
    expect(screen.getByText('Skip CI')).toBeInTheDocument()
    expect(screen.getByText('Add [skip ci] to commit messages')).toBeInTheDocument()
  })

  it('defaults to default branch mode when no custom branch is set', () => {
    render(<RepoSettingsSheet onClose={vi.fn()} />)
    // Branch name input should not be visible (height 0 / opacity 0)
    // Default branch should be selected
    expect(screen.getByText('Default branch')).toBeInTheDocument()
    expect(screen.getByText('Dedicated branch')).toBeInTheDocument()
  })

  it('shows branch name input when custom branch is selected', async () => {
    const user = userEvent.setup()
    render(<RepoSettingsSheet onClose={vi.fn()} />)

    await user.click(screen.getByTestId('branch-mode-custom'))
    const input = screen.getByTestId('branch-name-input') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.value).toBe('gitty/testuser')
  })

  it('saves default branch on save when default mode selected', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<RepoSettingsSheet onClose={onClose} />)

    await user.click(screen.getByTestId('repo-settings-save'))

    expect(mockSetRepoSyncBranch).toHaveBeenCalledWith('owner/repo', null)
    expect(mockSetRepoSkipCi).toHaveBeenCalledWith('owner/repo', false)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('saves custom branch on save when custom mode selected', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<RepoSettingsSheet onClose={onClose} />)

    await user.click(screen.getByTestId('branch-mode-custom'))
    const input = screen.getByTestId('branch-name-input')
    await user.clear(input)
    await user.type(input, 'my-branch')
    await user.click(screen.getByTestId('repo-settings-save'))

    expect(mockSetRepoSyncBranch).toHaveBeenCalledWith('owner/repo', 'my-branch')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('toggles skip CI on and saves', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<RepoSettingsSheet onClose={onClose} />)

    await user.click(screen.getByTestId('skip-ci-toggle'))
    await user.click(screen.getByTestId('repo-settings-save'))

    expect(mockSetRepoSkipCi).toHaveBeenCalledWith('owner/repo', true)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('has proper aria role on skip CI toggle', () => {
    render(<RepoSettingsSheet onClose={vi.fn()} />)
    const toggle = screen.getByTestId('skip-ci-toggle')
    expect(toggle).toHaveAttribute('role', 'switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('renders save button', () => {
    render(<RepoSettingsSheet onClose={vi.fn()} />)
    expect(screen.getByTestId('repo-settings-save')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
  })
})
