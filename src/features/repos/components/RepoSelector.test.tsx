import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RepoSelector } from './RepoSelector'
import type { GitHubRepo } from '../../../services/github/repo-service'

const mockGetMyRepos = vi.fn()
const mockSearchUserRepos = vi.fn()

vi.mock('../../../services/github/repo-service', () => ({
  getMyRepos: (...args: unknown[]) => mockGetMyRepos(...args),
  searchUserRepos: (...args: unknown[]) => mockSearchUserRepos(...args),
}))

const sampleRepos: GitHubRepo[] = [
  {
    id: 1,
    fullName: 'testuser/alpha-repo',
    owner: 'testuser',
    description: 'Alpha project',
    isPrivate: false,
    stars: 5,
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 2,
    fullName: 'testuser/beta-repo',
    owner: 'testuser',
    description: null,
    isPrivate: true,
    stars: 0,
    updatedAt: '2026-03-10T00:00:00Z',
  },
]

const searchResults: GitHubRepo[] = [
  {
    id: 3,
    fullName: 'org/search-result',
    owner: 'org',
    description: 'Found by search',
    isPrivate: false,
    stars: 100,
    updatedAt: '2026-03-12T00:00:00Z',
  },
]

const mockOctokit = {} as never

describe('RepoSelector', () => {
  const onSelect = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    mockGetMyRepos.mockResolvedValue(sampleRepos)
    mockSearchUserRepos.mockResolvedValue(searchResults)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders search input', async () => {
    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )
    expect(screen.getByPlaceholderText(/search repositories/i)).toBeInTheDocument()
  })

  it('loads and displays user repos on mount', async () => {
    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText('testuser/alpha-repo')).toBeInTheDocument()
    })
    expect(screen.getByText('testuser/beta-repo')).toBeInTheDocument()
    expect(mockGetMyRepos).toHaveBeenCalledWith(mockOctokit)
  })

  it('calls onSelect when a repo is clicked', async () => {
    const user = userEvent.setup()
    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText('testuser/alpha-repo')).toBeInTheDocument()
    })

    await user.click(screen.getByText('testuser/alpha-repo'))
    expect(onSelect).toHaveBeenCalledWith(sampleRepos[0])
  })

  it('visually indicates selected repo', async () => {
    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={1} />,
    )

    await waitFor(() => {
      expect(screen.getByText('testuser/alpha-repo')).toBeInTheDocument()
    })

    const selectedItem = screen.getByText('testuser/alpha-repo').closest('[data-selected]')
    expect(selectedItem).toHaveAttribute('data-selected', 'true')
  })

  it('searches repos when user types in search input', async () => {
    const user = userEvent.setup()

    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText('testuser/alpha-repo')).toBeInTheDocument()
    })

    const input = screen.getByPlaceholderText(/search repositories/i)
    await user.type(input, 'search')

    // Wait for debounce (300ms) + async resolution
    await waitFor(() => {
      expect(mockSearchUserRepos).toHaveBeenCalledWith(mockOctokit, 'search')
    }, { timeout: 2000 })

    await waitFor(() => {
      expect(screen.getByText('org/search-result')).toBeInTheDocument()
    })
  })

  it('shows repo description when available', async () => {
    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Alpha project')).toBeInTheDocument()
    })
  })

  it('shows private badge for private repos', async () => {
    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText('Private')).toBeInTheDocument()
    })
  })

  it('shows rate limit error with retry button', async () => {
    mockGetMyRepos.mockRejectedValue(new Error('API rate limit exceeded'))

    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('retries loading repos when retry button is clicked', async () => {
    mockGetMyRepos.mockRejectedValueOnce(new Error('API rate limit exceeded'))
    mockGetMyRepos.mockResolvedValueOnce(sampleRepos)

    const user = userEvent.setup()

    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/rate limit/i)).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /retry/i }))

    await waitFor(() => {
      expect(screen.getByText('testuser/alpha-repo')).toBeInTheDocument()
    })
  })

  it('shows generic error for non-rate-limit failures', async () => {
    mockGetMyRepos.mockRejectedValue(new Error('Network error'))

    render(
      <RepoSelector octokit={mockOctokit} onSelect={onSelect} selectedRepoId={null} />,
    )

    await waitFor(() => {
      expect(screen.getByText(/failed to load/i)).toBeInTheDocument()
    })
  })
})
