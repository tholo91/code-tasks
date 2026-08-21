import { useSyncStore } from '../../../stores/useSyncStore'

export function AutoSyncOptIn() {
  const selectedRepo = useSyncStore((state) => state.selectedRepo)
  const repoAutoSync = useSyncStore((state) => state.repoAutoSync)
  const setRepoAutoSync = useSyncStore((state) => state.setRepoAutoSync)
  if (!selectedRepo) return null
  const key = selectedRepo.fullName.toLowerCase()
  if (Object.prototype.hasOwnProperty.call(repoAutoSync ?? {}, key)) return null

  return (
    <section className="mx-auto mt-3 w-full max-w-[640px] rounded-xl border p-4" style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}>
      <h2 className="text-body font-semibold">Turn on automatic sync for this repository?</h2>
      <p className="mt-1 text-label" style={{ color: 'var(--color-text-secondary)' }}>Captures sync after 2–3 seconds; edits wait for 10 quiet seconds. Existing repositories stay manual until you opt in.</p>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-primary w-auto px-4" onClick={() => setRepoAutoSync(selectedRepo.fullName, true)}>Turn on</button>
        <button type="button" className="btn-ghost" onClick={() => setRepoAutoSync(selectedRepo.fullName, false)}>Keep manual</button>
      </div>
    </section>
  )
}
