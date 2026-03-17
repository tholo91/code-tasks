import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { syncPendingTasks } from '../../../services/github/sync-service'
import { TRANSITION_NORMAL } from '../../../config/motion'
import { SyncConflictSheet } from './SyncConflictSheet'

export function SyncConflictBanner() {
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const syncEngineStatus = useSyncStore((s) => s.syncEngineStatus)
  const syncError = useSyncStore((s) => s.syncError)
  const repoSyncMeta = useSyncStore((s) => s.repoSyncMeta)
  const clearRepoConflict = useSyncStore((s) => s.clearRepoConflict)
  const [isResolving, setIsResolving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!selectedRepo) return null
  const username = useSyncStore.getState().user?.login

  const repoKey = selectedRepo.fullName.toLowerCase()
  const conflict = repoSyncMeta[repoKey]?.conflict
  const isConflict = syncEngineStatus === 'conflict' || Boolean(conflict)

  const handleForceSync = useCallback(async () => {
    if (isResolving) return
    setIsResolving(true)

    const { setSyncStatus, updateLastSyncedAt } = useSyncStore.getState()
    setSyncStatus('syncing')

    try {
      const result = await syncPendingTasks({ allowConflict: true, maxRetries: 1 })
      if (result.error) {
        setSyncStatus('error', result.error)
      } else {
        clearRepoConflict(selectedRepo.fullName)
        setSyncStatus('success')
        updateLastSyncedAt()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      setSyncStatus('error', message)
    } finally {
      setIsResolving(false)
    }
  }, [clearRepoConflict, isResolving, selectedRepo?.fullName])

  return (
    <>
      <AnimatePresence>
        {isConflict && (
          <motion.div
            initial={{ y: -32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -32, opacity: 0 }}
            transition={TRANSITION_NORMAL}
            className="fixed left-0 right-0 top-12 z-40 px-4"
            data-testid="sync-conflict-banner"
          >
            <div
              className="mx-auto flex w-full max-w-[640px] flex-col gap-2 rounded-lg border px-4 py-3"
              style={{
                backgroundColor: 'rgba(248, 81, 73, 0.12)',
                borderColor: 'rgba(248, 81, 73, 0.4)',
              }}
            >
              <div className="flex flex-col gap-1">
                <span className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-danger)' }}>
                  Remote Changed
                </span>
                <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                  Sync paused for {selectedRepo.fullName}. {syncError ?? 'Review changes before syncing.'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-caption" style={{ color: 'var(--color-text-secondary)' }}>
                  Compare remote vs local before choosing a resolution.
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDetails(true)}
                    className="btn-primary"
                    style={{ width: 'auto', minHeight: 36, paddingInline: 16, backgroundColor: 'var(--color-warning)', color: '#1c2128' }}
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={handleForceSync}
                    disabled={isResolving}
                    className="btn-primary"
                    style={{ width: 'auto', minHeight: 36, paddingInline: 16, backgroundColor: 'var(--color-danger)' }}
                  >
                    {isResolving ? 'Syncing…' : 'Keep local'}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {isConflict && username && (
        <SyncConflictSheet
          isOpen={showDetails}
          repoFullName={selectedRepo.fullName}
          username={username}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  )
}
