import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SyncImportBanner } from './SyncImportBanner'
import type { ImportDiffSummary } from '../../../utils/task-diff'

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useReducedMotion: () => false,
}))

function makeDiff(overrides: Partial<ImportDiffSummary> = {}): ImportDiffSummary {
  return {
    completedByAgent: 0,
    updatedWithNotes: 0,
    processedByAdded: 0,
    archived: 0,
    newFromRemote: 0,
    localSafeCount: 0,
    ...overrides,
  }
}

const baseProps = {
  repoFullName: 'owner/repo',
  remoteCount: 5,
  isImporting: false,
  onImport: vi.fn(),
  onDismiss: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SyncImportBanner', () => {
  it('renders diff summary primary line when diffSummary is provided with remote-update variant', () => {
    render(
      <SyncImportBanner
        {...baseProps}
        variant="remote-update"
        diffSummary={makeDiff({ completedByAgent: 2 })}
      />
    )
    expect(screen.getByText('Agent completed 2 tasks')).toBeInTheDocument()
  })

  it('shows "Your N new ideas are safe" when localSafeCount > 0', () => {
    render(
      <SyncImportBanner
        {...baseProps}
        variant="remote-update"
        diffSummary={makeDiff({ completedByAgent: 1, localSafeCount: 3 })}
      />
    )
    expect(screen.getByText('Your 3 new ideas are safe')).toBeInTheDocument()
  })

  it('does not show safety line when localSafeCount is 0', () => {
    render(
      <SyncImportBanner
        {...baseProps}
        variant="remote-update"
        diffSummary={makeDiff({ completedByAgent: 1, localSafeCount: 0 })}
      />
    )
    expect(screen.queryByText(/new idea/)).not.toBeInTheDocument()
  })

  it('falls back to static text when diffSummary is null', () => {
    render(
      <SyncImportBanner
        {...baseProps}
        variant="remote-update"
        diffSummary={null}
      />
    )
    expect(screen.getByText('Want the latest status?')).toBeInTheDocument()
  })

  it('does not render diff summary for variant initial-import', () => {
    render(
      <SyncImportBanner
        {...baseProps}
        variant="initial-import"
        diffSummary={makeDiff({ completedByAgent: 5, localSafeCount: 3 })}
      />
    )
    expect(screen.queryByText(/Agent completed/)).not.toBeInTheDocument()
    expect(screen.queryByText(/new ideas are safe/)).not.toBeInTheDocument()
    // Should show normal initial import UI
    expect(screen.getByText(/5 tasks found in owner\/repo/)).toBeInTheDocument()
  })
})
