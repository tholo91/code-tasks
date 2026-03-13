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

export async function getMyRepos(octokit: Octokit): Promise<GitHubRepo[]> {
  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    per_page: 100,
    sort: 'updated',
    direction: 'desc',
  })

  return data.map(mapRepo)
}
