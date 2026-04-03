import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ShareQRSheet } from './ShareQRSheet'

// Mock qrcode — return a deterministic data URL
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,MOCK_QR'),
  },
}))

describe('ShareQRSheet', () => {
  it('renders the sheet with title and tabs', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    expect(screen.getByText('Share Gitty')).toBeInTheDocument()
    expect(screen.getByTestId('share-tab-app')).toBeInTheDocument()
    expect(screen.getByTestId('share-tab-github')).toBeInTheDocument()
    // Wait for async QR generation to settle
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-app').querySelector('img')).toBeInTheDocument()
    })
  })

  it('defaults to the App tab selected', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    const appTab = screen.getByTestId('share-tab-app')
    expect(appTab).toHaveAttribute('aria-selected', 'true')
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-app').querySelector('img')).toBeInTheDocument()
    })
  })

  it('switches to GitHub tab on click', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    // Wait for initial QR generation
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-app').querySelector('img')).toBeInTheDocument()
    })
    const githubTab = screen.getByTestId('share-tab-github')
    await userEvent.click(githubTab)
    expect(githubTab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('share-tab-app')).toHaveAttribute('aria-selected', 'false')
  })

  it('renders QR code images after generation', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    await waitFor(() => {
      const qr = screen.getByTestId('share-qr-app')
      const img = qr.querySelector('img')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'data:image/png;base64,MOCK_QR')
    })
  })

  it('displays the App URL for the app tab', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    expect(screen.getByTestId('share-url-app')).toHaveTextContent('tholo91.github.io/code-tasks')
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-app').querySelector('img')).toBeInTheDocument()
    })
  })

  it('displays the GitHub URL after switching tab', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    // Wait for initial render to settle
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-app').querySelector('img')).toBeInTheDocument()
    })
    await userEvent.click(screen.getByTestId('share-tab-github'))
    // After tab switch, wait for the GitHub URL to appear
    await waitFor(() => {
      expect(screen.getByTestId('share-url-github')).toHaveTextContent('github.com/tholo91/code-tasks')
    })
  })

  it('copies URL to clipboard on copy button click', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })

    render(<ShareQRSheet onClose={vi.fn()} />)
    const copyBtn = screen.getByTestId('share-copy-button')
    await userEvent.click(copyBtn)

    expect(writeText).toHaveBeenCalledWith('https://tholo91.github.io/code-tasks/')
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument()
    })
  })

  it('renders the copy button', async () => {
    render(<ShareQRSheet onClose={vi.fn()} />)
    expect(screen.getByTestId('share-copy-button')).toBeInTheDocument()
    // Wait for async state to settle
    await waitFor(() => {
      expect(screen.getByTestId('share-qr-app').querySelector('img')).toBeInTheDocument()
    })
  })
})
