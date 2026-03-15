import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateToken, getAuthenticatedUser, clearOctokitInstance } from './auth-service'

// Mock the Octokit module
const { MockOctokit } = vi.hoisted(() => {
  const mock = vi.fn().mockImplementation((opts: { auth: string }) => {
    const token = opts.auth
    return {
      log: {
        warn: vi.fn(),
        info: vi.fn(),
      },
      rest: {
        users: {
          getAuthenticated: vi.fn().mockImplementation(async () => {
            if (token === 'valid-token') {
              return {
                data: {
                  login: 'testuser',
                  avatar_url: 'https://avatars.githubusercontent.com/u/123',
                  name: 'Test User',
                },
              }
            }
            throw new Error('Bad credentials')
          }),
        },
      },
    }
  })
  
  // @ts-expect-error - mock doesn't match Octokit type exactly
  mock.plugin = vi.fn().mockReturnValue(mock)
  
  return { MockOctokit: mock }
})

vi.mock('octokit', () => ({
  Octokit: MockOctokit,
}))

describe('auth-service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearOctokitInstance()
  })

  describe('validateToken', () => {
    it('returns user data for a valid token', async () => {
      const result = await validateToken('valid-token')
      expect(result).toEqual({
        valid: true,
        user: {
          login: 'testuser',
          avatarUrl: 'https://avatars.githubusercontent.com/u/123',
          name: 'Test User',
        },
      })
    })

    it('returns invalid for a bad token', async () => {
      const result = await validateToken('bad-token')
      expect(result).toEqual({
        valid: false,
        error: expect.any(String),
      })
    })

    it('returns invalid for an empty token', async () => {
      const result = await validateToken('')
      expect(result).toEqual({
        valid: false,
        error: expect.any(String),
      })
    })
  })

  describe('getAuthenticatedUser', () => {
    it('returns user data from an Octokit instance', async () => {
      const { Octokit } = await import('octokit')
      const octokit = new Octokit({ auth: 'valid-token' })
      const user = await getAuthenticatedUser(octokit)
      expect(user).toEqual({
        login: 'testuser',
        avatarUrl: 'https://avatars.githubusercontent.com/u/123',
        name: 'Test User',
      })
    })
  })
})
