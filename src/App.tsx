import { Suspense, use, useMemo, useState, useEffect } from 'react'
import { useSyncStore } from './stores/useSyncStore'
import { AuthGuard } from './components/auth/AuthGuard'
import { AuthSkeleton } from './components/ui/AuthSkeleton'
import { AuthForm } from './features/auth/components/AuthForm'
import { RepoSelector } from './features/repos/components/RepoSelector'
import { PulseInput } from './features/capture/components/PulseInput'
import { TaskCard } from './features/capture/components/TaskCard'
import { TaskSearchBar } from './features/capture/components/TaskSearchBar'
import { createTaskFuse, searchTasks } from './features/capture/utils/fuzzy-search'
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

function AppContent() {
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const user = useSyncStore((s) => s.user)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const clearAuth = useSyncStore((s) => s.clearAuth)
  const addTask = useSyncStore((s) => s.addTask)
  const tasks = useSyncStore((s) => s.tasks)
  const loadTasksFromIDB = useSyncStore((s) => s.loadTasksFromIDB)

  const { isOnline, showOfflineNotification, dismissOfflineNotification } = useNetworkStatus()
  const [searchQuery, setSearchQuery] = useState('')

  // Load tasks from IndexedDB on mount (merge with localStorage)
  useEffect(() => {
    loadTasksFromIDB()
  }, [loadTasksFromIDB])

  const filteredTasks = useMemo(() => {
    if (searchQuery.length < 2) return tasks
    const fuse = createTaskFuse(tasks)
    return searchTasks(fuse, searchQuery)
  }, [tasks, searchQuery])

  if (!isAuthenticated) {
    return <AuthForm onSuccess={() => {}} />
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
        <Suspense fallback={<p className="text-sm">Initializing GitHub access...</p>}>
          <RepoSelectorContainer />
        </Suspense>
      </div>
    )
  }

  return (
    <div className="app">
      <OfflineNotification
        visible={showOfflineNotification}
        onDismiss={dismissOfflineNotification}
      />

      <header className="app-header">
        <div className="flex items-center justify-between">
          <h1 className="app-title">code-tasks</h1>
          {!isOnline && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(210, 153, 34, 0.15)',
                color: '#d29922',
                border: '1px solid rgba(210, 153, 34, 0.2)',
              }}
              role="status"
              data-testid="offline-badge"
            >
              Offline
            </span>
          )}
        </div>
        <div className="flex flex-col items-center">
          <p className="app-subtitle">
            {user ? `Welcome, ${user.login}` : 'GitHub issue capture for developers on the go'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="app-repo" data-testid="selected-repo">
              {selectedRepo.fullName}
            </p>
            <button
              onClick={() => useSyncStore.getState().setSelectedRepo(null as any)}
              className="text-[10px] hover:underline"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              (change)
            </button>
          </div>
        </div>
      </header>
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

        {/* Task list */}
        {tasks.length > 0 && (
          <div
            className="mt-2 flex w-full max-w-[640px] flex-col gap-2 px-4"
            data-testid="task-list"
          >
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))
            ) : searchQuery.length >= 2 ? (
              <p
                className="py-4 text-center text-sm"
                style={{ color: 'var(--color-text-secondary, #8b949e)' }}
                data-testid="search-empty-state"
              >
                No tasks match &lsquo;{searchQuery}&rsquo;
              </p>
            ) : null}
          </div>
        )}
      </main>
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
