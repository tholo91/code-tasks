import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { fetchRemoteFileContent, fetchRemoteTasksForRepo, syncPendingTasks } from '../../../services/github/sync-service'
import { buildFileContent, parseTasksFromMarkdown } from '../utils/markdown-templates'
import { sortTasksForDisplay } from '../../../utils/task-sorting'
import { TRANSITION_NORMAL } from '../../../config/motion'

interface SyncConflictSheetProps {
  isOpen: boolean
  repoFullName: string
  username: string
  onClose: () => void
}

export function SyncConflictSheet({ isOpen, repoFullName, username, onClose }: SyncConflictSheetProps) {
  const tasks = useSyncStore((s) => s.tasks)
  const repoSyncMeta = useSyncStore((s) => s.repoSyncMeta)
  const replaceTasksForRepo = useSyncStore((s) => s.replaceTasksForRepo)
  const setRepoSyncMeta = useSyncStore((s) => s.setRepoSyncMeta)
  const clearRepoConflict = useSyncStore((s) => s.clearRepoConflict)
  const setSyncStatus = useSyncStore((s) => s.setSyncStatus)
  const updateLastSyncedAt = useSyncStore((s) => s.updateLastSyncedAt)

  const [remoteContent, setRemoteContent] = useState<string | null>(null)
  const [remoteError, setRemoteError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResolving, setIsResolving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    let active = true
    setIsLoading(true)
    setRemoteError(null)

    fetchRemoteFileContent(repoFullName, username).then((result) => {
      if (!active) return
      if (result.error) {
        setRemoteError(result.error)
      }
      setRemoteContent(result.content)
      setIsLoading(false)
    })

    return () => {
      active = false
    }
  }, [isOpen, repoFullName, username])

  const repoKey = repoFullName.toLowerCase()
  const localTasks = useMemo(
    () => tasks.filter((task) => task.repoFullName.toLowerCase() === repoKey),
    [tasks, repoKey],
  )
  const sortedTasks = useMemo(() => sortTasksForDisplay(localTasks).all, [localTasks])

  const localContent = useMemo(() => {
    try {
      return buildFileContent(remoteContent ?? null, sortedTasks, username)
    } catch {
      return buildFileContent(null, sortedTasks, username)
    }
  }, [remoteContent, sortedTasks, username])

  const remoteCount = useMemo(() => {
    if (!remoteContent) return 0
    return parseTasksFromMarkdown(remoteContent).length
  }, [remoteContent])

  const handleKeepLocal = async () => {
    if (isResolving) return
    setIsResolving(true)
    setSyncStatus('syncing')
    const fallbackBranch = selectSyncBranch(repoFullName)(useSyncStore.getState())
    try {
      const result = await syncPendingTasks({ 
        allowConflict: true, 
        maxRetries: 1,
        branch: fallbackBranch ?? undefined
      })
      if (result.error) {
        setSyncStatus('error', result.error)
      } else {
        clearRepoConflict(repoFullName)
        setSyncStatus('success')
        updateLastSyncedAt()
        onClose()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync failed'
      setSyncStatus('error', message)
    } finally {
      setIsResolving(false)
    }
  }

  const handleKeepRemote = async () => {
    if (isResolving) return
    setIsResolving(true)
    setSyncStatus('syncing')
    try {
      const result = await fetchRemoteTasksForRepo(repoFullName, username)
      if (result.error) {
        setSyncStatus('error', result.error)
        return
      }
      replaceTasksForRepo(repoFullName, result.tasks)
      const existingMeta = repoSyncMeta[repoKey]
      setRepoSyncMeta(repoFullName, {
        lastSyncedSha: result.sha ?? null,
        lastSyncAt: new Date().toISOString(),
        lastSyncedRevision: existingMeta?.localRevision ?? 0,
        conflict: null,
      })
      clearRepoConflict(repoFullName)
      setSyncStatus('success')
      updateLastSyncedAt()
      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      setSyncStatus('error', message)
    } finally {
      setIsResolving(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={TRANSITION_NORMAL}
          className="fixed inset-0 z-[120] flex flex-col items-center justify-end"
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Resolve sync conflict"
        >
          <div className="absolute inset-0 bg-black/50" />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="relative z-10 w-full max-w-4xl rounded-t-2xl p-6 pb-8"
            style={{ backgroundColor: 'var(--color-surface)' }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />

            <div className="flex flex-col gap-2">
              <h2 className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Resolve Sync Conflict
              </h2>
              <p className="text-body" style={{ color: 'var(--color-text-secondary)' }}>
                Compare the remote file against your local changes for {repoFullName}.
              </p>
              <div className="flex flex-wrap gap-3 text-caption" style={{ color: 'var(--color-text-secondary)' }}>
                <span>Local tasks: {sortedTasks.length}</span>
                <span>Remote tasks: {remoteCount}</span>
              </div>
            </div>

            {remoteError && (
              <div className="mt-3 rounded-md border px-3 py-2 text-caption" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>
                {remoteError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="flex flex-col gap-2">
                <span className="text-label uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Remote File (Current)
                </span>
                <div
                  className="h-[36vh] overflow-y-auto rounded-lg border p-3 text-caption"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  {isLoading ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>Loading remote content…</p>
                  ) : (
                    <pre className="whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                      {remoteContent ?? 'Remote file not found.'}
                    </pre>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-label uppercase tracking-wider" style={{ color: 'var(--color-text-secondary)' }}>
                  Local File (Will Be Pushed)
                </span>
                <div
                  className="h-[36vh] overflow-y-auto rounded-lg border p-3 text-caption"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'rgba(0,0,0,0.2)' }}
                >
                  <pre className="whitespace-pre-wrap" style={{ color: 'var(--color-text-primary)' }}>
                    {localContent}
                  </pre>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-caption" style={{ color: 'var(--color-text-secondary)' }}>
                Keep local will overwrite the remote file. Keep remote will discard local pending changes for this repo.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={onClose} className="btn-ghost">
                  Close
                </button>
                <button
                  onClick={handleKeepRemote}
                  disabled={isResolving}
                  className="btn-primary"
                  style={{ width: 'auto', minHeight: 36, paddingInline: 16, backgroundColor: 'var(--color-warning)', color: '#1c2128' }}
                >
                  Keep Remote
                </button>
                <button
                  onClick={handleKeepLocal}
                  disabled={isResolving}
                  className="btn-primary"
                  style={{ width: 'auto', minHeight: 36, paddingInline: 16 }}
                >
                  Keep Local
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
