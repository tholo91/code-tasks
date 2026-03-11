import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(document.body).toBeTruthy()
  })

  it('displays the app name', () => {
    render(<App />)
    expect(screen.getByText(/code-tasks/i)).toBeInTheDocument()
  })
})
