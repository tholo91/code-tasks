import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { AuthSkeleton } from './AuthSkeleton'

describe('AuthSkeleton', () => {
  it('renders loading state with accessible role', () => {
    render(<AuthSkeleton />)

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText('Gitty')).toBeInTheDocument()
    expect(screen.getByText('capture it. ship it.')).toBeInTheDocument()
  })
})
