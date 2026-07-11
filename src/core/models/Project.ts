import { nanoid } from 'nanoid';
import {
  PROJECT_VERSION,
  createDefaultCameraFrame,
  parseProjectDocument,
} from '@excalimate/project-schema';
import type {
  ProjectContent,
  ProjectDocument,
  ProjectScene,
} from '@excalimate/project-schema';
import type { AnimationTimeline } from '../../types/animation';
import type { ExcalidrawSceneData } from '../../types/excalidraw';
import type { CameraFrame } from '../../stores/projectStore';
import { createTimeline } from './Timeline';

export { PROJECT_VERSION };

/**
 * App-facing compatibility shape. Canonical V2 fields are always present, while
 * the flat aliases keep existing Studio consumers incremental.
 */
export type AnimationProject = Omit<
  ProjectDocument,
  'scene' | 'timeline' | 'playback'
> & {
  scene: ExcalidrawSceneData;
  timeline: AnimationTimeline;
  playback: {
    clipStart: number;
    clipEnd: number;
    cameraFrame: CameraFrame;
  };
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  clipStart?: number;
  clipEnd?: number;
  cameraFrame?: CameraFrame;
};

export function createProject(
  name: string,
  scene: ExcalidrawSceneData,
): AnimationProject {
  const now = new Date().toISOString();
  const timeline = createTimeline();
  const cameraFrame = createDefaultCameraFrame();
  const project = fromProjectDocument({
    version: PROJECT_VERSION,
    metadata: {
      id: nanoid(),
      name,
      createdAt: now,
      updatedAt: now,
    },
    scene: toProjectScene(scene),
    timeline,
    playback: {
      clipStart: 0,
      clipEnd: Math.min(10_000, timeline.duration),
      cameraFrame,
    },
    preferredWorkspace: 'magic',
  });
  return { ...project, scene };
}

export function createProjectFromContent(
  fallbackName: string,
  content: ProjectContent,
): AnimationProject {
  const project = createProject(content.name ?? fallbackName, fromProjectScene(content.scene));
  return fromProjectDocument({
    version: PROJECT_VERSION,
    metadata: project.metadata,
    scene: content.scene,
    timeline: content.timeline,
    playback: content.playback,
    authoring: content.authoring,
    preferredWorkspace:
      content.preferredWorkspace ??
      (content.timeline.tracks.length > 0 ? 'studio' : 'magic'),
  });
}

export function fromProjectDocument(
  document: ProjectDocument,
): AnimationProject {
  return {
    ...document,
    scene: fromProjectScene(document.scene),
    id: document.metadata.id,
    name: document.metadata.name,
    createdAt: document.metadata.createdAt,
    updatedAt: document.metadata.updatedAt,
    clipStart: document.playback.clipStart,
    clipEnd: document.playback.clipEnd,
    cameraFrame: document.playback.cameraFrame,
  };
}

export function toProjectDocument(
  project: AnimationProject,
): ProjectDocument {
  return {
    version: PROJECT_VERSION,
    metadata: {
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    scene: toProjectScene(project.scene),
    timeline: project.timeline,
    playback: {
      clipStart: project.clipStart ?? project.playback.clipStart,
      clipEnd: project.clipEnd ?? project.playback.clipEnd,
      cameraFrame: project.cameraFrame ?? project.playback.cameraFrame,
    },
    authoring: project.authoring,
    preferredWorkspace: project.preferredWorkspace,
  };
}

export function validateProject(
  project: unknown,
): project is AnimationProject {
  try {
    if (isCompatibilityProject(project)) {
      parseProjectDocument(toProjectDocument(project));
    } else {
      parseProjectDocument(project);
    }
    return true;
  } catch {
    return false;
  }
}

function isCompatibilityProject(
  value: unknown,
): value is AnimationProject {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['id'] === 'string' &&
    typeof record['name'] === 'string' &&
    typeof record['createdAt'] === 'string' &&
    typeof record['updatedAt'] === 'string' &&
    typeof record['metadata'] === 'object' &&
    typeof record['playback'] === 'object'
  );
}

function toProjectScene(scene: ExcalidrawSceneData): ProjectScene {
  return {
    elements: scene.elements as unknown as ProjectScene['elements'],
    appState: scene.appState as Record<string, unknown>,
    files: scene.files as Record<string, unknown>,
  };
}

function fromProjectScene(scene: ProjectScene): ExcalidrawSceneData {
  return {
    elements: scene.elements as unknown as ExcalidrawSceneData['elements'],
    appState: scene.appState as ExcalidrawSceneData['appState'],
    files: scene.files as ExcalidrawSceneData['files'],
  };
}
