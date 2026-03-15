import { Suspense, use, useMemo, useState, useEffect, useCallback, Component, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
import { pageVariants, listContainerVariants, listItemVariants, TRANSITION_NORMAL } from './config/motion'

function RepoSelectorContainer({ onSelect }: { onSelect?: () => void }) {
  const setSelectedRepo = useSyncStore((s) => s.setSelectedRepo)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const octokit = use(useMemo(() => recoverOctokit(), []))

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Select a Repository
        </h2>
        <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
          Specify where your capture file will be stored.
        </p>
      </div>
      <RepoSelector
        octokit={octokit}
        selectedRepoId={selectedRepo?.id ?? null}
        onSelect={(repo) => {
          setSelectedRepo({
            id: repo.id,
            fullName: repo.fullName,
            owner: repo.owner
          })
          onSelect?.()
        }}
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
          <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
            Failed to initialize GitHub access. Please log in again.
          </p>
          <button onClick={this.props.onLogout} className="btn-primary max-w-xs">
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
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={TRANSITION_NORMAL}
          className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center px-4 py-2"
          style={{
            backgroundColor: 'rgba(210, 153, 34, 0.95)',
            color: '#1c2128',
          }}
          role="alert"
          data-testid="offline-notification"
        >
          <span className="text-body font-medium">Offline &mdash; Storing Locally</span>
          <button
            onClick={onDismiss}
            className="ml-3 text-label font-bold underline"
            style={{ color: '#1c2128' }}
            aria-label="Dismiss offline notification"
          >
            Dismiss
          </button>
        </motion.div>
      )}
    </AnimatePresence>
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
      <form onSubmit={handleSubmit} className="card w-full max-w-md p-6">
        <h2 className="mb-2 text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Welcome back{user?.name ? `, ${user.name}` : ''}
        </h2>
        <p className="mb-6 text-body" style={{ color: 'var(--color-text-secondary)' }}>
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
            className="input-field"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border px-3 py-2 text-body"
            style={{
              borderColor: 'var(--color-danger)',
              color: 'var(--color-danger)',
              backgroundColor: 'rgba(248, 81, 73, 0.1)',
            }}
          >
            {error}
          </div>
        )}

        <motion.button
          type="submit"
          disabled={isPending}
          className="btn-primary"
          whileTap={{ scale: 0.97 }}
        >
          {isPending ? 'Unlocking...' : 'Unlock'}
        </motion.button>

        <button
          type="button"
          onClick={clearAuth}
          className="btn-ghost mt-3 w-full"
        >
          Log in with a different token instead
        </button>
      </form>
    </div>
  )
}

