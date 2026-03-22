import { Suspense, use, useMemo, useState, useEffect, useRef, useCallback, Component, type ReactNode } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useSyncStore, selectSyncBranch } from './stores/useSyncStore'
import { AuthGuard } from './components/auth/AuthGuard'
import { AuthSkeleton } from './components/ui/AuthSkeleton'
import { AppHeader } from './components/layout/AppHeader'
import { AuthForm } from './features/auth/components/AuthForm'
import { RepoSelector } from './features/repos/components/RepoSelector'
import { CreateTaskFAB } from './features/capture/components/CreateTaskFAB'
import { CreateTaskSheet } from './features/capture/components/CreateTaskSheet'
import { TaskDetailSheet } from './features/capture/components/TaskDetailSheet'
import { DraggableTaskCard } from './features/capture/components/DraggableTaskCard'
import { TaskCard } from './features/capture/components/TaskCard'
import { UndoToast } from './features/capture/components/UndoToast'
import { TaskSearchBar } from './features/capture/components/TaskSearchBar'
import { PriorityFilterPills } from './features/capture/components/PriorityFilterPills'
import { SortModeSelector } from './features/capture/components/SortModeSelector'
import { RoadmapView } from './features/community/components/RoadmapView'
import { AboutGittyView } from './features/community/components/AboutGittyView'
import { SyncFAB } from './features/sync/components/SyncFAB'
import { SyncResultToast } from './features/sync/components/SyncResultToast'
import { SyncConflictBanner } from './features/sync/components/SyncConflictBanner'
import { BranchProtectionBanner } from './features/sync/components/BranchProtectionBanner'
import { BranchFallbackPrompt } from './features/sync/components/BranchFallbackPrompt'
import { SyncImportBanner } from './features/sync/components/SyncImportBanner'
import { useAutoSync } from './features/sync/hooks/useAutoSync'
import { useRemoteChangeDetection } from './hooks/useRemoteChangeDetection'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { SettingsSheet } from './components/layout/SettingsSheet'
import { TRANSITION_SHEET } from './config/motion'
import { SheetHandle } from './components/ui/SheetHandle'
import { createTaskFuse, searchTasks } from './features/capture/utils/fuzzy-search'
import type { PriorityFilter, SortMode, Task } from './types/task'
import { computeImportDiff, isAllZero, buildImportFeedbackMessage } from './utils/task-diff'
import type { ImportDiffSummary } from './utils/task-diff'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { recoverOctokit } from './services/github/octokit-provider'
import { triggerSelectionHaptic } from './services/native/haptic-service'
import { pageVariants, listContainerVariants, listItemVariants, TRANSITION_NORMAL, TRANSITION_FAST } from './config/motion'
import { sortTasksForDisplay } from './utils/task-sorting'
import { fetchRemoteTasksForRepo, syncAllRepoTasks } from './services/github/sync-service'
import { PullToRefreshIndicator } from './components/ui/PullToRefreshIndicator'

