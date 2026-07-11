import { parseProjectDocument } from '@excalimate/project-schema';
import type { ProjectDocument } from '@excalimate/project-schema';
import { toProjectDocument } from '../core/models/Project';
import type { AnimationProject } from '../core/models/Project';
import { useAnimationStore } from '../stores/animationStore';
import { useProjectStore } from '../stores/projectStore';
import { replaceProject } from './AnimationCommandService';

export function captureProjectDocument(): ProjectDocument | null {
  const project = useProjectStore.getState().project;
  if (!project) return null;

  const {
    timeline,
    clipStart,
    clipEnd,
    actions,
    timelineRevision,
    documentRevision,
  } = useAnimationStore.getState();
  const cameraFrame = useProjectStore.getState().cameraFrame;
  const updatedAt = new Date().toISOString();
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
        timelineRevision,
        documentRevision,
      },
    }),
  );
}

export function loadProjectDocumentIntoStores(
  project: AnimationProject | ProjectDocument,
  options: { activateAnimationMode?: boolean } = {},
): AnimationProject {
  const result = replaceProject(project, options);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}
