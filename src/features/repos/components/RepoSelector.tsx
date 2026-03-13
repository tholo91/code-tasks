import { useState, use, useMemo, Suspense } from 'react'
import type { Octokit } from 'octokit'
import { getMyRepos, searchUserRepos, type GitHubRepo } from '../../../services/github/repo-service'

interface RepoSelectorProps {
  octokit: Octokit
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
}

/**
 * Internal component that consumes the search results promise via use()
 */
function RepoList({
  resultsPromise,
  onSelect,
  selectedRepoId,
}: {
  resultsPromise: Promise<GitHubRepo[]>
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
}) {
  const repos = use(resultsPromise)

  if (repos.length === 0) {
    return (
      <li className="px-3 py-4 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        No repositories found
      </li>
    )
  }

  return (
    <>
      {repos.map((repo) => {
        const isSelected = repo.id === selectedRepoId
        return (
          <li
            key={repo.id}
            role="option"
            aria-selected={isSelected}
            data-selected={isSelected ? 'true' : 'false'}
            onClick={() => onSelect(repo)}
            className="cursor-pointer border-b px-3 py-2 last:border-b-0"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.1)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
              >
                {repo.fullName}
              </span>
              {repo.isPrivate && (
                <span
                  className="rounded-full border px-1.5 py-0.5 text-[10px]"
                  style={{
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Private
                </span>
              )}
            </div>
            {repo.description && (
              <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {repo.description}
              </p>
            )}
          </li>
        )
      })}
    </>
  )
}

export function RepoSelector({ octokit, onSelect, selectedRepoId }: RepoSelectorProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  // Simple debounce logic
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Memoize the search promise so it's stable between renders of RepoList
  const resultsPromise = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return getMyRepos(octokit)
    }
    return searchUserRepos(octokit, debouncedQuery)
  }, [octokit, debouncedQuery])

  return (
    <div
      className="w-full max-w-md overflow-hidden rounded-lg border"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: 'var(--color-border)',
      }}
    >
      <div className="border-b px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <input
          type="text"
          placeholder="Search repositories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-sm outline-none"
          style={{ color: 'var(--color-text-primary)' }}
        />
      </div>

      <ul className="max-h-64 overflow-y-auto" role="listbox">
        <Suspense
          fallback={
            <li className="px-3 py-4 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Loading repositories...
            </li>
          }
        >
          <RepoList
            resultsPromise={resultsPromise}
            onSelect={onSelect}
            selectedRepoId={selectedRepoId}
          />
        </Suspense>
      </ul>
    </div>
  )
}
