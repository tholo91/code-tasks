export type RoadmapStatus = 'planned' | 'in-progress' | 'shipped';

export interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  status: RoadmapStatus;
  category?: string;
}
