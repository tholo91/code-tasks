import { useState, useEffect } from 'react'
import type { Octokit } from 'octokit'
import { getMyRepos, searchUserRepos, type GitHubRepo } from '../../../services/github/repo-service'
import { useSyncStore, selectPendingSyncCountsByRepo, selectPendingSyncCountAllRepos } from '../../../stores/useSyncStore'

interface RepoSelectorProps {
  octokit: Octokit
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
}

function RepoList({
  onSelect,
  selectedRepoId,
  pendingByRepo,
  repos,
}: {
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
  pendingByRepo: Record<string, number>
  repos: GitHubRepo[]
}) {
  if (repos.length === 0) {
    return (
      <li className="px-3 py-4 text-center text-body" style={{ color: 'var(--color-text-secondary)' }}>
        No repositories found
      </li>
    )
  }

  return (
    <>
      {repos.map((repo) => {
        const isSelected = repo.id === selectedRepoId
        const pendingCount = pendingByRepo[repo.fullName.toLowerCase()] ?? 0
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
                className="text-body font-medium"
                style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
              >
                {repo.fullName}
              </span>
              {repo.isPrivate && (
                <span className="badge" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  Private
                </span>
              )}
              {pendingCount > 0 && (
                <span className="badge badge-amber" data-testid={`repo-pending-${repo.fullName}`}>
                  {pendingCount} pending
                </span>
              )}
            </div>
            {repo.description && (
              <p className="mt-0.5 text-label" style={{ color: 'var(--color-text-secondary)' }}>
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
  const [retryCount, setRetryCount] = useState(0)
  const [repos, setRepos] = useState<GitHubRepo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const pendingByRepo = useSyncStore(selectPendingSyncCountsByRepo)
  const pendingAll = useSyncStore(selectPendingSyncCountAllRepos)

  useEffect(() => {
    if (!query.trim()) {
      setDebouncedQuery('')
      return
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(query)
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchPromise = debouncedQuery.trim()
      ? searchUserRepos(octokit, debouncedQuery)
      : getMyRepos(octokit)

    fetchPromise
      .then((data) => {
        if (cancelled) return
        setRepos(data)
        setLoading(false)
      })
      .catch((err) => {
        if (cancelled) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [octokit, debouncedQuery, retryCount])

  const handleRetry = () => {
    setRetryCount((c) => c + 1)
  }

  return (
    <div className="card w-full max-w-md overflow-hidden">
      <div className="border-b px-3 py-2" style={{ borderColor: 'var(--color-border)' }}>
        <input
          type="text"
          placeholder="Search repositories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-body outline-none"
          style={{ color: 'var(--color-text-primary)', minHeight: '44px' }}
        />
      </div>

      {pendingAll > 0 && (
        <div className="border-b px-3 py-2 text-caption" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
          {pendingAll} pending change{pendingAll === 1 ? '' : 's'} across repos
        </div>
      )}

      <ul className="max-h-64 overflow-y-auto" role="listbox">
        {loading ? (
          <li className="px-3 py-4 text-center text-body" style={{ color: 'var(--color-text-secondary)' }}>
            Loading repositories...
          </li>
        ) : error ? (
          <li className="px-3 py-4 text-center">
            <p className="mb-2 text-body" style={{ color: 'var(--color-text-secondary)' }}>
              {error.message.toLowerCase().includes('rate limit')
                ? 'API rate limit exceeded. Please try again later.'
                : 'Failed to load repositories.'}
            </p>
            <button onClick={handleRetry} className="btn-primary max-w-[120px] mx-auto text-label">
              Retry
            </button>
          </li>
        ) : (
          <RepoList
            repos={repos}
            onSelect={onSelect}
            selectedRepoId={selectedRepoId}
            pendingByRepo={pendingByRepo}
          />
        )}
      </ul>
    </div>
  )
}
