import type { Octokit } from 'octokit'

export interface GitHubRepo {
  id: number
  fullName: string
  owner: string
  description: string | null
  isPrivate: boolean
  stars: number
  updatedAt: string
}

function mapRepo(repo: {
  id: number
  full_name: string
  owner: { login: string } | null
  description: string | null
  private: boolean
  stargazers_count: number
  updated_at: string | null
}): GitHubRepo {
  return {
    id: repo.id,
    fullName: repo.full_name,
    owner: repo.owner?.login ?? '',
    description: repo.description,
    isPrivate: repo.private,
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at ?? '',
  }
}

export async function searchUserRepos(
  octokit: Octokit,
  query: string,
): Promise<GitHubRepo[]> {
  if (!query.trim()) {
    return []
  }

  const { data } = await octokit.rest.search.repos({
    q: `${query} in:name`,
    per_page: 30,
    sort: 'updated',
  })

  return data.items.map(mapRepo)
}

const REPO_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

let repoCache: { data: GitHubRepo[]; fetchedAt: number } | null = null

export function clearRepoCache(): void {
  repoCache = null
}

export async function getMyRepos(octokit: Octokit, forceRefresh = false): Promise<GitHubRepo[]> {
  if (!forceRefresh && repoCache && Date.now() - repoCache.fetchedAt < REPO_CACHE_TTL_MS) {
    return repoCache.data
  }

  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  })

  const repos = data.map(mapRepo)
  repoCache = { data: repos, fetchedAt: Date.now() }
  return repos
}

/**
 * Validates that the user still has access to a repository by its ID.
 * First checks the cached repo list from getMyRepos, then falls back
 * to a direct API call if not found in cache.
 */
export async function validateRepoAccess(
  octokit: Octokit,
  repoId: number,
  cachedRepos?: GitHubRepo[],
): Promise<boolean> {
  // Check cached repos first to avoid redundant API calls
  if (cachedRepos) {
    return cachedRepos.some((repo) => repo.id === repoId)
  }

  try {
    const repos = await getMyRepos(octokit)
    return repos.some((repo) => repo.id === repoId)
  } catch {
    // If we can't verify access (e.g. network error), return false
    return false
  }
}
