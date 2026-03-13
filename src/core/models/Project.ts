import { nanoid } from 'nanoid';
import type { AnimationTimeline } from '../../types/animation';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import type { CameraFrame } from '../../stores/projectStore';
import { createTimeline, validateTimeline } from './Timeline';

export const PROJECT_VERSION = '1.0.0';

export interface AnimationProject {
  id: string;
  version: string;
  name: string;
  scene: ExcalidrawSceneData;
  timeline: AnimationTimeline;
  clipStart?: number;
  clipEnd?: number;
  cameraFrame?: CameraFrame;
  createdAt: string;
  updatedAt: string;
}

export function createProject(
  name: string,
  scene: ExcalidrawSceneData,
): AnimationProject {
  const now = new Date().toISOString();
  return {
    id: nanoid(),
    version: PROJECT_VERSION,
    name,
    scene,
    timeline: createTimeline(),
    createdAt: now,
    updatedAt: now,
  };
}

export function validateProject(
  project: unknown,
): project is AnimationProject {
  if (typeof project !== 'object' || project === null) return false;

  const obj = project as Record<string, unknown>;

  if (typeof obj.id !== 'string' || obj.id.length === 0) return false;
  if (typeof obj.version !== 'string' || obj.version.length === 0) return false;
  if (typeof obj.name !== 'string') return false;
  if (typeof obj.createdAt !== 'string' || obj.createdAt.length === 0)
    return false;
  if (typeof obj.updatedAt !== 'string' || obj.updatedAt.length === 0)
    return false;

  // Validate scene
  if (typeof obj.scene !== 'object' || obj.scene === null) return false;
  const scene = obj.scene as Record<string, unknown>;
  if (!Array.isArray(scene.elements)) return false;
  if (typeof scene.appState !== 'object' || scene.appState === null)
    return false;
  if (typeof scene.files !== 'object' || scene.files === null) return false;

  // Validate timeline
  if (!validateTimeline(obj.timeline)) return false;

  return true;
}
