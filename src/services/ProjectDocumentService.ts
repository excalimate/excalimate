import { parseProjectDocument } from '@excalimate/project-schema';
import type { ProjectDocument } from '@excalimate/project-schema';
import { toProjectDocument } from '../core/models/Project';
import type { AnimationProject } from '../core/models/Project';
import { useAnimationStore } from '../stores/animationStore';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { replaceProject } from './AnimationCommandService';
import { trackCreatorEvent } from './analytics/posthog';

export function captureProjectDocument(
  options: { touchUpdatedAt?: boolean } = {},
): ProjectDocument | null {
  const project = useProjectStore.getState().project;
  if (!project) return null;

  const {
    timeline,
    clipStart,
    clipEnd,
    actions,
    sceneStates,
    sceneTransitions,
    timelineRevision,
    documentRevision,
  } = useAnimationStore.getState();
  const cameraFrame = useProjectStore.getState().cameraFrame;
  const updatedAt =
    options.touchUpdatedAt === false ? project.metadata.updatedAt : new Date().toISOString();
  return parseProjectDocument(
    toProjectDocument({
      ...project,
      timeline,
      playback: { clipStart, clipEnd, cameraFrame },
      clipStart,
      clipEnd,
      cameraFrame,
      updatedAt,
      metadata: { ...project.metadata, updatedAt },
      authoring: {
        version: 1,
        actions,
        ...(sceneStates.length > 0 ? { sceneStates } : {}),
        ...(sceneTransitions.length > 0 ? { sceneTransitions } : {}),
        timelineRevision,
        documentRevision,
      },
    }),
  );
}

export function loadProjectDocumentIntoStores(
  project: AnimationProject | ProjectDocument,
  options: {
    activateAnimationMode?: boolean;
    pushUndo?: boolean;
    trackWorkspaceChange?: boolean;
  } = {},
): AnimationProject {
  const result = replaceProject(project, options);
  if (!result.ok) throw new Error(result.error.message);
  if (options.trackWorkspaceChange ?? true) {
    trackCreatorEvent('creator_workspace_changed', {
      workspace: useUIStore.getState().workspace,
      source: 'project-load',
    });
  }
  return result.value;
}
