import { motion, AnimatePresence } from 'framer-motion'
import { TRANSITION_NORMAL } from '../../../config/motion'

interface SyncImportBannerProps {
  repoFullName: string
  remoteCount: number
  isImporting: boolean
  onImport: () => void
  onDismiss: () => void
}

export function SyncImportBanner({ repoFullName, remoteCount, isImporting, onImport, onDismiss }: SyncImportBannerProps) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -24, opacity: 0 }}
        transition={TRANSITION_NORMAL}
        className="fixed left-0 right-0 top-24 z-40 px-4"
        data-testid="sync-import-banner"
      >
        <div
          className="mx-auto flex w-full max-w-[640px] flex-col gap-2 rounded-lg border px-4 py-3"
          style={{
            backgroundColor: 'rgba(56, 139, 253, 0.12)',
            borderColor: 'rgba(56, 139, 253, 0.35)',
          }}
        >
          <div className="flex flex-col gap-1">
            <span className="text-label font-semibold uppercase tracking-wider" style={{ color: 'var(--color-info)' }}>
              Import Available
            </span>
            <span className="text-body" style={{ color: 'var(--color-text-primary)' }}>
              {remoteCount} task{remoteCount === 1 ? '' : 's'} found in {repoFullName}.
            </span>
            <span className="text-caption" style={{ color: 'var(--color-text-secondary)' }}>
              Importing will overwrite your local list for this repo.
            </span>
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
              {isImporting ? 'Importing…' : 'Import'}
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
