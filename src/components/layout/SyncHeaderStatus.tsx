import { useState } from 'react'
import { useSyncStore } from '../../stores/useSyncStore'
import { formatTimeAgo } from '../../utils/format-time'
import { SyncStatusIcon } from '../ui/SyncStatusIcon'
import { BottomSheet } from '../ui/BottomSheet'
import { classifySyncError, getScopedFileName, syncRepo } from '../../services/github/sync-service'

export function SyncHeaderStatus() {
  const selectedRepo = useSyncStore((state) => state.selectedRepo)
  const repoSyncMeta = useSyncStore((state) => state.repoSyncMeta)
  const user = useSyncStore((state) => state.user)
  const branches = useSyncStore((state) => state.repoSyncBranches)
  const errors = useSyncStore((state) => state.repoSyncErrors)
  const [open, setOpen] = useState(false)
  const [retrying, setRetrying] = useState(false)
  if (!selectedRepo) return null

  const repoKey = selectedRepo.fullName.toLowerCase()
  const meta = repoSyncMeta?.[repoKey]
  const branch = branches?.[repoKey]
  const skipCi = useSyncStore.getState().repoSkipCi?.[repoKey] ?? true
  const delivery = meta?.deliveryState ?? 'local-only'
  const needsAttention = delivery === 'needs-attention'
  const label = delivery === 'syncing'
    ? 'Syncing'
    : delivery === 'in-repo' && meta?.lastSyncAt
      ? `In repo · ${formatTimeAgo(meta.lastSyncAt)}`
      : needsAttention
        ? 'Needs attention'
        : 'Saved on phone'
  const iconState = delivery === 'syncing'
    ? 'syncing'
    : delivery === 'in-repo'
      ? 'synced'
      : needsAttention
        ? 'error'
        : 'pending'

  const retry = async () => {
    setRetrying(true)
    const state = useSyncStore.getState()
    state.setRepoSyncMeta(selectedRepo.fullName, { deliveryState: 'syncing', nextRetryAt: null })
    state.setSyncStatus('syncing')
    try {
      const result = await syncRepo({
        repoFullName: selectedRepo.fullName,
        reason: 'retry',
        branch,
        skipCi,
        maxRetries: 2,
      })
      const latest = useSyncStore.getState()
      if (result.status === 'conflict') {
        latest.setRepoSyncMeta(selectedRepo.fullName, { deliveryState: 'needs-attention' })
        latest.setSyncStatus('conflict', result.error)
      } else if (result.error) {
        latest.setRepoSyncMeta(selectedRepo.fullName, { deliveryState: 'needs-attention' })
        latest.setRepoSyncError(selectedRepo.fullName, result.error, result.errorType ?? 'unknown', result.rawError)
        latest.setSyncStatus('error', result.error, result.errorType, result.rawError)
      } else {
        const stillQueued = latest.repoSyncMeta[repoKey]?.deliveryState === 'queued'
        latest.setRepoSyncMeta(selectedRepo.fullName, {
          deliveryState: stillQueued ? 'queued' : 'in-repo',
          retryCount: 0,
          nextRetryAt: null,
        })
        latest.clearRepoSyncError(selectedRepo.fullName)
        latest.setSyncStatus('success')
        latest.updateLastSyncedAt()
      }
    } catch (cause) {
      const failure = classifySyncError(cause)
      const latest = useSyncStore.getState()
      latest.setRepoSyncMeta(selectedRepo.fullName, { deliveryState: 'needs-attention' })
      latest.setRepoSyncError(selectedRepo.fullName, failure.message, failure.errorType, failure.rawError)
      latest.setSyncStatus('error', failure.message, failure.errorType, failure.rawError)
    } finally {
      setRetrying(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`badge cursor-pointer ${needsAttention ? 'badge-red' : delivery === 'in-repo' ? 'badge-green' : delivery === 'syncing' ? 'badge-blue' : 'badge-amber'}`}
        onClick={() => setOpen(true)}
        aria-label={`${label}. ${selectedRepo.fullName}`}
        data-testid="sync-header-status"
      >
        <SyncStatusIcon state={iconState} size={12} />
        {label}
      </button>
      {open && (
        <BottomSheet onClose={() => setOpen(false)} ariaLabel="Sync details">
          <div className="flex flex-col gap-4 pt-3 text-body">
            <h2 className="text-title font-semibold">Sync details</h2>
            <Detail label="Repository" value={selectedRepo.fullName} />
            <Detail label="Branch" value={branch ?? selectedRepo.defaultBranch} />
            <Detail label="File" value={getScopedFileName(user?.login ?? 'user')} />
            <Detail label="Last success" value={meta?.lastSyncAt ? formatTimeAgo(meta.lastSyncAt) : 'Not yet'} />
            <Detail label="Last error" value={errors?.[repoKey]?.error ?? 'None'} />
            <button type="button" className="btn-primary" disabled={retrying} onClick={() => void retry()}>{retrying ? 'Retrying…' : 'Retry now'}</button>
          </div>
        </BottomSheet>
      )}
    </>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div><p className="text-label" style={{ color: 'var(--color-text-secondary)' }}>{label}</p><p className="break-all font-mono text-sm">{value}</p></div>
}