/** Bottom sheet overlay for repo picker */
function RepoPickerSheet({ onClose }: { onClose: () => void }) {
  const clearAuth = useSyncStore((s) => s.clearAuth)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-end"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
        className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />

        <OctokitErrorBoundary onLogout={clearAuth}>
          <Suspense
            fallback={
              <p className="text-body py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Loading repositories...
              </p>
            }
          >
            <RepoSelectorContainer onSelect={onClose} />
          </Suspense>
        </OctokitErrorBoundary>
      </motion.div>
    </motion.div>
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
  const [showRepoPicker, setShowRepoPicker] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [newestTaskId, setNewestTaskId] = useState<string | null>(null)

  useEffect(() => {
    loadTasksFromIDB()
  }, [loadTasksFromIDB])

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

  const handleLaunch = useCallback((title: string, body: string) => {
    const newTask = addTask(title, body)
    if (newTask?.id) {
      setNewestTaskId(newTask.id)
      setTimeout(() => setNewestTaskId(null), 1500)
    }
  }, [addTask])

  // Determine which view to show
  const getViewKey = () => {
    if (!isAuthenticated) return 'auth'
    if (needsPassphrase) return 'passphrase'
    if (!selectedRepo) return 'repo-select'
    return 'main'
  }

  const viewKey = getViewKey()

  return (
    <AnimatePresence mode="wait">
      {viewKey === 'auth' && (
        <motion.div key="auth" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <AuthForm onSuccess={() => {}} />
        </motion.div>
      )}

      {viewKey === 'passphrase' && (
        <motion.div key="passphrase" variants={pageVariants} initial="initial" animate="animate" exit="exit">
          <PassphraseUnlock />
        </motion.div>
      )}

      {viewKey === 'repo-select' && (
        <motion.div
          key="repo-select"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen flex flex-col items-center justify-center p-4"
        >
          <header className="text-center mb-8">
            <h1 className="text-hero font-semibold" style={{ color: 'var(--color-accent)' }}>
              code-tasks
            </h1>
            <button onClick={clearAuth} className="btn-ghost mt-2">
              Logout
            </button>
          </header>
          <OctokitErrorBoundary onLogout={clearAuth}>
            <Suspense fallback={<p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>Initializing GitHub access...</p>}>
              <RepoSelectorContainer />
            </Suspense>
          </OctokitErrorBoundary>
        </motion.div>
      )}

      {viewKey === 'main' && (
        <motion.div
          key="main"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="min-h-screen flex flex-col items-center p-4"
        >
          <OfflineNotification
            visible={showOfflineNotification}
            onDismiss={dismissOfflineNotification}
          />

          <AppHeader isOnline={isOnline} onChangeRepo={() => setShowRepoPicker(true)} />

          <main className="flex w-full flex-1 flex-col items-center">
            <PulseInput onLaunch={handleLaunch} />

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
            {tasks.length > 0 ? (
              <motion.div
                className="mt-2 flex w-full max-w-[640px] flex-col gap-2 px-4"
                variants={listContainerVariants}
                initial="initial"
                animate="animate"
                data-testid="task-list"
              >
                {displayedTasks.length > 0 ? (
                  displayedTasks.map((task) => (
                    <motion.div key={task.id} variants={listItemVariants}>
                      <TaskCard
                        task={task}
                        isExpanded={expandedTaskId === task.id}
                        onToggle={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                        isNewest={newestTaskId === task.id}
                      />
                    </motion.div>
                  ))
                ) : (
                  <p
                    className="py-4 text-center text-body"
                    style={{ color: 'var(--color-text-secondary)' }}
                    data-testid="filter-empty-state"
                  >
                    {searchQuery.length >= 1
                      ? `No tasks match \u2018${searchQuery}\u2019`
                      : priorityFilter === 'important'
                        ? 'No important tasks'
                        : 'No non-important tasks'}
                  </p>
                )}
              </motion.div>
            ) : (
              /* Empty state */
              <motion.div
                className="mt-12 flex flex-col items-center gap-3 px-4"
                variants={pageVariants}
                initial="initial"
                animate="animate"
              >
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ color: 'var(--color-text-secondary)', opacity: 0.3 }}
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <p className="text-body font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  No tasks yet
                </p>
                <p className="text-label" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}>
                  Type above and swipe up to launch your first task
                </p>
              </motion.div>
            )}

            <button
              onClick={() => setIsRoadmapOpen(true)}
              className="mt-8 mb-12 text-label font-medium opacity-60 hover:opacity-100 transition-opacity flex items-center gap-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              <span>Was kommt als Nächstes?</span>
              <span className="text-caption px-1 py-0.5 rounded border border-[rgba(255,255,255,0.2)]">Roadmap</span>
            </button>
          </main>

          <SyncFAB />

          {/* Repo picker bottom sheet */}
          <AnimatePresence>
            {showRepoPicker && (
              <RepoPickerSheet onClose={() => setShowRepoPicker(false)} />
            )}
          </AnimatePresence>

          {/* Roadmap overlay */}
          <AnimatePresence>
            {isRoadmapOpen && (
              <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto bg-[var(--color-canvas)]">
                <RoadmapView onClose={() => setIsRoadmapOpen(false)} />
              </div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
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
