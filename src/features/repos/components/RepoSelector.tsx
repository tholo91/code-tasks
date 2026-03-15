import { useState, use, useMemo, useEffect, Suspense, Component, type ReactNode } from 'react'
import type { Octokit } from 'octokit'
import { getMyRepos, searchUserRepos, type GitHubRepo } from '../../../services/github/repo-service'

interface RepoSelectorProps {
  octokit: Octokit
  onSelect: (repo: GitHubRepo) => void
  selectedRepoId: number | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  fallback: (error: Error, reset: () => void) => ReactNode
  onReset?: () => void
  resetKey?: unknown
}

interface ErrorBoundaryState {
  error: Error | null
}

class RepoErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }
  private resetting = false

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.resetting = false
      this.setState({ error: null })
    }
  }

  reset = () => {
    if (this.resetting) return
    this.resetting = true
    this.setState({ error: null })
    this.props.onReset?.()
  }

  render() {
    if (this.state.error) {
      return this.props.fallback(this.state.error, this.reset)
    }
    return this.props.children
  }
}

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
      <li className="px-3 py-4 text-center text-body" style={{ color: 'var(--color-text-secondary)' }}>
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

  const resultsPromise = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return getMyRepos(octokit)
    }
    return searchUserRepos(octokit, debouncedQuery)
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

      <ul className="max-h-64 overflow-y-auto" role="listbox">
        <RepoErrorBoundary
          onReset={handleRetry}
          resetKey={octokit}
          fallback={(error, reset) => {
            const msg = error instanceof Error ? error.message : String(error)
            const isRateLimit = msg.toLowerCase().includes('rate limit')
            return (
              <li className="px-3 py-4 text-center">
                <p className="mb-2 text-body" style={{ color: 'var(--color-text-secondary)' }}>
                  {isRateLimit
                    ? 'API rate limit exceeded. Please try again later.'
                    : 'Failed to load repositories.'}
                </p>
                <button onClick={reset} className="btn-primary max-w-[120px] mx-auto text-label">
                  Retry
                </button>
              </li>
            )
          }}
        >
          <Suspense
            fallback={
              <li className="px-3 py-4 text-center text-body" style={{ color: 'var(--color-text-secondary)' }}>
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
        </RepoErrorBoundary>
      </ul>
    </div>
  )
}
