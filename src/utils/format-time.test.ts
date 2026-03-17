import { describe, it, expect, vi, afterEach } from 'vitest'
import { formatTimeAgo } from './format-time'

describe('formatTimeAgo', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "just now" for timestamps less than 60 seconds ago', () => {
    const tenSecsAgo = new Date(Date.now() - 10_000).toISOString()
    expect(formatTimeAgo(tenSecsAgo)).toBe('just now')
  })

  it('returns "just now" for future timestamps', () => {
    const future = new Date(Date.now() + 60_000).toISOString()
    expect(formatTimeAgo(future)).toBe('just now')
  })

  it('returns minutes ago for 1-59 minutes', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    expect(formatTimeAgo(fiveMinAgo)).toBe('5m ago')
  })

  it('returns hours ago for 1-23 hours', () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(threeHoursAgo)).toBe('3h ago')
  })

  it('returns days ago for 1-29 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(twoDaysAgo)).toBe('2d ago')
  })

  it('returns months ago for 30+ days', () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60_000).toISOString()
    expect(formatTimeAgo(sixtyDaysAgo)).toBe('2mo ago')
  })
})
