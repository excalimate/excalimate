import {
  addKeyframeToTrack,
  createKeyframeWithId,
  detachAction,
  generatedContentHash,
  sortKeyframes,
} from '@excalimate/animation-core';
import {
  CAMERA_FRAME_TARGET_ID,
  PROJECT_VERSION,
  encodeProjectDocument,
  parseProjectContent,
  parseProjectDocument,
} from '@excalimate/project-schema';
import { nanoid } from 'nanoid';
import type {
  AnimatableProperty,
  AnimationTrack,
  EasingType,
  Keyframe,
  ProjectAuthoring,
  ServerState,
} from './types.js';

function createAuthoring(): ProjectAuthoring {
  return {
    version: 1,
    documentRevision: 0,
    timelineRevision: 0,
    actions: [],
  };
}

export function createDefaultState(): ServerState {
  const now = new Date().toISOString();
  return parseProjectDocument({
    version: PROJECT_VERSION,
    metadata: {
      id: nanoid(),
      name: 'MCP Project',
      createdAt: now,
      updatedAt: now,
    },
    scene: { elements: [], appState: {}, files: {} },
    timeline: {
      id: nanoid(),
      name: 'Timeline 1',
      duration: 30_000,
      fps: 30,
      tracks: [],
    },
    playback: {
      clipStart: 0,
      clipEnd: 10_000,
      cameraFrame: {
        aspectRatio: '16:9',
        width: 1_200,
        x: 0,
        y: 0,
      },
    },
    authoring: createAuthoring(),
    preferredWorkspace: 'magic',
  });
}

export function parseServerState(input: unknown): ServerState {
  if (
    typeof input === 'object' &&
    input !== null &&
    Reflect.get(input, 'version') !== undefined
  ) {
    const parsed = parseProjectDocument(input);
    return parsed.authoring
      ? parsed
      : parseProjectDocument({ ...parsed, authoring: createAuthoring() });
  }

  const content = parseProjectContent(input);
  const now = new Date().toISOString();
  return parseProjectDocument({
    version: PROJECT_VERSION,
    metadata: {
      id: nanoid(),
      name: content.name ?? 'Imported MCP checkpoint',
      createdAt: now,
      updatedAt: now,
    },
    scene: content.scene,
    timeline: content.timeline,
    playback: content.playback,
    authoring: content.authoring ?? createAuthoring(),
    ...(content.preferredWorkspace
      ? { preferredWorkspace: content.preferredWorkspace }
      : {}),
  });
}

export function serializeServerState(state: ServerState): string {
  return encodeProjectDocument(state);
}

export function createTrack(
  targetId: string,
  targetType: 'element' | 'group',
  property: AnimatableProperty,
): AnimationTrack {
  return {
    id: nanoid(),
    targetId,
    targetType,
    property,
    keyframes: [],
    enabled: true,
  };
}

export function createKeyframe(
  time: number,
  value: number,
  easing: EasingType = 'linear',
): Keyframe {
  return createKeyframeWithId(nanoid(), time, value, easing);
}

export function ensureTrack(
  state: ServerState,
  targetId: string,
  property: AnimatableProperty,
): { state: ServerState; track: AnimationTrack } {
  let track = state.timeline.tracks.find(
    (candidate) =>
      candidate.targetId === targetId && candidate.property === property,
  );
  if (!track) {
    const targetType =
      targetId === CAMERA_FRAME_TARGET_ID ||
      state.scene.elements.some((element) => element.id === targetId)
        ? 'element'
        : 'group';
    track = createTrack(targetId, targetType, property);
    state = {
      ...state,
      timeline: {
        ...state.timeline,
        tracks: [...state.timeline.tracks, track],
      },
    };
  }
  return { state, track };
}

export function addKeyframeToState(
  state: ServerState,
  targetId: string,
  property: AnimatableProperty,
  time: number,
  value: number,
  easing: EasingType = 'linear',
): ServerState {
  const { state: withTrack, track } = ensureTrack(state, targetId, property);
  const updatedTrack = addKeyframeToTrack(
    track,
    createKeyframe(time, value, easing),
  );
  return {
    ...withTrack,
    timeline: {
      ...withTrack.timeline,
      tracks: withTrack.timeline.tracks.map((candidate) =>
        candidate.id === updatedTrack.id ? updatedTrack : candidate,
      ),
    },
  };
}

export function addKeyframesBatchToState(
  state: ServerState,
  keyframes: {
    targetId: string;
    property: AnimatableProperty;
    time: number;
    value: number;
    easing?: EasingType;
  }[],
): ServerState {
  if (keyframes.length === 0) return state;

  const tracks = [...state.timeline.tracks];
  const trackIndex = new Map<string, number>();
  for (let index = 0; index < tracks.length; index += 1) {
    const track = tracks[index];
    trackIndex.set(`${track.targetId}|${track.property}`, index);
  }

  const elementIds = new Set(state.scene.elements.map((element) => element.id));
  const modifiedIndices = new Set<number>();

  for (const keyframe of keyframes) {
    const key = `${keyframe.targetId}|${keyframe.property}`;
    let index = trackIndex.get(key);
    if (index === undefined) {
      const targetType =
        keyframe.targetId === CAMERA_FRAME_TARGET_ID ||
        elementIds.has(keyframe.targetId)
          ? 'element'
          : 'group';
      index = tracks.length;
      tracks.push(
        createTrack(keyframe.targetId, targetType, keyframe.property),
      );
      trackIndex.set(key, index);
    }

    if (!modifiedIndices.has(index)) {
      tracks[index] = {
        ...tracks[index],
        keyframes: [...tracks[index].keyframes],
      };
      modifiedIndices.add(index);
    }
    tracks[index].keyframes.push(
      createKeyframe(
        keyframe.time,
        keyframe.value,
        keyframe.easing ?? 'linear',
      ),
    );
  }

  for (const index of modifiedIndices) {
    tracks[index] = {
      ...tracks[index],
      keyframes: sortKeyframes(tracks[index].keyframes),
    };
  }

  return {
    ...state,
    timeline: {
      ...state.timeline,
      tracks,
    },
  };
}

export function reconcileManagedActionMutations(
  state: ServerState,
): ServerState {
  if (!state.authoring) return state;
  const tracksById = new Map(
    state.timeline.tracks.map((track) => [track.id, track]),
  );
  let changed = false;
  const actions = state.authoring.actions.map((action) => {
    if (action.status !== 'managed' && action.status !== 'customized') {
      return action;
    }
    const ownedTracks = action.ownership.map((ownership) =>
      tracksById.get(ownership.trackId),
    );
    const hasMissingContent = action.ownership.some((ownership, index) => {
      const track = ownedTracks[index];
      if (!track) return true;
      const keyframeIds = new Set(
        track.keyframes.map((keyframe) => keyframe.id),
      );
      return ownership.keyframeIds.some(
        (keyframeId) => !keyframeIds.has(keyframeId),
      );
    });
    if (hasMissingContent) {
      changed = true;
      return detachAction(action);
    }
    if (action.status === 'customized') return action;
    if (generatedContentHash(ownedTracks) !== action.generatedHash) {
      changed = true;
      return { ...action, status: 'customized' as const };
    }
    return action;
  });

  return changed
    ? { ...state, authoring: { ...state.authoring, actions } }
    : state;
}
