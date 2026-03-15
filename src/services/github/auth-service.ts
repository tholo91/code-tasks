import { Octokit } from 'octokit'
import { throttling } from '@octokit/plugin-throttling'
import { retry } from '@octokit/plugin-retry'

export interface GitHubUser {
  login: string
  avatarUrl: string
  name: string | null
}

export type TokenValidationResult =
  | { valid: true; user: GitHubUser }
  | { valid: false; error: string }

const ThrottledOctokit = Octokit.plugin(throttling).plugin(retry)

let octokitInstance: Octokit | null = null

export function getOctokit(token: string): Octokit {
  if (!octokitInstance) {
    octokitInstance = new ThrottledOctokit({
      auth: token,
      throttle: {
        onRateLimit: (retryAfter: number, options: Record<string, string>, octokit: Octokit, retryCount: number) => {
          octokit.log.warn(
            `Request quota exhausted for request ${options.method} ${options.url}`,
          )

          if (retryCount < 1) {
            // only retry once
            octokit.log.info(`Retrying after ${retryAfter} seconds!`)
            return true
          }
        },
        onSecondaryRateLimit: (_retryAfter: number, options: Record<string, string>, octokit: Octokit) => {
          // does not retry, only logs a warning
          octokit.log.warn(
            `Secondary quota exhausted for request ${options.method} ${options.url}`,
          )
        },
      },
    })
  }
  return octokitInstance
}

export function getExistingOctokit(): Octokit | null {
  return octokitInstance
}

export function clearOctokitInstance() {
  octokitInstance = null
}

export async function getAuthenticatedUser(
  octokit: Octokit,
): Promise<GitHubUser> {
  const { data } = await octokit.rest.users.getAuthenticated()
  return {
    login: data.login,
    avatarUrl: data.avatar_url,
    name: data.name ?? null,
  }
}

export async function validateToken(
  token: string,
): Promise<TokenValidationResult> {
  if (!token.trim()) {
    return { valid: false, error: 'Token cannot be empty' }
  }

  try {
    const octokit = getOctokit(token)
    const user = await getAuthenticatedUser(octokit)
    return { valid: true, user }
  } catch (err) {
    clearOctokitInstance()
    const message =
      err instanceof Error ? err.message : 'Token validation failed'
    return { valid: false, error: message }
  }
}