function RepoSelectorContainer({ onSelect, onRepoSelected }: { onSelect?: () => void; onRepoSelected?: (repoFullName: string) => void }) {
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
          if (onRepoSelected) {
            onRepoSelected(repo.fullName)
          } else {
            setSelectedRepo({
              id: repo.id,
              fullName: repo.fullName,
              owner: repo.owner
            })
          }
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
          className="z-50 flex items-center justify-center px-4 py-2 w-full"
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

/** Bottom sheet overlay for repo picker */
function RepoPickerSheet({ onClose, onRepoSelected }: { onClose: () => void; onRepoSelected?: (repoFullName: string) => void }) {
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
        transition={TRANSITION_SHEET}
        className="relative z-10 w-full max-w-lg rounded-t-2xl p-6 pb-8"
        style={{ backgroundColor: 'var(--color-surface)' }}
      >
        <SheetHandle />

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 flex items-center justify-center rounded"
          style={{
            minWidth: '44px',
            minHeight: '44px',
            color: 'var(--color-text-secondary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M1.707.293A1 1 0 00.293 1.707L4.586 6 .293 10.293a1 1 0 101.414 1.414L6 7.414l4.293 4.293a1 1 0 001.414-1.414L7.414 6l4.293-4.293A1 1 0 0010.293.293L6 4.586 1.707.293z" />
          </svg>
        </button>

        <OctokitErrorBoundary onLogout={clearAuth}>
          <Suspense
            fallback={
              <p className="text-body py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                Loading repositories...
              </p>
            }
          >
            <RepoSelectorContainer onSelect={() => {
              onClose()
            }} onRepoSelected={onRepoSelected} />
          </Suspense>
        </OctokitErrorBoundary>
      </motion.div>
    </motion.div>
  )
}

function AppContent() {
  const isAuthenticated = useSyncStore((s) => s.isAuthenticated)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const user = useSyncStore((s) => s.user)
  const clearAuth = useSyncStore((s) => s.clearAuth)
  const tasks = useSyncStore((s) => s.tasks)
  const toggleComplete = useSyncStore((s) => s.toggleComplete)
  const reorderTasks = useSyncStore((s) => s.reorderTasks)
  const updateTask = useSyncStore((s) => s.updateTask)
  const removeTask = useSyncStore((s) => s.removeTask)
  const moveTaskToRepo = useSyncStore((s) => s.moveTaskToRepo)
  const loadTasksFromIDB = useSyncStore((s) => s.loadTasksFromIDB)
  const replaceTasksForRepo = useSyncStore((s) => s.replaceTasksForRepo)
  const mergeRemoteTasksForRepo = useSyncStore((s) => s.mergeRemoteTasksForRepo)
  const clearRepoConflict = useSyncStore((s) => s.clearRepoConflict)
  const setRepoSyncMeta = useSyncStore((s) => s.setRepoSyncMeta)
  const repoSortModes = useSyncStore((s) => s.repoSortModes)
  const setRepoSortMode = useSyncStore((s) => s.setRepoSortMode)
  const setRepoSyncBranch = useSyncStore((s) => s.setRepoSyncBranch)
  const setSyncStatus = useSyncStore((s) => s.setSyncStatus)
  const fallbackBranch = useSyncStore(
    selectedRepo ? selectSyncBranch(selectedRepo.fullName) : () => null
  )

  const syncErrorType = useSyncStore((s) => s.syncErrorType)

  const currentSortMode: SortMode = selectedRepo
    ? (repoSortModes[selectedRepo.fullName.toLowerCase()] ?? 'manual')
    : 'manual'

  const { isOnline, showOfflineNotification, dismissOfflineNotification } = useNetworkStatus()
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [showBranchPrompt, setShowBranchPrompt] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const [showRepoPicker, setShowRepoPicker] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [moveTaskId, setMoveTaskId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [newestTaskId, setNewestTaskId] = useState<string | null>(null)
  const [showCreateSheet, setShowCreateSheet] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [wasAutoExpanded, setWasAutoExpanded] = useState(false)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null)
  const [dragOrderedTasks, setDragOrderedTasks] = useState<Task[]>([])
  const dragStartOrderRef = useRef<string[] | null>(null)
  const dragPointerYRef = useRef<number | null>(null)
  const [idbLoaded, setIdbLoaded] = useState(false)
  const [importPrompt, setImportPrompt] = useState<{
    repoFullName: string
    tasks: Task[]
    sha: string | null
    source?: 'repo-switch' | 'remote-update'
  } | null>(null)
  const [diffSummary, setDiffSummary] = useState<ImportDiffSummary | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null)
  const syncToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pullToRefreshResult, setPullToRefreshResult] = useState<'up-to-date' | null>(null)
  const importAttemptedRef = useRef<Set<string>>(new Set())

  // Track tasks that have been toggled but are waiting for the 500ms transition delay
  const [pendingToggleIds, setPendingToggleIds] = useState<Set<string>>(new Set())

  // Soft-delete pipeline: task stays in store but hidden from UI during undo window
  const [pendingDelete, setPendingDelete] = useState<{
    task: Task
    timeoutId: ReturnType<typeof setTimeout>
  } | null>(null)

  useEffect(() => {
    let active = true
    loadTasksFromIDB()
      .catch(() => {})
      .finally(() => {
        if (active) setIdbLoaded(true)
      })
    return () => {
      active = false
    }
  }, [loadTasksFromIDB])

  useAutoSync()

  // Pull to refresh handler
  const handlePullRefresh = useCallback(async () => {
    if (!selectedRepo || !user || !isOnline) return

    const result = await fetchRemoteTasksForRepo(selectedRepo.fullName, user.login)
    if (result.error) return

    const repoKey = selectedRepo.fullName.toLowerCase()
    const lastSha = useSyncStore.getState().repoSyncMeta[repoKey]?.lastSyncedSha
    const localTasks = useSyncStore.getState().tasks.filter((t) => t.repoFullName.toLowerCase() === repoKey)
    const diff = computeImportDiff(localTasks, result.tasks)

    if (result.sha !== lastSha && !isAllZero(diff)) {
      setDiffSummary(diff)
      setImportPrompt({
        repoFullName: selectedRepo.fullName,
        tasks: result.tasks,
        sha: result.sha,
        source: 'remote-update',
      })
    } else {
      setPullToRefreshResult('up-to-date')
      setTimeout(() => setPullToRefreshResult(null), 1500)
    }
  }, [selectedRepo, user, isOnline, setRepoSyncMeta])

  const { pullDistance, isRefreshing: isPullRefreshing, handlers: pullHandlers } = usePullToRefresh({
    onRefresh: handlePullRefresh,
    disabled: !isOnline || useSyncStore((s) => s.syncEngineStatus) === 'syncing',
  })

  // Show branch fallback prompt when branch-protection error occurs and no fallback is set
  useEffect(() => {
    if (syncErrorType === 'branch-protection' && !fallbackBranch) {
      setShowBranchPrompt(true)
    }
  }, [syncErrorType, fallbackBranch])

  const handleBranchConfirm = useCallback(async (branchName: string) => {
    if (!selectedRepo) return
    const finalBranch = branchName.trim() || null
    setRepoSyncBranch(selectedRepo.fullName, finalBranch)
    setShowBranchPrompt(false)
    setBannerDismissed(false)
    setSyncStatus('idle')

    if (!finalBranch) return

    // Re-trigger sync with the new branch
    setSyncStatus('syncing')
    try {
      const result = await syncAllRepoTasks({ branch: finalBranch, maxRetries: 2 })
      if (result.error) {
        setSyncStatus('error', result.error, result.errorType)
      } else {
        setSyncStatus('success')
        useSyncStore.getState().updateLastSyncedAt()
      }
    } catch {
      setSyncStatus('error', 'Sync failed')
    }
  }, [selectedRepo, setRepoSyncBranch, setSyncStatus])

  useRemoteChangeDetection((data) => {
    if (!selectedRepo) return
    const repoKey = selectedRepo.fullName.toLowerCase()
    const localTasks = useSyncStore.getState().tasks.filter((t) => t.repoFullName.toLowerCase() === repoKey)
    const diff = computeImportDiff(localTasks, data.tasks)

    if (isAllZero(diff)) {
      // SHA changed but no meaningful task differences — silently update SHA
      setRepoSyncMeta(selectedRepo.fullName, {
        lastSyncedSha: data.sha ?? null,
        lastSyncAt: new Date().toISOString(),
      })
      return
    }

    setDiffSummary(diff)
    setImportPrompt({
      repoFullName: selectedRepo.fullName,
      tasks: data.tasks,
      sha: data.sha,
      source: 'remote-update',
    })
  })

  // Attempt remote import when switching repos and local is empty.
  useEffect(() => {
    if (!idbLoaded || !selectedRepo || !user || !isOnline) return

    const repoKey = selectedRepo.fullName.toLowerCase()
    if (importAttemptedRef.current.has(repoKey)) return
    importAttemptedRef.current.add(repoKey)
    setImportPrompt(null)

    const localRepoTasks = useSyncStore
      .getState()
      .tasks.filter((t) => t.repoFullName.toLowerCase() === repoKey)

    const shouldAutoImport = localRepoTasks.length === 0

    fetchRemoteTasksForRepo(selectedRepo.fullName, user.login).then((result) => {
      if (result.error || result.tasks.length === 0) return

      if (shouldAutoImport) {
        replaceTasksForRepo(selectedRepo.fullName, result.tasks)
        setRepoSyncMeta(selectedRepo.fullName, {
          lastSyncedSha: result.sha ?? null,
          lastSyncAt: new Date().toISOString(),
          conflict: null,
        })
      } else {
        setImportPrompt({
          repoFullName: selectedRepo.fullName,
          tasks: result.tasks,
          sha: result.sha ?? null,
        })
      }
    })
  }, [idbLoaded, isOnline, replaceTasksForRepo, selectedRepo, setRepoSyncMeta, user])

  useEffect(() => {
    setImportPrompt(null)
    setDiffSummary(null)
    setIsImporting(false)
    setBannerDismissed(false)
  }, [selectedRepo?.fullName])

  // Wrapped toggle with AC-compliant delay
  const handleToggleComplete = (taskId: string) => {
    // Add to pending set to freeze its section placement
    setPendingToggleIds((prev) => new Set(prev).add(taskId))
    
    // Toggle in store immediately for state integrity
    toggleComplete(taskId)

    // Remove from pending set after 500ms to allow section move
    setTimeout(() => {
      setPendingToggleIds((prev) => {
        const next = new Set(prev)
        next.delete(taskId)
        return next
      })
    }, 500)
  }

  // Soft-delete handlers
  const handleDeleteInitiated = useCallback((taskId: string) => {
    // If there's already a pending delete, finalize it immediately
    if (pendingDelete) {
      removeTask(pendingDelete.task.id)
      clearTimeout(pendingDelete.timeoutId)
    }

    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    triggerSelectionHaptic()

    const timeoutId = setTimeout(() => {
      removeTask(taskId)
      setPendingDelete(null)
    }, 5000)

    setPendingDelete({ task, timeoutId })
  }, [pendingDelete, tasks, removeTask])

  const handleUndo = useCallback(() => {
    if (!pendingDelete) return
    clearTimeout(pendingDelete.timeoutId)
    setPendingDelete(null)
  }, [pendingDelete])

  // Derive selected task for detail sheet
  const selectedTask = useMemo(() => {
    if (!selectedTaskId) return null
    return tasks.find(t => t.id === selectedTaskId) ?? null
  }, [tasks, selectedTaskId])

  // Handle "Move to..." — close detail sheet, open repo picker in move mode
  const handleMoveToRepo = (taskId: string) => {
    setMoveTaskId(taskId)
    setSelectedTaskId(null)
    setShowRepoPicker(true)
  }

  // Handle repo selection — either for normal repo switch or task move
  const handleRepoPickerClose = () => {
    setShowRepoPicker(false)
    setMoveTaskId(null)
  }

  const handleRepoSelectedForMove = (repoFullName: string) => {
    if (moveTaskId) {
      moveTaskToRepo(moveTaskId, repoFullName)
      setToastMessage(`Task moved to ${repoFullName}`)
      setTimeout(() => setToastMessage(null), 2500)
      setMoveTaskId(null)
    }
  }

  // Filter tasks by selected repo — each repo has its own task list
  const repoTasks = useMemo(() => {
    if (!selectedRepo) return []
    const selectedLower = selectedRepo.fullName.toLowerCase()
    return tasks.filter((t) => t.repoFullName.toLowerCase() === selectedLower)
  }, [tasks, selectedRepo])

  const hasImportantTasks = useMemo(() => repoTasks.some((t) => t.isImportant), [repoTasks])

  // Reset priority filter when no important tasks exist
  useEffect(() => {
    if (!hasImportantTasks) {
      setPriorityFilter('all')
    }
  }, [hasImportantTasks])

  const fuse = useMemo(() => createTaskFuse(repoTasks), [repoTasks])

  const searchFilteredTasks = useMemo(() => {
    if (searchQuery.length < 1) return repoTasks
    return searchTasks(fuse, searchQuery)
  }, [fuse, searchQuery, repoTasks])

  const displayedTasks = useMemo(() => {
    if (priorityFilter === 'all') return searchFilteredTasks
    if (priorityFilter === 'important') return searchFilteredTasks.filter((t) => t.isImportant)
    return searchFilteredTasks.filter((t) => !t.isImportant)
  }, [searchFilteredTasks, priorityFilter])

  // Filter out soft-deleted task (pending undo) from display
  const visibleTasks = useMemo(() => {
    if (!pendingDelete) return displayedTasks
    return displayedTasks.filter(t => t.id !== pendingDelete.task.id)
  }, [displayedTasks, pendingDelete])

  // AC 1: Tasks move to completed section after a brief delay
  // We keep tasks in their "original" section if they are in pendingToggleIds
  const { active: activeTasks, completed: completedTasks } = useMemo(
    () => sortTasksForDisplay(visibleTasks, { pendingToggleIds, sortMode: currentSortMode }),
    [visibleTasks, pendingToggleIds, currentSortMode],
  )

  // Sync local drag order from store when not actively dragging
  useEffect(() => {
    if (!draggingTaskId) {
      setDragOrderedTasks(activeTasks)
    }
  }, [activeTasks, draggingTaskId])

  // Auto-expand completed section when search matches completed tasks; collapse when search clears
  useEffect(() => {
    if (searchQuery.length > 0 && completedTasks.length > 0) {
      if (!showCompleted) {
        setShowCompleted(true)
        setWasAutoExpanded(true)
      }
    } else if (searchQuery.length === 0 && wasAutoExpanded) {
      setShowCompleted(false)
      setWasAutoExpanded(false)
    }
  }, [searchQuery, completedTasks, wasAutoExpanded, showCompleted])

  const handleReorder = (reorderedTasks: Task[]) => {
    setDragOrderedTasks(reorderedTasks)
  }

  const handleDragStart = (taskId: string) => {
    setDraggingTaskId(taskId)
    dragStartOrderRef.current = dragOrderedTasks.map(t => t.id)
  }

  const handleDragEnd = () => {
    setDraggingTaskId(null)
    const startOrder = dragStartOrderRef.current
    dragStartOrderRef.current = null
    if (!selectedRepo) return
    const orderedIds = dragOrderedTasks.map(t => t.id)
    if (
      startOrder &&
      startOrder.length === orderedIds.length &&
      startOrder.every((id, idx) => id === orderedIds[idx])
    ) {
      return
    }
    reorderTasks(selectedRepo.fullName, orderedIds)
  }

  // Auto-scroll while dragging near the viewport edges
  useEffect(() => {
    if (!draggingTaskId) return

    const handlePointerMove = (event: PointerEvent) => {
      dragPointerYRef.current = event.clientY
    }

    window.addEventListener('pointermove', handlePointerMove)

    let rafId = 0
    const tick = () => {
      const y = dragPointerYRef.current
      if (typeof y === 'number') {
        const threshold = 80
        const viewportHeight = window.innerHeight
        let delta = 0
        if (y < threshold) {
          delta = -Math.min(16, Math.max(6, (threshold - y) / 4))
        } else if (y > viewportHeight - threshold) {
          delta = Math.min(16, Math.max(6, (y - (viewportHeight - threshold)) / 4))
        }
        if (delta !== 0) {
          window.scrollBy({ top: delta, behavior: 'auto' })
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      cancelAnimationFrame(rafId)
      dragPointerYRef.current = null
    }
  }, [draggingTaskId])

  // Determine which view to show
  const getViewKey = () => {
    if (!isAuthenticated) return 'auth'
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
              Gitty Tasks
            </h1>
            <button onClick={() => clearAuth()} className="btn-ghost mt-2">
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
          className="h-screen flex flex-col items-center overflow-hidden p-4"
        >
          <OfflineNotification
            visible={showOfflineNotification}
            onDismiss={dismissOfflineNotification}
          />

          <SyncConflictBanner />
          {importPrompt && (
            <SyncImportBanner
              repoFullName={importPrompt.repoFullName}
              remoteCount={importPrompt.tasks.length}
              isImporting={isImporting}
              variant={importPrompt.source === 'remote-update' ? 'remote-update' : 'initial-import'}
              diffSummary={diffSummary}
              onDismiss={() => { setImportPrompt(null); setDiffSummary(null) }}
              onImport={() => {
                if (isImporting || !importPrompt) return
                setIsImporting(true)
                // Capture feedback message before clearing diffSummary
                const feedbackMessage = diffSummary ? buildImportFeedbackMessage(diffSummary) : null
                if (importPrompt.source === 'remote-update') {
                  mergeRemoteTasksForRepo(importPrompt.repoFullName, importPrompt.tasks)
                } else {
                  replaceTasksForRepo(importPrompt.repoFullName, importPrompt.tasks)
                }
                const repoKey = importPrompt.repoFullName.toLowerCase()
                const currentRevision = useSyncStore.getState().repoSyncMeta[repoKey]?.localRevision ?? 0
                setRepoSyncMeta(importPrompt.repoFullName, {
                  lastSyncedSha: importPrompt.sha ?? null,
                  lastSyncedRevision: currentRevision,
                  lastSyncAt: new Date().toISOString(),
                  conflict: null,
                })
                clearRepoConflict(importPrompt.repoFullName)
                setImportPrompt(null)
                setDiffSummary(null)
                setIsImporting(false)
                // Show post-import confirmation toast
                if (feedbackMessage) {
                  if (syncToastTimerRef.current) clearTimeout(syncToastTimerRef.current)
                  setSyncResultMessage(feedbackMessage)
                  syncToastTimerRef.current = setTimeout(() => setSyncResultMessage(null), 2500)
                }
              }}
            />
          )}

          <AppHeader isOnline={isOnline} onChangeRepo={() => setShowRepoPicker(true)} onOpenSettings={() => setShowSettings(true)} />

          <main className="relative flex w-full flex-1 flex-col items-center overflow-y-auto overflow-x-hidden" {...pullHandlers}>

            <div className="w-full max-w-[640px] px-4">
              <BranchProtectionBanner
                visible={(syncErrorType === 'branch-protection' || !!fallbackBranch) && !bannerDismissed}
                fallbackBranch={fallbackBranch}
                onDismiss={() => setBannerDismissed(true)}
                onSwitchRepo={() => setShowRepoPicker(true)}
                onChangeBranch={() => setShowBranchPrompt(true)}
              />
            </div>

            {/* Search bar */}
            {repoTasks.length > 0 && (
              <div className="mt-4 w-full max-w-[640px] px-2">
                <TaskSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  taskCount={repoTasks.length}
                />
              </div>
            )}

            {/* Filter/sort toolbar — show when 5+ tasks */}
            {repoTasks.length > 4 && (
              <div className="mt-2 w-full max-w-[640px] px-2">
                <div className="flex items-center gap-2 overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {hasImportantTasks && (
                    <PriorityFilterPills
                      currentFilter={priorityFilter}
                      onChange={setPriorityFilter}
                    />
                  )}
                  <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                    {currentSortMode !== 'manual' && (
                      <span className="text-label" style={{ color: 'var(--color-text-secondary)', opacity: 0.6 }}>
                        Manual reorder disabled
                      </span>
                    )}
                    <SortModeSelector
                      currentMode={currentSortMode}
                      onChange={(mode) => {
                        if (selectedRepo) setRepoSortMode(selectedRepo.fullName, mode)
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Pull to refresh indicator — inline above task list */}
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isPullRefreshing}
              threshold={80}
              result={pullToRefreshResult}
            />

            {/* Task list */}
            {repoTasks.length > 0 ? (
              <div className="mt-2 w-full max-w-[640px] px-2">
                {/* Active tasks */}
                {activeTasks.length > 0 ? (
                  currentSortMode === 'manual' ? (
                    <Reorder.Group
                      axis="y"
                      values={dragOrderedTasks}
                      onReorder={handleReorder}
                      className="flex flex-col gap-0"
                      data-testid="task-list"
                      aria-label="Reorder tasks"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {dragOrderedTasks.map((task) => (
                          <DraggableTaskCard
                            key={task.id}
                            task={task}
                            onTap={(taskId) => setSelectedTaskId(taskId)}
                            onComplete={handleToggleComplete}
                            isNewest={newestTaskId === task.id}
                            isDimmed={draggingTaskId !== null && draggingTaskId !== task.id}
                            onDragStart={() => handleDragStart(task.id)}
                            onDragEnd={handleDragEnd}
                          />
                        ))}
                      </AnimatePresence>
                    </Reorder.Group>
                  ) : (
                    <motion.ul
                      className="flex flex-col gap-0 list-none p-0 m-0"
                      data-testid="task-list"
                      aria-label="Task list"
                      variants={listContainerVariants}
                      initial="initial"
                      animate="animate"
                    >
                      <AnimatePresence mode="popLayout" initial={false}>
                        {activeTasks.map((task) => (
                          <motion.li key={task.id} layout variants={listItemVariants}>
                            <TaskCard
                              task={task}
                              onTap={(taskId) => setSelectedTaskId(taskId)}
                              onComplete={handleToggleComplete}
                              isNewest={newestTaskId === task.id}
                            />
                          </motion.li>
                        ))}
                      </AnimatePresence>
                    </motion.ul>
                  )
                ) : displayedTasks.length === 0 ? (
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
                ) : null}

                {/* Completed section */}
                {completedTasks.length > 0 && (
                  <div className="mt-4">
                    <button
                      onClick={() => {
                        setShowCompleted(!showCompleted)
                        setWasAutoExpanded(false)
                      }}
                      className="flex items-center gap-2 py-2 w-full"
                      aria-expanded={showCompleted}
                      aria-controls="completed-task-list"
                      data-testid="completed-section-header"
                    >
                      <motion.svg
                        animate={{ rotate: showCompleted ? 90 : 0 }}
                        transition={TRANSITION_FAST}
                        width="16"
                        height="16"
                        viewBox="0 0 12 12"
                      >
                        <path d="M4 2L8 6L4 10" stroke="var(--color-text-secondary)" strokeWidth="1.5" fill="none" />
                      </motion.svg>
                      <span
                        className="text-label uppercase tracking-wider"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        Completed ({completedTasks.length})
                      </span>
                    </button>
                    <AnimatePresence mode="popLayout" initial={false}>
                      {showCompleted && (
                        <motion.div
                          id="completed-task-list"
                          className="flex flex-col gap-0"
                          variants={listContainerVariants}
                          initial="initial"
                          animate="animate"
                          exit={{ opacity: 0 }}
                        >
                          {completedTasks.map((task) => (
                            <motion.div key={task.id} layout variants={listItemVariants}>
                              <TaskCard
                                task={task}
                                onTap={(taskId) => setSelectedTaskId(taskId)}
                                onComplete={handleToggleComplete}
                                isNewest={newestTaskId === task.id}
                              />
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state */
              <motion.div
                className="mt-16 flex flex-col items-center gap-2 px-8 text-center"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                data-testid="empty-state"
              >
                <p className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Capture your first thought
                </p>
                <p className="text-body" style={{ color: 'var(--color-text-secondary)', opacity: 0.7 }}>
                  Tap + to get started
                </p>
              </motion.div>
            )}

          </main>

          <CreateTaskFAB onClick={() => setShowCreateSheet(true)} />
          <SyncFAB />

          {/* Branch fallback prompt */}
          <BranchFallbackPrompt
            visible={showBranchPrompt}
            defaultBranchName={fallbackBranch ?? `gitty/${user?.login ?? 'user'}`}
            onConfirm={handleBranchConfirm}
            onDismiss={() => setShowBranchPrompt(false)}
          />

          {/* Create task bottom sheet */}
          <AnimatePresence>
            {showCreateSheet && (
              <CreateTaskSheet
                onClose={() => setShowCreateSheet(false)}
                onTaskCreated={(taskId) => {
                  setNewestTaskId(taskId)
                  setTimeout(() => setNewestTaskId(null), 1500)
                }}
              />
            )}
          </AnimatePresence>

          {/* Task detail bottom sheet */}
          <AnimatePresence>
            {selectedTask && (
              <TaskDetailSheet
                task={selectedTask}
                onClose={() => setSelectedTaskId(null)}
                onUpdate={updateTask}
                onToggleComplete={(taskId) => {
                  handleToggleComplete(taskId)
                }}
                onMoveToRepo={handleMoveToRepo}
                onDelete={handleDeleteInitiated}
              />
            )}
          </AnimatePresence>

          {/* Repo picker bottom sheet */}
          <AnimatePresence>
            {showRepoPicker && (
              <RepoPickerSheet
                onClose={handleRepoPickerClose}
                onRepoSelected={moveTaskId ? handleRepoSelectedForMove : undefined}
              />
            )}
          </AnimatePresence>

          {/* Undo toast for delete */}
          <AnimatePresence>
            {pendingDelete && (
              <UndoToast
                key="undo-toast"
                message="Task deleted"
                onUndo={handleUndo}
                onExpire={() => {
                  if (pendingDelete) {
                    removeTask(pendingDelete.task.id)
                    setPendingDelete(null)
                  }
                }}
              />
            )}
          </AnimatePresence>

          {/* Sync result toast */}
          <AnimatePresence>
            {syncResultMessage && (
              <SyncResultToast
                key="sync-result-toast"
                message={syncResultMessage}
                onDismiss={() => setSyncResultMessage(null)}
              />
            )}
          </AnimatePresence>

          {/* Toast for repo move feedback */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={TRANSITION_FAST}
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-lg text-body"
                style={{
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-primary)',
                }}
                data-testid="toast-message"
              >
                {toastMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Settings sheet */}
          <AnimatePresence>
            {showSettings && (
              <SettingsSheet
                onClose={() => setShowSettings(false)}
                onOpenRoadmap={() => setIsRoadmapOpen(true)}
                onOpenAbout={() => setShowAbout(true)}
              />
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

          {/* About Gitty overlay */}
          <AnimatePresence>
            {showAbout && (
              <div className="fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto bg-[var(--color-canvas)]">
                <AboutGittyView onClose={() => setShowAbout(false)} />
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
