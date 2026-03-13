import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Octokit } from 'octokit'
import { searchUserRepos, getMyRepos, type GitHubRepo } from './repo-service'

interface MockOctokit extends Octokit {
  rest: Octokit['rest'] & {
    search: { repos: ReturnType<typeof vi.fn> }
    repos: { listForAuthenticatedUser: ReturnType<typeof vi.fn> }
  }
}

function createMockOctokit(options?: {
  searchResults?: GitHubRepo[]
  userRepos?: GitHubRepo[]
  searchError?: Error
  userReposError?: Error
}): MockOctokit {
  const opts = options ?? {}
  return {
    rest: {
      search: {
        repos: vi.fn().mockImplementation(async () => {
          if (opts.searchError) throw opts.searchError
          return {
            data: {
              items: (opts.searchResults ?? []).map(toApiRepo),
            },
          }
        }),
      },
      repos: {
        listForAuthenticatedUser: vi.fn().mockImplementation(async () => {
          if (opts.userReposError) throw opts.userReposError
          return {
            data: (opts.userRepos ?? []).map(toApiRepo),
          }
        }),
      },
    },
  } as unknown as MockOctokit
}

function toApiRepo(repo: GitHubRepo) {
  return {
    id: repo.id,
    full_name: repo.fullName,
    owner: { login: repo.owner },
    description: repo.description,
    private: repo.isPrivate,
    stargazers_count: repo.stars,
    updated_at: repo.updatedAt,
  }
}

const sampleRepos: GitHubRepo[] = [
  {
    id: 1,
    fullName: 'testuser/repo-one',
    owner: 'testuser',
    description: 'First repo',
    isPrivate: false,
    stars: 10,
    updatedAt: '2026-03-01T00:00:00Z',
  },
  {
    id: 2,
    fullName: 'testuser/repo-two',
    owner: 'testuser',
    description: null,
    isPrivate: true,
    stars: 0,
    updatedAt: '2026-03-10T00:00:00Z',
  },
]

describe('repo-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('searchUserRepos', () => {
    it('returns mapped repos from search API', async () => {
      const octokit = createMockOctokit({ searchResults: sampleRepos })
      const results = await searchUserRepos(octokit, 'repo')

      expect(octokit.rest.search.repos).toHaveBeenCalledWith({
        q: 'repo in:name',
        per_page: 30,
        sort: 'updated',
      })
      expect(results).toEqual(sampleRepos)
    })

    it('returns empty array for empty query', async () => {
      const octokit = createMockOctokit()
      const results = await searchUserRepos(octokit, '')
      expect(results).toEqual([])
      expect(octokit.rest.search.repos).not.toHaveBeenCalled()
    })

    it('returns empty array for whitespace-only query', async () => {
      const octokit = createMockOctokit()
      const results = await searchUserRepos(octokit, '   ')
      expect(results).toEqual([])
    })

    it('propagates API errors', async () => {
      const octokit = createMockOctokit({
        searchError: new Error('API rate limit exceeded'),
      })
      await expect(searchUserRepos(octokit, 'test')).rejects.toThrow(
        'API rate limit exceeded',
      )
    })
  })

  describe('getMyRepos', () => {
    it('returns mapped repos for authenticated user', async () => {
      const octokit = createMockOctokit({ userRepos: sampleRepos })
      const results = await getMyRepos(octokit)

      expect(octokit.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
        per_page: 100,
        sort: 'updated',
        direction: 'desc',
      })
      expect(results).toEqual(sampleRepos)
    })

    it('returns empty array when user has no repos', async () => {
      const octokit = createMockOctokit({ userRepos: [] })
      const results = await getMyRepos(octokit)
      expect(results).toEqual([])
    })

    it('propagates API errors', async () => {
      const octokit = createMockOctokit({
        userReposError: new Error('Bad credentials'),
      })
      await expect(getMyRepos(octokit)).rejects.toThrow('Bad credentials')
    })
  })
})
