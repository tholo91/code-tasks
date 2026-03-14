import type { Octokit } from 'octokit'
import type { Task } from '../../types/task'
import { recoverOctokit } from './octokit-provider'
import { useSyncStore } from '../../stores/useSyncStore'

const MAX_CONFLICT_RETRIES = 3

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
 * Formats pending tasks as Markdown lines for appending to the captured-ideas file.
 */
function formatTasksAsMarkdown(tasks: Task[]): string {
  return tasks
    .map((task) => {
      const priority = task.isImportant ? '🔴 Important' : '⚪ Normal'
      const date = task.createdAt.split('T')[0]
      let line = `- [ ] **${task.title}** ([Created: ${date}]) (Priority: ${priority})`
      if (task.body) {
        line += `\n  ${task.body}`
      }
      return line
    })
    .join('\n')
}

/**
 * Creates or updates the captured-ideas file with appended tasks.
 * Uses the Atomic Commit (Get-Modify-Set) pattern to prevent data loss.
 */
async function commitTasks(
  octokit: Octokit,
  owner: string,
  repo: string,
  filePath: string,
  tasks: Task[],
): Promise<void> {
  const newContent = formatTasksAsMarkdown(tasks)

  for (let attempt = 0; attempt < MAX_CONFLICT_RETRIES; attempt++) {
    const existing = await getFileContent(octokit, owner, repo, filePath)

    let updatedContent: string
    let sha: string | undefined

    if (existing) {
      // Append to existing content
      updatedContent = existing.content.trimEnd() + '\n\n' + newContent + '\n'
      sha = existing.sha
    } else {
      // Create new file
      updatedContent = newContent + '\n'
    }

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

  const filePath = `captured-ideas-${user.login}.md`
  const [owner, repo] = selectedRepo.fullName.split('/')

  const octokit = await recoverOctokit()

  await commitTasks(octokit, owner, repo, filePath, pendingTasks)

  // Mark all synced tasks in store
  const { markTaskSynced } = useSyncStore.getState()
  for (const task of pendingTasks) {
    markTaskSynced(task.id, 0)
  }

  return { syncedCount: pendingTasks.length }
}

// Export for testing
export { getFileContent, formatTasksAsMarkdown, commitTasks }
