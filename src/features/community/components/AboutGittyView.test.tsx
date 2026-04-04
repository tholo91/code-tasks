import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AboutGittyView } from './AboutGittyView'

describe('AboutGittyView', () => {
  it('renders app name and tagline', () => {
    render(<AboutGittyView onClose={vi.fn()} />)
    expect(screen.getByText('Gitty Tasks')).toBeInTheDocument()
    expect(screen.getByText('Task capture for developers')).toBeInTheDocument()
  })

  it('renders "Star on GitHub" link with correct href and target', () => {
    render(<AboutGittyView onClose={vi.fn()} />)
    const link = screen.getByTestId('about-star-link')
    expect(link).toHaveAttribute('href', 'https://github.com/tholo91/code-tasks')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders "Report an Issue" link with correct href and target', () => {
    render(<AboutGittyView onClose={vi.fn()} />)
    const link = screen.getByTestId('about-report-link')
    expect(link).toHaveAttribute('href', 'https://github.com/tholo91/code-tasks/issues/new')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders close button and calls onClose when clicked', async () => {
    const onClose = vi.fn()
    render(<AboutGittyView onClose={onClose} />)
    const closeBtn = screen.getByTestId('about-close-button')
    expect(closeBtn).toBeInTheDocument()
    await userEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders version string', () => {
    render(<AboutGittyView onClose={vi.fn()} />)
    expect(screen.getByText(/^v\d+\.\d+$/)).toBeInTheDocument()
  })

  it('renders "Share Gitty" button', () => {
    render(<AboutGittyView onClose={vi.fn()} />)
    expect(screen.getByTestId('about-share-button')).toBeInTheDocument()
    expect(screen.getByText('Share Gitty')).toBeInTheDocument()
  })
})
