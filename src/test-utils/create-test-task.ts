import type { Task } from '../types/task'

let orderCounter = 0

export function createTestTask(overrides: Partial<Task> = {}): Task {
  const id = overrides.id ?? `test-${Date.now()}-${Math.random()}`
  return {
    id,
    username: 'testuser',
    repoFullName: 'owner/repo',
    title: 'Test Task',
    body: '',
    createdAt: new Date().toISOString(),
    isImportant: false,
    isCompleted: false,
    completedAt: null,
    updatedAt: null,
    order: orderCounter++,
    syncStatus: 'pending',
    githubIssueNumber: null,
    captureRevision: id,
    handoffStatus: null,
    proofUrl: null,
    handledAt: null,
    ...overrides,
  }
}

export function resetOrderCounter() {
  orderCounter = 0
}
