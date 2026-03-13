export {
  createKeyframe,
  validateKeyframe,
  sortKeyframes,
  findKeyframeIndex,
} from './Keyframe';

export {
  createTrack,
  addKeyframeToTrack,
  removeKeyframeFromTrack,
  updateKeyframeInTrack,
  validateTrack,
} from './Track';

export {
  createTimeline,
  addTrackToTimeline,
  removeTrackFromTimeline,
  updateTrackInTimeline,
  findTracksForTarget,
  validateTimeline,
} from './Timeline';

export {
  PROJECT_VERSION,
  createProject,
  validateProject,
} from './Project';

export type { AnimationProject } from './Project';
