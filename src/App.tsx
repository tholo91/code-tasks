import { Suspense, use, useMemo, useState, useEffect, Component, type ReactNode } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useSyncStore } from './stores/useSyncStore'
import { AuthGuard } from './components/auth/AuthGuard'
import { AuthSkeleton } from './components/ui/AuthSkeleton'
import { AppHeader } from './components/layout/AppHeader'
import { AuthForm } from './features/auth/components/AuthForm'
import { RepoSelector } from './features/repos/components/RepoSelector'
import { PulseInput } from './features/capture/components/PulseInput'
import { TaskCard } from './features/capture/components/TaskCard'
import { TaskSearchBar } from './features/capture/components/TaskSearchBar'
import { PriorityFilterPills } from './features/capture/components/PriorityFilterPills'
import { RoadmapView } from './features/community/components/RoadmapView'
import { SyncFAB } from './features/sync/components/SyncFAB'
import { useAutoSync } from './features/sync/hooks/useAutoSync'
import { createTaskFuse, searchTasks } from './features/capture/utils/fuzzy-search'
import type { PriorityFilter } from './types/task'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { recoverOctokit } from './services/github/octokit-provider'
import './App.css'

function RepoSelectorContainer() {
  const setSelectedRepo = useSyncStore((s) => s.setSelectedRepo)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)

  // React 19 use() for async resource
  const octokit = use(useMemo(() => recoverOctokit(), []))

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Select a Repository
        </h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Specify where your capture file will be stored.
        </p>
      </div>
      <RepoSelector
        octokit={octokit}
        selectedRepoId={selectedRepo?.id ?? null}
        onSelect={(repo) => setSelectedRepo({
          id: repo.id,
          fullName: repo.fullName,
          owner: repo.owner
        })}
      />
    </div>
  )
}

interface OctokitErrorBoundaryState {
  error: Error | null
}

class OctokitErrorBoundary extends Component<
  { children: ReactNode; onLogout: () => void },
  OctokitErrorBoundaryState
> {
  state: OctokitErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): OctokitErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Failed to initialize GitHub access. Please log in again.
          </p>
          <button
            onClick={this.props.onLogout}
            className="rounded-md px-4 py-2 text-sm font-medium"
            style={{ backgroundColor: 'var(--color-accent)', color: '#ffffff' }}
          >
            Log in again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

function OfflineNotification({
  visible,
  onDismiss,
}: {
  visible: boolean
  onDismiss: () => void
}) {
  if (!visible) return null

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center px-4 py-2"
      style={{
        backgroundColor: 'rgba(210, 153, 34, 0.95)',
        color: '#1c2128',
      }}
      role="alert"
      data-testid="offline-notification"
    >
      <span className="text-sm font-medium">Offline &mdash; Storing Locally</span>
      <button
        onClick={onDismiss}
        className="ml-3 text-xs font-bold underline"
        style={{ color: '#1c2128' }}
        aria-label="Dismiss offline notification"
      >
        Dismiss
      </button>
    </div>
  )
}

