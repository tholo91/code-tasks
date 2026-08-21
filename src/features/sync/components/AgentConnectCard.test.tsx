import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSyncStore, type RepoSyncMeta } from '../../../stores/useSyncStore'
import { AgentConnectCard } from './AgentConnectCard'

const { mockPrepare, mockVerify, mockPreview } = vi.hoisted(() => ({
  mockPrepare: vi.fn(),
  mockVerify: vi.fn(),
  mockPreview: vi.fn((username: string, branch: string) => `${username}:${branch}`),
}))

vi.mock('../../../services/github/sync-service', () => ({
  prepareAgentConnectBranch: (...args: unknown[]) => mockPrepare(...args),
  isAgentConnected: (...args: unknown[]) => mockVerify(...args),
  getAgentConnectPreview: (...args: unknown[]) => mockPreview(...args),
}))
vi.mock('../../../services/storage/crypto-utils', () => ({ encryptData: vi.fn(), decryptData: vi.fn() }))

describe('AgentConnectCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockVerify.mockResolvedValue(false)
    mockPrepare.mockResolvedValue({
      setupBranch: 'gitty/connect-tholo91',
      compareUrl: 'https://github.com/owner/repo/compare/main...gitty/connect-tholo91',
      preview: 'preview',
    })
    useSyncStore.setState({
      user: { login: 'tholo91', avatarUrl: '', name: null },
      selectedRepo: { id: 1, fullName: 'owner/repo', owner: 'owner', defaultBranch: 'main' },
      repoSyncBranches: {},
      repoSyncMeta: { 'owner/repo': meta('inbox-ready') },
    })
  })

  it('supports agent setup when captures use the default branch', async () => {
    const user = userEvent.setup()
    render(<AgentConnectCard />)

    await user.click(screen.getByRole('button', { name: 'Preview agent setup' }))

    expect(screen.getByText('tholo91:main')).toBeInTheDocument()
  })

  it('opens a placeholder window synchronously before preparing the branch', async () => {
    const user = userEvent.setup()
    let resolvePrepare: (value: { setupBranch: string; compareUrl: string; preview: string }) => void = () => {}
    mockPrepare.mockReturnValueOnce(new Promise((resolve) => { resolvePrepare = resolve }))
    const popup = { opener: window, location: { href: 'about:blank' }, close: vi.fn() }
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(popup as unknown as Window)
    render(<AgentConnectCard />)

    await user.click(screen.getByRole('button', { name: 'Create setup branch' }))
    expect(openSpy).toHaveBeenCalledWith('about:blank', '_blank')

    resolvePrepare({
      setupBranch: 'gitty/connect-tholo91',
      compareUrl: 'https://github.com/owner/repo/compare/main...gitty/connect-tholo91',
      preview: 'preview',
    })
    await waitFor(() => expect(popup.location.href).toContain('/compare/'))
    openSpy.mockRestore()
  })

  it('shows verification failures instead of creating an unhandled rejection', async () => {
    mockVerify.mockRejectedValueOnce(new Error('GitHub unavailable'))
    useSyncStore.setState({ repoSyncMeta: { 'owner/repo': meta('connect-pending') } })

    render(<AgentConnectCard />)

    expect(await screen.findByText('GitHub unavailable')).toBeInTheDocument()
  })
})

function meta(setupState: RepoSyncMeta['setupState']): RepoSyncMeta {
  return {
    lastSyncedSha: 'sha',
    lastSyncAt: new Date().toISOString(),
    localRevision: 1,
    lastSyncedRevision: 1,
    conflict: null,
    setupState,
    deliveryState: 'in-repo',
    lastMutationKind: null,
    lastMutationAt: null,
    retryCount: 0,
    nextRetryAt: null,
  }
}
