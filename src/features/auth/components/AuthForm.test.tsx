import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthForm } from './AuthForm'

// Mock auth-service
const mockValidateToken = vi.fn()
vi.mock('../../../services/github/auth-service', () => ({
  validateToken: (...args: unknown[]) => mockValidateToken(...args),
}))

// Mock useSyncStore
const mockSetAuth = vi.fn()
vi.mock('../../../stores/useSyncStore', () => ({
  useSyncStore: vi.fn((selector: (state: { setAuth: typeof mockSetAuth }) => unknown) =>
    selector({ setAuth: mockSetAuth }),
  ),
}))

// Mock onSuccess callback
const mockOnSuccess = vi.fn()

describe('AuthForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the auth form with token input and submit button (no passphrase)', () => {
    render(<AuthForm onSuccess={mockOnSuccess} />)
    expect(screen.getByLabelText(/personal access token/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/passphrase/i)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /authenticate/i })).toBeInTheDocument()
  })

  it('shows an error when submitting empty token', async () => {
    render(<AuthForm onSuccess={mockOnSuccess} />)
    const button = screen.getByRole('button', { name: /authenticate/i })
    await userEvent.click(button)
    expect(screen.getByRole('alert')).toHaveTextContent(/token cannot be empty/i)
  })

  it('calls validateToken and sets auth with token only (no passphrase)', async () => {
    mockValidateToken.mockResolvedValueOnce({
      valid: true,
      user: { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test' },
    })
    mockSetAuth.mockResolvedValueOnce(undefined)

    render(<AuthForm onSuccess={mockOnSuccess} />)

    const tokenInput = screen.getByLabelText(/personal access token/i)
    await userEvent.type(tokenInput, 'ghp_validtoken123')

    const button = screen.getByRole('button', { name: /authenticate/i })
    await userEvent.click(button)

    expect(mockValidateToken).toHaveBeenCalledWith('ghp_validtoken123')
    expect(mockSetAuth).toHaveBeenCalledWith(
      'ghp_validtoken123',
      { login: 'testuser', avatarUrl: 'https://example.com/avatar.png', name: 'Test' },
    )
    expect(mockOnSuccess).toHaveBeenCalled()
  })

  it('displays error message on invalid token', async () => {
    mockValidateToken.mockResolvedValueOnce({
      valid: false,
      error: 'Bad credentials',
    })

    render(<AuthForm onSuccess={mockOnSuccess} />)

    const tokenInput = screen.getByLabelText(/personal access token/i)
    await userEvent.type(tokenInput, 'bad-token')

    const button = screen.getByRole('button', { name: /authenticate/i })
    await userEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent(/bad credentials/i)
    expect(mockOnSuccess).not.toHaveBeenCalled()
  })

  it('displays network error gracefully', async () => {
    mockValidateToken.mockRejectedValueOnce(new Error('Network error'))

    render(<AuthForm onSuccess={mockOnSuccess} />)

    const tokenInput = screen.getByLabelText(/personal access token/i)
    await userEvent.type(tokenInput, 'some-token')

    const button = screen.getByRole('button', { name: /authenticate/i })
    await userEvent.click(button)

    expect(await screen.findByRole('alert')).toHaveTextContent(/network error/i)
  })

  it('shows help text about local-only encrypted storage', () => {
    render(<AuthForm onSuccess={mockOnSuccess} />)
    expect(screen.getByText(/stored locally on this device/i)).toBeInTheDocument()
    expect(screen.getAllByText(/encrypted at rest/i).length).toBeGreaterThan(0)
    expect(screen.queryByText(/passphrase/i)).not.toBeInTheDocument()
  })
})
