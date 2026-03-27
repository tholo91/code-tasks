import { useState, useEffect, useRef } from 'react'
import type { Octokit } from 'octokit'
import { getMyRepos, searchUserRepos, type GitHubRepo } from '../../../services/github/repo-service'
import { useSyncStore, selectPendingSyncCountsByRepo, selectPendingSyncCountAllRepos, selectOpenTaskCountsByRepo, selectRepoSyncErrors } from '../../../stores/useSyncStore'
import type { RepoSyncError } from '../../../stores/useSyncStore'

interface RepoSelectorProps {
  octokit: Octokit
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
}

function splitRepoName(fullName: string): { owner: string; name: string } {
  const idx = fullName.indexOf('/')
  if (idx === -1) return { owner: '', name: fullName }
  return { owner: fullName.slice(0, idx), name: fullName.slice(idx + 1) }
}

function RepoList({
  onSelect,
  selectedRepoId,
  pendingByRepo,
  openByRepo,
  errorsByRepo,
  repos,
}: {
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
  pendingByRepo: Record<string, number>
  openByRepo: Record<string, number>
  errorsByRepo: Record<string, RepoSyncError>
  repos: GitHubRepo[]
}) {
  if (repos.length === 0) {
    return (
      <li
        className="flex items-center justify-center py-8 text-[13px]"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        No repositories found
      </li>
    )
  }

  return (
    <>
      {repos.map((repo) => {
        const isSelected = repo.id === selectedRepoId
        const repoKey = repo.fullName.toLowerCase()
        const pendingCount = pendingByRepo[repoKey] ?? 0
        const openCount = openByRepo[repoKey] ?? 0
        const hasError = !!errorsByRepo[repoKey]
        const { owner, name } = splitRepoName(repo.fullName)

        return (
          <li
            key={repo.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(repo)}
            className="cursor-pointer px-4 py-3 transition-colors active:opacity-70"
            style={{
              borderBottom: '1px solid var(--color-border)',
              backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.08)' : 'transparent',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div className="flex items-center gap-2.5">
              {/* Selected indicator bar */}
              <div
                className="flex-shrink-0 rounded-full"
                style={{
                  width: 3,
                  height: 20,
                  backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                }}
              />

              {/* Repo name: owner/ dimmed, name bold */}
              <div className="flex-1 min-w-0 truncate">
                {owner && (
                  <span
                    className="text-[13px]"
                    style={{ color: 'var(--color-text-secondary)', opacity: 0.5 }}
                  >
                    {owner}/
                  </span>
                )}
                <span
                  className="text-[13px] font-semibold"
                  style={{ color: isSelected ? 'var(--color-accent)' : 'var(--color-text-primary)' }}
                >
                  {name}
                </span>
              </div>

              {/* Badges */}
              {repo.isPrivate && (
                <span
                  className="flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                    opacity: 0.7,
                  }}
                >
                  Private
                </span>
              )}
              {hasError ? (
                <span
                  className="badge badge-red flex-shrink-0"
                  data-testid={`repo-error-${repo.fullName}`}
                  title="Sync error"
                >
                  !
                </span>
              ) : pendingCount > 0 ? (
                <span
                  className="badge badge-amber flex-shrink-0"
                  data-testid={`repo-pending-${repo.fullName}`}
                >
                  {pendingCount}
                </span>
              ) : null}
              {openCount > 0 && (
                <span
                  className="flex-shrink-0 flex items-center justify-center rounded-full text-[11px] font-semibold"
                  style={{
                    minWidth: 22,
                    height: 22,
                    padding: '0 6px',
                    backgroundColor: isSelected ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    color: 'var(--color-surface)',
                    opacity: isSelected ? 1 : 0.6,
                  }}
                  data-testid={`repo-open-count-${repo.fullName}`}
                >
                  {openCount}
                </span>
              )}
            </div>
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
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingByRepo = useSyncStore(selectPendingSyncCountsByRepo)
  const pendingAll = useSyncStore(selectPendingSyncCountAllRepos)
  const openByRepo = useSyncStore(selectOpenTaskCountsByRepo)
  const errorsByRepo = useSyncStore(selectRepoSyncErrors)

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
    <div className="w-full max-w-md">
      {/* Search — standalone above the list */}
      <div
        className="relative mx-1 mb-3 flex items-center rounded-xl"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
        }}
      >
        <svg
          className="pointer-events-none absolute left-3 flex-shrink-0"
          width="14"
          height="14"
          viewBox="0 0 16 16"
          fill="currentColor"
          style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
          />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search repositories..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-transparent text-[13px] font-medium outline-none"
          style={{
            color: 'var(--color-text-primary)',
            padding: '12px 12px 12px 34px',
            minHeight: 44,
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            className="absolute right-1.5 flex items-center justify-center rounded-full"
            style={{
              width: 26,
              height: 26,
              color: 'var(--color-text-secondary)',
              backgroundColor: 'rgba(139, 148, 158, 0.12)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
              <path d="M1.707.293A1 1 0 00.293 1.707L4.586 6 .293 10.293a1 1 0 101.414 1.414L6 7.414l4.293 4.293a1 1 0 001.414-1.414L7.414 6l4.293-4.293A1 1 0 0010.293.293L6 4.586 1.707.293z" />
            </svg>
          </button>
        )}
      </div>

      {/* Pending summary */}
      {pendingAll > 0 && (
        <div
          className="mx-1 mb-2 px-3 py-1.5 text-[11px] font-medium"
          style={{ color: 'var(--color-warning)', opacity: 0.8 }}
        >
          {pendingAll} pending change{pendingAll === 1 ? '' : 's'} across repos
        </div>
      )}

      {/* Repository list */}
      <div
        className="overflow-hidden rounded-xl"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
        }}
      >
        <ul className="max-h-72 overflow-y-auto" role="listbox">
          {loading ? (
            <li
              className="flex items-center justify-center py-8 text-[13px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Loading...
            </li>
          ) : error ? (
            <li className="px-4 py-6 text-center">
              <p className="mb-3 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                {error.message.toLowerCase().includes('rate limit')
                  ? 'Rate limit exceeded. Try again later.'
                  : 'Failed to load repositories.'}
              </p>
              <button
                onClick={handleRetry}
                className="rounded-lg px-4 py-2 text-[13px] font-semibold"
                style={{
                  color: 'var(--color-accent)',
                  border: '1px solid var(--color-accent)',
                  background: 'transparent',
                }}
              >
                Retry
              </button>
            </li>
          ) : (
            <RepoList
              repos={repos}
              onSelect={onSelect}
              selectedRepoId={selectedRepoId}
              pendingByRepo={pendingByRepo}
              openByRepo={openByRepo}
              errorsByRepo={errorsByRepo}
            />
          )}
        </ul>
      </div>
    </div>
  )
}
