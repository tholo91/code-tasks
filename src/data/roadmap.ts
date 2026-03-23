import { RoadmapItem } from '../types/roadmap';

export const roadmapData: RoadmapItem[] = [
  {
    id: 'core-vision',
    title: 'Product Brief & Vision',
    description: 'Defining the core vision and project scope for Gitty.',
    status: 'shipped',
    category: 'Planning'
  },
  {
    id: 'quick-capture',
    title: 'The Pulse: Quick Capture',
    description: 'Single-line input for quick thought capture, optimized for mobile use.',
    status: 'shipped',
    category: 'Frontend'
  },
  {
    id: 'offline-persistence',
    title: 'Offline Persistence',
    description: 'Local data storage in IndexedDB so the app works fully offline.',
    status: 'shipped',
    category: 'Core'
  },
  {
    id: 'fuzzy-search',
    title: 'Fuzzy Task Search',
    description: 'Quickly find tasks with typo-tolerant search across titles and descriptions.',
    status: 'shipped',
    category: 'Frontend'
  },
  {
    id: 'background-sync',
    title: 'Background Sync Engine',
    description: 'Automatic background sync of local data with GitHub.',
    status: 'shipped',
    category: 'Core'
  },
  {
    id: 'roadmap-teaser',
    title: 'Roadmap Teaser',
    description: 'A peek at planned features and current development progress right inside the app.',
    status: 'in-progress',
    category: 'Community'
  },
  {
    id: 'feature-voting',
    title: 'Feature Voting',
    description: 'Let users vote on planned features to influence prioritization.',
    status: 'planned',
    category: 'Community'
  },
  {
    id: 'speech-to-task',
    title: 'Speech to Task',
    description: 'Dictation button for voice brainstorming — speak your ideas and push them as tasks to any repository.',
    status: 'planned',
    category: 'Frontend'
  },
  {
    id: 'multi-account',
    title: 'Multi-Account Support',
    description: 'Connect multiple GitHub accounts (e.g. personal + work) and switch between them seamlessly.',
    status: 'planned',
    category: 'Core'
  }
];

// Runtime assertion for unique IDs (dev-only)
if (process.env.NODE_ENV === 'development') {
  const ids = roadmapData.map(item => item.id);
  const uniqueIds = new Set(ids);
  if (uniqueIds.size !== ids.length) {
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    console.error(`Duplicate roadmap item IDs found: ${duplicates.join(', ')}`);
  }
}
