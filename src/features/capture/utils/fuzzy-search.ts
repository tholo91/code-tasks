import Fuse from 'fuse.js'
import type { Task } from '../../../types/task'

export const createTaskFuse = (tasks: Task[]) =>
  new Fuse(tasks, {
    keys: ['title', 'body'],
    threshold: 0.4,
    ignoreLocation: true,
    minMatchCharLength: 2,
  })

export const searchTasks = (fuse: Fuse<Task>, query: string): Task[] =>
  fuse.search(query).map((result) => result.item)
