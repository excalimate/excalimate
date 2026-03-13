import type { AnimationProject } from '../core/models/Project';
import { createProject } from '../core/models/Project';
import type { ExcalidrawSceneData } from '../types/excalidraw';

const RECENT_PROJECTS_KEY = 'excalidraw-animate-recent';
const MAX_RECENT = 10;

export interface RecentProject {
  id: string;
  name: string;
  updatedAt: string;
}

export function getRecentProjects(): RecentProject[] {
  try {
    const data = localStorage.getItem(RECENT_PROJECTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addToRecent(project: AnimationProject): void {
  const recent = getRecentProjects().filter((p) => p.id !== project.id);
  recent.unshift({
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
  });
  if (recent.length > MAX_RECENT) recent.length = MAX_RECENT;
  localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(recent));
}

export function createEmptyProject(name?: string): AnimationProject {
  const scene: ExcalidrawSceneData = { elements: [], appState: {}, files: {} };
  return createProject(name ?? 'Untitled Animation', scene);
}
