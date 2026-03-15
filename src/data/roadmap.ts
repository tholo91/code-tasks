import { RoadmapItem } from '../types/roadmap';

export const roadmapData: RoadmapItem[] = [
  {
    id: 'core-vision',
    title: 'Product Brief & Vision',
    description: 'Definition der Grundvision und des Projekt-Umfangs für Gitty.',
    status: 'shipped',
    category: 'Planning'
  },
  {
    id: 'quick-capture',
    title: 'The Pulse: Quick Capture',
    description: 'Einzeilige Eingabe für schnelle Erfassung von Gedanken, optimiert für mobile Nutzung.',
    status: 'shipped',
    category: 'Frontend'
  },
  {
    id: 'offline-persistence',
    title: 'Offline Persistence',
    description: 'Speicherung der Daten in IndexedDB, damit die App auch ohne Internetverbindung funktioniert.',
    status: 'shipped',
    category: 'Core'
  },
  {
    id: 'fuzzy-search',
    title: 'Fuzzy Task Search',
    description: 'Schnelles Finden von Aufgaben durch fehlertolerante Suche über Titel und Beschreibungen.',
    status: 'shipped',
    category: 'Frontend'
  },
  {
    id: 'background-sync',
    title: 'Background Sync Engine',
    description: 'Automatischer Abgleich der lokalen Daten mit GitHub im Hintergrund.',
    status: 'shipped',
    category: 'Core'
  },
  {
    id: 'roadmap-teaser',
    title: 'Roadmap Teaser',
    description: 'Einblick in geplante Funktionen und den aktuellen Entwicklungsstand direkt in der App.',
    status: 'in-progress',
    category: 'Community'
  },
  {
    id: 'feature-voting',
    title: 'Feature Voting',
    description: 'Nutzer können über geplante Funktionen abstimmen, um die Priorisierung zu beeinflussen.',
    status: 'planned',
    category: 'Community'
  },
  {
    id: 'donation-prompt',
    title: 'Unterstütze Gitty',
    description: 'Ein sanfter Hinweis auf Unterstützungsmöglichkeiten, um das Projekt nachhaltig zu betreiben.',
    status: 'planned',
    category: 'Sustainability'
  },
  {
    id: 'github-sponsor',
    title: 'GitHub Sponsor Integration',
    description: 'Direkte Verknüpfung mit GitHub Sponsors für einfache Unterstützung durch die Community.',
    status: 'planned',
    category: 'Sustainability'
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
