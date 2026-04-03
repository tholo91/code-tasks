import { useState } from 'react'
import { motion } from 'framer-motion'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { useSyncStore, selectSyncBranch, selectRepoSkipCi } from '../../../stores/useSyncStore'
import { TRANSITION_FAST } from '../../../config/motion'

interface RepoSettingsSheetProps {
  onClose: () => void
}

/**
 * Per-repo settings sheet — branch strategy and deployment guard.
 * Accessible from the global settings menu when a repo is selected.
 */
export function RepoSettingsSheet({ onClose }: RepoSettingsSheetProps) {
  const selectedRepo = useSyncStore((s) => s.selectedRepo)
  const setRepoSyncBranch = useSyncStore((s) => s.setRepoSyncBranch)
  const setRepoSkipCi = useSyncStore((s) => s.setRepoSkipCi)
  const user = useSyncStore((s) => s.user)

  const repoFullName = selectedRepo?.fullName ?? ''
  const currentBranch = useSyncStore(repoFullName ? selectSyncBranch(repoFullName) : () => null)
  const currentSkipCi = useSyncStore(repoFullName ? selectRepoSkipCi(repoFullName) : () => false)

  const [branchMode, setBranchMode] = useState<'default' | 'custom'>(currentBranch ? 'custom' : 'default')
  const [branchName, setBranchName] = useState(currentBranch ?? `gitty/${user?.login ?? 'user'}`)
  const [skipCi, setSkipCi] = useState(currentSkipCi)

  if (!selectedRepo) return null

  const repoShortName = repoFullName.split('/').pop() ?? repoFullName

  const handleSave = () => {
    // Save branch setting
    if (branchMode === 'custom' && branchName.trim()) {
      setRepoSyncBranch(repoFullName, branchName.trim())
    } else {
      setRepoSyncBranch(repoFullName, null)
    }

    // Save skip-ci setting
    setRepoSkipCi(repoFullName, skipCi)

    onClose()
  }

  return (
    <BottomSheet
      onClose={onClose}
      ariaLabel="Repository settings"
      testId="repo-settings-sheet"
    >
      <div className="flex flex-col gap-5 pt-3">
        {/* Title */}
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
          <div>
            <h3 className="text-title font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Repo Settings
            </h3>
            <p className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
              {repoShortName}
            </p>
          </div>
        </div>

        {/* ── Branch Strategy ── */}
        <div className="flex flex-col gap-2">
          <label className="text-label font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            Sync Branch
          </label>

          {/* Default branch option */}
          <button
            type="button"
            onClick={() => setBranchMode('default')}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left min-h-[44px]"
            style={{
              backgroundColor: branchMode === 'default' ? 'rgba(56, 139, 253, 0.1)' : 'var(--color-bg)',
              border: `1px solid ${branchMode === 'default' ? 'var(--color-info)' : 'var(--color-border)'}`,
            }}
            data-testid="branch-mode-default"
          >
            <RadioDot selected={branchMode === 'default'} />
            <div className="flex flex-col">
              <span className="text-body font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Default branch
              </span>
              <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                Push to main/master directly
              </span>
            </div>
          </button>

          {/* Custom branch option */}
          <button
            type="button"
            onClick={() => setBranchMode('custom')}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left min-h-[44px]"
            style={{
              backgroundColor: branchMode === 'custom' ? 'rgba(56, 139, 253, 0.1)' : 'var(--color-bg)',
              border: `1px solid ${branchMode === 'custom' ? 'var(--color-info)' : 'var(--color-border)'}`,
            }}
            data-testid="branch-mode-custom"
          >
            <RadioDot selected={branchMode === 'custom'} />
            <div className="flex flex-col">
              <span className="text-body font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Dedicated branch
              </span>
              <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
                Push to a separate branch (e.g. for protected repos)
              </span>
            </div>
          </button>

          {/* Branch name input — only visible when custom is selected */}
          <motion.div
            initial={false}
            animate={{
              height: branchMode === 'custom' ? 'auto' : 0,
              opacity: branchMode === 'custom' ? 1 : 0,
            }}
            transition={TRANSITION_FAST}
            style={{ overflow: 'hidden' }}
          >
            <input
              type="text"
              value={branchName}
              onChange={(e) => setBranchName(e.target.value)}
              placeholder="gitty/tasks"
              className="w-full rounded-lg px-3 py-2.5 text-body mt-1"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
              }}
              data-testid="branch-name-input"
              autoComplete="off"
              spellCheck={false}
            />
          </motion.div>
        </div>

        {/* ── Skip CI Toggle ── */}
        <div
          className="flex items-center justify-between rounded-lg px-3 py-3 min-h-[44px]"
          style={{
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
          }}
        >
          <div className="flex flex-col gap-0.5 pr-3">
            <span className="text-body font-medium" style={{ color: 'var(--color-text-primary)' }}>
              Skip CI
            </span>
            <span className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
              Add [skip ci] to commit messages
            </span>
          </div>
          <ToggleSwitch
            checked={skipCi}
            onChange={setSkipCi}
            testId="skip-ci-toggle"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full rounded-lg py-2.5 text-body font-medium"
          style={{
            backgroundColor: 'var(--color-info)',
            color: '#ffffff',
          }}
          data-testid="repo-settings-save"
        >
          Save
        </button>
      </div>
    </BottomSheet>
  )
}

/** Simple radio dot indicator */
function RadioDot({ selected }: { selected: boolean }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full"
      style={{
        width: 20,
        height: 20,
        border: `2px solid ${selected ? 'var(--color-info)' : 'var(--color-border)'}`,
      }}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="rounded-full"
          style={{
            width: 10,
            height: 10,
            backgroundColor: 'var(--color-info)',
          }}
        />
      )}
    </div>
  )
}

/** iOS-style toggle switch */
function ToggleSwitch({
  checked,
  onChange,
  testId,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  testId?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative flex-shrink-0 rounded-full transition-colors"
      style={{
        width: 44,
        height: 24,
        backgroundColor: checked ? 'var(--color-info)' : 'var(--color-border)',
      }}
      data-testid={testId}
    >
      <motion.div
        animate={{ x: checked ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className="absolute top-0.5 left-0.5 rounded-full"
        style={{
          width: 20,
          height: 20,
          backgroundColor: '#ffffff',
        }}
      />
    </button>
  )
}
