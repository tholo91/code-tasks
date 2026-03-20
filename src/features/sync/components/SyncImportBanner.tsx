import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { TRANSITION_NORMAL } from '../../../config/motion'
import type { ImportDiffSummary } from '../../../utils/task-diff'

interface SyncImportBannerProps {
  repoFullName: string
  remoteCount: number
  isImporting: boolean
  variant?: 'initial-import' | 'remote-update'
  diffSummary?: ImportDiffSummary | null
  onImport: () => void
  onDismiss: () => void
}

function buildPrimaryLine(diff: ImportDiffSummary): string {
  if (diff.completedByAgent > 0) {
    return `Agent completed ${diff.completedByAgent} task${diff.completedByAgent === 1 ? '' : 's'}`
  }
  if (diff.updatedWithNotes > 0) {
    return `${diff.updatedWithNotes} task${diff.updatedWithNotes === 1 ? '' : 's'} updated with notes`
  }
  if (diff.newFromRemote > 0) {
    return `${diff.newFromRemote} new task${diff.newFromRemote === 1 ? '' : 's'} from remote`
  }
  return 'Remote changes detected'
}

export function SyncImportBanner({ repoFullName, remoteCount, isImporting, variant = 'initial-import', diffSummary, onImport, onDismiss }: SyncImportBannerProps) {
  const isRemoteUpdate = variant === 'remote-update'
  const shouldReduceMotion = useReducedMotion()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -24, opacity: 0 }}
        transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_NORMAL}
        className="fixed left-0 right-0 top-24 z-40 px-4"
        data-testid="sync-import-banner"
      >
        <div
          className="mx-auto flex w-full max-w-[640px] flex-col gap-2 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: '#162030',
            borderColor: 'rgba(56, 139, 253, 0.6)',
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-info)' }}>
              {isRemoteUpdate ? 'Updates on main' : 'Import Available'}
            </span>
            {isRemoteUpdate ? (
              <>
                <span className="text-caption" style={{ color: 'var(--color-text-primary)' }}>
                  {diffSummary ? buildPrimaryLine(diffSummary) : 'New updates available from remote.'}
                </span>
                {diffSummary && diffSummary.localSafeCount > 0 && (
                  <span className="text-caption" style={{ color: 'var(--color-success)' }}>
                    {`Your ${diffSummary.localSafeCount} new idea${diffSummary.localSafeCount === 1 ? ' is' : 's are'} safe`}
                  </span>
                )}
              </>
            ) : (
              <>
                <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
                  {`${remoteCount} task${remoteCount === 1 ? '' : 's'} found in ${repoFullName}.`}
                </span>
                <span className="text-caption" style={{ color: 'var(--color-text-secondary)' }}>
                  Your local list is empty — this will load tasks from the remote file.
                </span>
              </>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            <button onClick={onDismiss} className="btn-ghost">
              Dismiss
            </button>
            <button
              onClick={onImport}
              disabled={isImporting}
              className="btn-primary"
              style={{ width: 'auto', minHeight: 36, paddingInline: 16 }}
            >
              {isImporting ? 'Importing…' : isRemoteUpdate ? 'Apply updates' : 'Load tasks'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
