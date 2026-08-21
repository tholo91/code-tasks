import { useCallback, useEffect, useState } from 'react'
import { useSyncStore } from '../../../stores/useSyncStore'
import { getAgentConnectPreview, isAgentConnected, prepareAgentConnectBranch } from '../../../services/github/sync-service'

export function AgentConnectCard() {
  const selectedRepo = useSyncStore((state) => state.selectedRepo)
  const user = useSyncStore((state) => state.user)
  const repoSyncBranches = useSyncStore((state) => state.repoSyncBranches)
  const repoSyncMeta = useSyncStore((state) => state.repoSyncMeta)
  const setRepoSyncMeta = useSyncStore((state) => state.setRepoSyncMeta)
  const [showPreview, setShowPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [compareUrl, setCompareUrl] = useState<string | null>(null)

  const key = selectedRepo?.fullName.toLowerCase() ?? ''
  const captureBranch = key ? repoSyncBranches?.[key] ?? selectedRepo?.defaultBranch : undefined
  const meta = key ? repoSyncMeta?.[key] : undefined
  const setupState = meta?.setupState ?? 'unconfigured'
  const ready = setupState === 'ready'

  const verify = useCallback(async () => {
    if (!selectedRepo || !user || !captureBranch || meta?.setupState !== 'connect-pending') return
    try {
      const connected = await isAgentConnected({
        repo: selectedRepo.fullName,
        defaultBranch: selectedRepo.defaultBranch,
        captureBranch,
        username: user.login,
      })
      if (connected) {
        setRepoSyncMeta(selectedRepo.fullName, { setupState: 'ready' })
        setError(null)
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify agent setup')
    }
  }, [selectedRepo, user, captureBranch, meta?.setupState, setRepoSyncMeta])

  useEffect(() => {
    void verify()
    const onResume = () => {
      if (document.visibilityState === 'visible') void verify()
    }
    document.addEventListener('visibilitychange', onResume)
    return () => document.removeEventListener('visibilitychange', onResume)
  }, [verify])

  if (!selectedRepo || !user || !captureBranch || setupState === 'unconfigured') return null

  const connect = async () => {
    const compareWindow = window.open('about:blank', '_blank')
    setBusy(true)
    setError(null)
    try {
      const result = await prepareAgentConnectBranch({
        repo: selectedRepo.fullName,
        defaultBranch: selectedRepo.defaultBranch,
        captureBranch,
        username: user.login,
      })
      setRepoSyncMeta(selectedRepo.fullName, { setupState: 'connect-pending' })
      setCompareUrl(result.compareUrl)
      if (compareWindow) {
        compareWindow.opener = null
        compareWindow.location.href = result.compareUrl
      } else {
        setError('Setup branch ready. Open the GitHub Compare link below.')
      }
    } catch (cause) {
      compareWindow?.close()
      setError(cause instanceof Error ? cause.message : 'Could not prepare the setup branch')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mx-auto mt-3 w-full max-w-[640px] rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <p className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-accent)' }}>Connect the loop</p>
      <div className="mt-3 grid gap-2 text-body">
        <Gate done label="GitHub connected" />
        <Gate done label="Inbox branch ready" />
        <Gate done={ready} label="Coding agent connected" />
      </div>
      {!ready && (
        <div className="mt-4">
          <button type="button" className="btn-ghost" onClick={() => setShowPreview((value) => !value)}>
            {showPreview ? 'Hide setup preview' : 'Preview agent setup'}
          </button>
          {showPreview && (
            <pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap rounded-lg p-3 text-xs" style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}>
              {getAgentConnectPreview(user.login, captureBranch)}
            </pre>
          )}
          <button type="button" className="btn-primary mt-3" disabled={busy} onClick={() => void connect()}>
            {busy ? 'Preparing branch…' : setupState === 'connect-pending' ? 'Open compare again' : 'Create setup branch'}
          </button>
          <p className="mt-2 text-label" style={{ color: 'var(--color-text-secondary)' }}>
            Review the exact Gitty block, then merge it through GitHub Compare. Existing AGENTS.md and CLAUDE.md content stays intact.
          </p>
          {error && <p className="mt-2 text-label" style={{ color: 'var(--color-danger)' }}>{error}</p>}
          {compareUrl && (
            <a className="mt-3 inline-flex text-label underline" href={compareUrl} target="_blank" rel="noopener noreferrer">
              Open GitHub Compare
            </a>
          )}
        </div>
      )}
    </section>
  )
}

function Gate({ done, label }: { done: boolean; label: string }) {
  return <div className="flex items-center gap-2"><span aria-hidden="true">{done ? '✓' : '○'}</span><span>{label}</span></div>
}