function PassphraseUnlock() {
  const unlockWithPassphrase = useSyncStore((s) => s.unlockWithPassphrase)
  const clearAuth = useSyncStore((s) => s.clearAuth)
  const user = useSyncStore((s) => s.user)
  const [passphrase, setPassphrase] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passphrase.trim()) return
    setError(null)
    setIsPending(true)
    try {
      const success = await unlockWithPassphrase(passphrase.trim())
      if (!success) {
        setError('Wrong passphrase or token expired. Try again or log in fresh.')
      }
    } catch {
      setError('Unlock failed. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-lg border p-6"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        <h2
          className="mb-2 text-xl font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h2>
        <p
          className="mb-6 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Enter your passphrase to unlock your encrypted token.
        </p>

        <div className="mb-6">
          <input
            type="password"
            autoComplete="current-password"
            placeholder="Your master passphrase"
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            disabled={isPending}
            className="w-full rounded-md border px-3 py-2 text-sm outline-none"
            style={{
              backgroundColor: 'var(--color-canvas)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border px-3 py-2 text-sm"
            style={{
              borderColor: '#f85149',
              color: '#f85149',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
            }}
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-md px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50"
          style={{
            backgroundColor: 'var(--color-accent)',
            color: '#ffffff',
          }}
        >
          {isPending ? 'Unlocking...' : 'Unlock'}
        </button>

        <button
          type="button"
          onClick={clearAuth}
          className="mt-3 w-full text-xs underline"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Log in with a different token instead
        </button>
      </form>
    </div>
  )
}

function AppContent() {
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const needsPassphrase = useSyncStore((s) => s.needsPassphrase)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const clearAuth = useSyncStore((s) => s.clearAuth)
  const addTask = useSyncStore((s) => s.addTask)
  const tasks = useSyncStore((s) => s.tasks)
  const loadTasksFromIDB = useSyncStore((s) => s.loadTasksFromIDB)

  const { isOnline, showOfflineNotification, dismissOfflineNotification } = useNetworkStatus()
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false)

  // Load tasks from IndexedDB on mount (merge with localStorage)
  useEffect(() => {
    loadTasksFromIDB()
  }, [loadTasksFromIDB])

  // Automatic sync triggers
  useAutoSync()

  const fuse = useMemo(() => createTaskFuse(tasks), [tasks])

  const searchFilteredTasks = useMemo(() => {
    if (searchQuery.length < 1) return tasks
    return searchTasks(fuse, searchQuery)
  }, [fuse, searchQuery, tasks])

  const displayedTasks = useMemo(() => {
    if (priorityFilter === 'all') return searchFilteredTasks
    if (priorityFilter === 'important') return searchFilteredTasks.filter((t) => t.isImportant)
    return searchFilteredTasks.filter((t) => !t.isImportant)
  }, [searchFilteredTasks, priorityFilter])

  if (!isAuthenticated) {
    return <AuthForm onSuccess={() => {}} />
  }

  if (needsPassphrase) {
    return <PassphraseUnlock />
  }

  if (!selectedRepo) {
    return (
      <div className="app">
        <header className="app-header mb-8">
          <h1 className="app-title">code-tasks</h1>
          <button
            onClick={clearAuth}
            className="text-xs underline"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Logout
          </button>
        </header>
        <OctokitErrorBoundary onLogout={clearAuth}>
          <Suspense fallback={<p className="text-sm">Initializing GitHub access...</p>}>
            <RepoSelectorContainer />
          </Suspense>
        </OctokitErrorBoundary>
      </div>
    )
  }

  return (
    <div className="app">
      <OfflineNotification
        visible={showOfflineNotification}
        onDismiss={dismissOfflineNotification}
      />

      <AppHeader isOnline={isOnline} />
      <main className="flex w-full flex-1 flex-col items-center">
        <PulseInput onLaunch={(title, body) => addTask(title, body)} />

        {/* Search bar */}
        {tasks.length > 0 && (
          <div className="mt-4 w-full max-w-[640px] px-4">
            <TaskSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              taskCount={tasks.length}
            />
          </div>
        )}

        {/* Priority filter pills */}
        {tasks.length > 0 && (
          <div className="mt-2 w-full max-w-[640px] px-4">
            <PriorityFilterPills
              currentFilter={priorityFilter}
              onChange={setPriorityFilter}
            />
          </div>
        )}

        {/* Task list */}
        {tasks.length > 0 && (
          <div
            className="mt-2 flex w-full max-w-[640px] flex-col gap-2 px-4"
            data-testid="task-list"
          >
            {displayedTasks.length > 0 ? (
              displayedTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : (
              <p
                className="py-4 text-center text-sm"
                style={{ color: 'var(--color-fg-muted, var(--color-text-secondary, #8b949e))' }}
                data-testid="filter-empty-state"
              >
                {searchQuery.length >= 1
                  ? `No tasks match '\u2018${searchQuery}\u2019'`
                  : priorityFilter === 'important'
                    ? 'No important tasks'
                    : 'No non-important tasks'}
              </p>
            )}
          </div>
        )}

        <button 
          onClick={() => setIsRoadmapOpen(true)}
          className="mt-8 mb-12 text-xs font-medium opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5"
          style={{ color: 'var(--color-text-primary)' }}
        >
          <span>Was kommt als Nächstes?</span>
          <span className="text-[10px] px-1 py-0.5 rounded border border-[rgba(255,255,255,0.2)]">Roadmap</span>
        </button>
      </main>

      <SyncFAB />

      <AnimatePresence>
        {isRoadmapOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto bg-[var(--color-canvas)]">
            <RoadmapView onClose={() => setIsRoadmapOpen(false)} />
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

function App() {
  return (
    <Suspense fallback={<AuthSkeleton />}>
      <AuthGuard>
        <AppContent />
      </AuthGuard>
    </Suspense>
  )
}

export default App
