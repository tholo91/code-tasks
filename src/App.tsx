import { Suspense, use, useMemo } from 'react'
import { useSyncStore } from './stores/useSyncStore'
import { AuthGuard } from './components/auth/AuthGuard'
import { AuthSkeleton } from './components/ui/AuthSkeleton'
import { AuthForm } from './features/auth/components/AuthForm'
import { RepoSelector } from './features/repos/components/RepoSelector'
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

function AppContent() {
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const user = useSyncStore((s) => s.user)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const clearAuth = useSyncStore((s) => s.clearAuth)
  const isOffline = !navigator.onLine

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
      <header className="app-header">
        <div className="flex items-center justify-between">
          <h1 className="app-title">code-tasks</h1>
          {isOffline && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: 'rgba(210, 153, 34, 0.15)',
                color: '#d29922',
                border: '1px solid rgba(210, 153, 34, 0.2)',
              }}
              role="status"
            >
              Sync Required
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
