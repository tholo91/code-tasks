import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSyncStore } from '../../../stores/useSyncStore'
import { fetchRemoteTasksForRepo } from '../../../services/github/sync-service'
import type { Task } from '../../../types/task'
import { StorageService } from '../../../services/storage/storage-service'
import { TRANSITION_NORMAL } from '../../../config/motion'
import { generateUUID } from '../../../utils/uuid'

interface SyncConflictSheetProps {
  isOpen: boolean
  repoFullName: string
  username: string
  onClose: () => void
}

export function SyncConflictSheet({ isOpen, repoFullName, username, onClose }: SyncConflictSheetProps) {
  const tasks = useSyncStore((state) => state.tasks)
  const meta = useSyncStore((state) => state.repoSyncMeta[repoFullName.toLowerCase()])
  const branch = useSyncStore((state) => state.repoSyncBranches[repoFullName.toLowerCase()])
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const conflictIds = meta?.conflict?.taskIds ?? []
  const localById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
  const remoteById = useMemo(() => new Map(remoteTasks.map((task) => [task.id, task])), [remoteTasks])

  useEffect(() => {
    if (!isOpen) return
    Promise.resolve().then(() => {
      setLoading(true)
      setError(null)
    })
    fetchRemoteTasksForRepo(repoFullName, username, branch).then((result) => {
      setLoading(false)
      if (result.error) setError(result.error)
      else setRemoteTasks(result.tasks)
    })
  }, [isOpen, repoFullName, username, branch])

  const resolve = (taskId: string, choice: 'phone' | 'repo') => {
    const remote = remoteById.get(taskId)
    const state = useSyncStore.getState()
    if (!remote) return
    const key = repoFullName.toLowerCase()
    const local = state.tasks.find((task) => task.id === taskId)
    const isDeletion = !local && (state.repoTombstones[key] ?? []).some((tombstone) => tombstone.taskId === taskId)
    const remoteRevision = remote.captureRevision ?? remote.id
    const remaining = (state.repoSyncMeta[key]?.conflict?.taskIds ?? []).filter((id) => id !== taskId)

    useSyncStore.setState((current) => ({
      tasks: isDeletion && choice === 'repo'
        ? [...current.tasks, { ...remote, syncStatus: 'synced' as const }]
        : current.tasks.map((task) => {
            if (task.id !== taskId) return task
            if (choice === 'repo') return { ...remote, syncStatus: 'synced' as const }
            return {
              ...task,
              captureRevision: generateUUID(),
              syncStatus: 'pending' as const,
              handoffStatus: null,
              proofUrl: null,
              handledAt: null,
              processedBy: null,
            }
          }),
      repoTombstones: isDeletion
        ? {
            ...current.repoTombstones,
            [key]: choice === 'phone'
              ? (current.repoTombstones[key] ?? []).map((tombstone) =>
                  tombstone.taskId === taskId
                    ? { ...tombstone, captureRevision: remoteRevision }
                    : tombstone,
                )
              : (current.repoTombstones[key] ?? []).filter((tombstone) => tombstone.taskId !== taskId),
          }
        : current.repoTombstones,
    }))
    const resolvedTask = useSyncStore.getState().tasks.find((task) => task.id === taskId)
    if (resolvedTask) StorageService.persistTaskToIDB(resolvedTask).catch(() => {})
    state.setRepoSyncMeta(repoFullName, {
      conflict: remaining.length > 0 ? { ...state.repoSyncMeta[key].conflict!, taskIds: remaining } : null,
      deliveryState: remaining.length > 0 ? 'needs-attention' : 'queued',
    })
    if (remaining.length === 0) {
      state.setSyncStatus('idle')
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[120] flex items-end bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={TRANSITION_NORMAL} role="dialog" aria-modal="true" aria-label="Resolve sync conflicts">
          <div className="max-h-[86svh] w-full overflow-y-auto rounded-t-2xl p-6" style={{ background: 'var(--color-surface)' }}>
            <div className="mx-auto max-w-2xl">
              <h2 className="text-title font-semibold">Resolve each capture</h2>
              <p className="mt-1 text-body" style={{ color: 'var(--color-text-secondary)' }}>Only divergent captures need a choice. Other queued work in {repoFullName} stays untouched.</p>
              {loading && <p className="mt-5 text-body">Loading repository versions…</p>}
              {error && <p className="mt-5 text-body" style={{ color: 'var(--color-danger)' }}>{error}</p>}
              <div className="mt-5 grid gap-4">
                {conflictIds.map((taskId) => {
                  const local = localById.get(taskId)
                  const remote = remoteById.get(taskId)
                  return (
                    <article key={taskId} className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                      <h3 className="font-semibold">{local?.title ?? remote?.title ?? taskId}</h3>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <Version label="Phone" task={local} />
                        <Version label="Repository" task={remote} />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button className="btn-primary w-auto px-4" disabled={!remote} onClick={() => resolve(taskId, 'phone')}>Keep phone version</button>
                        <button className="btn-ghost" disabled={!remote} onClick={() => resolve(taskId, 'repo')}>Use repo version</button>
                      </div>
                    </article>
                  )
                })}
              </div>
              <button className="btn-ghost mt-5" onClick={onClose}>Close</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Version({ label, task }: { label: string; task?: Task }) {
  return <div className="rounded-lg p-3" style={{ background: 'var(--color-bg)' }}><p className="text-label font-semibold uppercase" style={{ color: 'var(--color-text-secondary)' }}>{label}</p><p className="mt-2 whitespace-pre-wrap text-body">{task ? `${task.title}${task.body ? `\n${task.body}` : ''}` : 'Not available'}</p></div>
}
