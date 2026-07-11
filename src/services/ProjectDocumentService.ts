import { parseProjectDocument } from '@excalimate/project-schema';
import type { ProjectDocument } from '@excalimate/project-schema';
import {
  fromProjectDocument,
  toProjectDocument,
} from '../core/models/Project';
import type { AnimationProject } from '../core/models/Project';
import { computeFrameAtTime } from '../core/engine/playbackSingleton';
import { useAnimationStore } from '../stores/animationStore';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { extractTargets } from '../components/Canvas/extractTargets';

export function captureProjectDocument(): ProjectDocument | null {
  const project = useProjectStore.getState().project;
  if (!project) return null;

  const { timeline, clipStart, clipEnd } = useAnimationStore.getState();
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
    }),
  );
}

export function loadProjectDocumentIntoStores(
  project: AnimationProject | ProjectDocument,
  options: { activateAnimationMode?: boolean } = {},
): AnimationProject {
  const appProject =
    'id' in project ? project : fromProjectDocument(project);
  useProjectStore.getState().loadProject(appProject);
  useProjectStore
    .getState()
    .setTargets(extractTargets(appProject.scene.elements));
  // setTargets may auto-fit a default-position frame; restore the exact document frame.
  useProjectStore.getState().loadProject(appProject);
  useAnimationStore.setState({
    timeline: appProject.timeline,
    clipStart: appProject.playback.clipStart,
    clipEnd: appProject.playback.clipEnd,
  });

  if (options.activateAnimationMode ?? true) {
    useUIStore.getState().setMode('animate');
    computeFrameAtTime(0);
  }
  return appProject;
}
