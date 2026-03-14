import type { Octokit } from 'octokit'
import type { Task } from '../../types/task'
import { recoverOctokit } from './octokit-provider'
import { useSyncStore } from '../../stores/useSyncStore'
import { buildFileContent } from '../../features/sync/utils/markdown-templates'

const MAX_CONFLICT_RETRIES = 3

/**
 * Returns the user-scoped file name for captured ideas.
 * Each user gets their own file to prevent merge conflicts in shared repos.
 * Format: `captured-ideas-{username}.md`
 */
export function getScopedFileName(username: string): string {
  return `captured-ideas-${username}.md`
}

interface FileContent {
  content: string
  sha: string
}

/**
 * Fetches the captured-ideas file from the selected repo.
 * Returns null if the file doesn't exist yet.
 */
async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
): Promise<FileContent | null> {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    })

    if ('content' in data && 'sha' in data) {
      const content = atob(data.content.replace(/\n/g, ''))
      return { content, sha: data.sha }
    }

    return null
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 404) {
      return null
    }
    throw err
  }
}

/**
 * Creates or updates the captured-ideas file with appended tasks.
 * Uses the Atomic Commit (Get-Modify-Set) pattern to prevent data loss.
 * Injects the AI-Ready header if the file is new or lacks it.
 */
async function commitTasks(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  tasks: Task[],
  username: string,
): Promise<void> {
  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    const existing = await getFileContent(octokit, owner, repo, filePath)

    const updatedContent = buildFileContent(
      existing?.content ?? null,
      tasks,
      username,
    )
    const sha = existing?.sha

    try {
      const commitParams: {
        owner: string
        repo: string
        path: string
        message: string
        content: string
        sha?: string
      } = {
        owner,
        repo,
        path: filePath,
        message: `sync: add ${tasks.length} captured idea${tasks.length > 1 ? 's' : ''} from code-tasks`,
        content: btoa(unescape(encodeURIComponent(updatedContent))),
      }

      if (sha) {
        commitParams.sha = sha
      }

      await octokit.rest.repos.createOrUpdateFileContents(commitParams)
      return // Success
    } catch (err: unknown) {
      if (
        err &&
        typeof err === 'object' &&
        'status' in err &&
        err.status === 409 &&
        attempt < MAX_CONFLICT_RETRIES - 1
      ) {
        // Conflict: re-fetch and retry
        continue
      }
      throw err
    }
  }

  throw new Error('Failed to commit after maximum conflict retries')
}

/**
 * Syncs all pending local tasks to GitHub.
 * Implements batched updates: one commit per sync cycle.
 *
 * Flow:
 * 1. Get pending tasks from store
 * 2. Recover Octokit instance
 * 3. Get-Modify-Set the captured-ideas file
 * 4. Mark tasks as synced in store
 */
export async function syncPendingTasks(): Promise<{
  syncedCount: number
  error?: string
}> {
  const { tasks, selectedRepo, user } = useSyncStore.getState()

  if (!selectedRepo || !user) {
    return { syncedCount: 0, error: 'No repo or user selected' }
  }

  const pendingTasks = tasks.filter(
    (t) => t.syncStatus === 'pending' && t.username === user.login,
  )

  if (pendingTasks.length === 0) {
    return { syncedCount: 0 }
  }

  const filePath = getScopedFileName(user.login)
  const [owner, repo] = selectedRepo.fullName.split('/')

  const octokit = await recoverOctokit()

  await commitTasks(octokit, owner, repo, filePath, pendingTasks, user.login)

  // Mark all synced tasks in store
  const { markTaskSynced } = useSyncStore.getState()
  for (const task of pendingTasks) {
    markTaskSynced(task.id, 0)
  }

  return { syncedCount: pendingTasks.length }
}

// Export for testing
export { getFileContent, commitTasks }
// Re-export getScopedFileName (already exported at definition)
