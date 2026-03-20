import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore, selectPendingSyncCount, selectHasUnsyncedChanges, selectSyncBranch } from '../../../stores/useSyncStore'
import { syncAllRepoTasks, classifySyncError } from '../../../services/github/sync-service'
import { triggerSelectionHaptic } from '../../../services/native/haptic-service'
import { TRANSITION_SPRING, TRANSITION_FAST, successFlash } from '../../../config/motion'

type FabState = 'pending' | 'syncing' | 'success' | 'error'

export function SyncFAB() {
  const hasUnsyncedChanges = useSyncStore(selectHasUnsyncedChanges)
  const pendingSyncCount = useSyncStore(selectPendingSyncCount)
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const repoSyncBranches = useSyncStore((s) => s.repoSyncBranches)
  const fallbackBranch = selectedRepo ? repoSyncBranches[selectedRepo.fullName.toLowerCase()] : null
  const isConflict = syncEngineStatus === 'conflict'

  const [fabState, setFabState] = useState<FabState>('pending')
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Show FAB when there are unsynced changes (or during success/error animation)
  const isVisible = (hasUnsyncedChanges && !isConflict) || fabState === 'success' || fabState === 'error'

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
    }
  }, [])

  // Reset fabState to pending when new changes appear (e.g., after success fade or on fresh changes)
  // Do NOT reset during syncing, success animation, or error state
  useEffect(() => {
    if (hasUnsyncedChanges && fabState !== 'syncing' && fabState !== 'success' && fabState !== 'error') {
      setFabState('pending')
    }
  }, [hasUnsyncedChanges, fabState])

  const handleSync = useCallback(async () => {
    if (fabState === 'syncing' || fabState === 'success') return
    setFabState('syncing')

    const { setSyncStatus, updateLastSyncedAt } = useSyncStore.getState()
    setSyncStatus('syncing')

    try {
      const syncOptions: { maxRetries: number; branch?: string } = { maxRetries: 2 }
      if (fallbackBranch) syncOptions.branch = fallbackBranch
      const result = await syncAllRepoTasks(syncOptions)
      if (result.status === 'conflict') {
        setSyncStatus('conflict', result.error)
        setFabState('pending')
      } else if (result.error) {
        setSyncStatus('error', result.error, result.errorType)
        setFabState('error')
      } else {
        setSyncStatus('success')
        updateLastSyncedAt()
        setFabState('success')
        triggerSelectionHaptic()

        // Hold checkmark for 2s, then let it fade
        successTimerRef.current = setTimeout(() => {
          setFabState('pending')
        }, 2000)
      }
    } catch (err) {
      const classified = classifySyncError(err)
      setSyncStatus('error', classified.message, classified.errorType)
      setFabState('error')
    }
  }, [fabState])

  if (!isVisible) return null

  const isDisabled = fabState === 'syncing' || fabState === 'success'

  const bgColor = (() => {
    switch (fabState) {
      case 'syncing': return 'rgba(56, 139, 253, 0.85)'
      case 'success': return 'var(--color-success)'
      case 'error': return '#f85149'
      default: return 'var(--color-info)'
    }
  })()

  return (
    <motion.button
      key="sync-fab"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: 1,
        scale: fabState === 'pending' ? [1, 1.06, 1] : 1,
        x: fabState === 'error' ? [0, -6, 6, -4, 4, 0] : 0,
        backgroundColor: bgColor,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{
        ...TRANSITION_SPRING,
        scale: fabState === 'pending'
          ? { repeat: Infinity, duration: 2.5, ease: 'easeInOut' }
          : { duration: 0.2 },
        x: fabState === 'error'
          ? { duration: 0.4 }
          : { duration: 0 },
        backgroundColor: { duration: 0.2 },
      }}
      onClick={handleSync}
      disabled={isDisabled}
      className="fixed z-50 flex items-center justify-center rounded-full shadow-lg"
      style={{
        bottom: 96,
        right: 24,
        width: 56,
        height: 56,
        color: '#ffffff',
        border: 'none',
        cursor: isDisabled ? 'default' : 'pointer',
      }}
      data-testid="sync-fab"
      aria-label={
        fabState === 'syncing'
          ? 'Syncing tasks to GitHub'
          : fabState === 'success'
            ? 'Sync complete'
            : fabState === 'error'
              ? 'Sync failed — tap to retry'
              : `Sync ${pendingSyncCount} pending task${pendingSyncCount !== 1 ? 's' : ''} to GitHub`
      }
    >
      <AnimatePresence mode="wait">
        {fabState === 'syncing' && <SyncSpinner key="spinner" />}
        {fabState === 'success' && <SuccessCheckmark key="checkmark" />}
        {(fabState === 'pending' || fabState === 'error') && <SyncIcon key="sync" />}
      </AnimatePresence>
      {fabState === 'pending' && pendingSyncCount > 0 && (
        <span
          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-xs font-bold"
          style={{
            width: 22,
            height: 22,
            backgroundColor: '#f85149',
            color: '#ffffff',
            fontSize: 11,
          }}
          data-testid="sync-badge"
        >
          {pendingSyncCount}
        </span>
      )}
    </motion.button>
  )
}

function SyncIcon() {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION_FAST}
      width="24" height="24" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"
    >
      <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
    </motion.svg>
  )
}

function SyncSpinner() {
  return (
    <motion.svg
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION_FAST}
      className="animate-spin"
      width="24"
      height="24"
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      data-testid="sync-spinner"
    >
      <path d="M1.705 8.005a.75.75 0 0 1 .834.656 5.5 5.5 0 0 0 9.592 2.97l-1.204-1.204a.25.25 0 0 1 .177-.427h3.646a.25.25 0 0 1 .25.25v3.646a.25.25 0 0 1-.427.177l-1.38-1.38A7.002 7.002 0 0 1 1.05 8.84a.75.75 0 0 1 .656-.834ZM8 2.5a5.487 5.487 0 0 0-4.131 1.869l1.204 1.204A.25.25 0 0 1 4.896 6H1.25A.25.25 0 0 1 1 5.75V2.104a.25.25 0 0 1 .427-.177l1.38 1.38A7.002 7.002 0 0 1 14.95 7.16a.75.75 0 0 1-1.49.178A5.5 5.5 0 0 0 8 2.5Z" />
    </motion.svg>
  )
}

function SuccessCheckmark() {
  return (
    <motion.svg
      variants={successFlash}
      initial="initial"
      animate="animate"
      exit="exit"
      width="24" height="24" viewBox="0 0 16 16" fill="currentColor"
      aria-hidden="true"
      data-testid="sync-checkmark"
    >
      <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
    </motion.svg>
  )
}
