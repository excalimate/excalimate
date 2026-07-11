import type {
  AnimatableProperty,
  AnimationAction,
  AnimationActionParameters,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  GeneratedContentOwnership,
} from '@excalimate/project-schema';
import { deterministicId, generatedContentHash } from './ids.js';

export interface AnimationActionDraft {
  id?: string;
  type: AnimationAction['type'];
  preset?: string;
  targetIds: readonly string[];
  timing: AnimationAction['timing'];
  easing?: EasingType;
  parameters?: AnimationActionParameters;
}

export interface CompileActionOptions {
  targetTypes?: Readonly<Record<string, AnimationTrack['targetType']>>;
}

export interface CompiledManagedActions {
  timeline: AnimationTimeline;
  actions: AnimationAction[];
}

interface TrackRecipe {
  targetId: string;
  property: AnimatableProperty;
  values: readonly [number, number][];
}

function createGeneratedTrack(
  action: AnimationAction,
  recipe: TrackRecipe,
  recipeIndex: number,
  targetType: AnimationTrack['targetType'],
): AnimationTrack {
  const trackId = deterministicId(
    'track',
    action.id,
    recipe.targetId,
    recipe.property,
    recipeIndex,
  );
  return {
    id: trackId,
    targetId: recipe.targetId,
    targetType,
    property: recipe.property,
    enabled: true,
    keyframes: recipe.values.map(([time, value], keyframeIndex) => ({
      id: deterministicId('keyframe', trackId, keyframeIndex),
      time,
      value,
      easing: action.easing,
    })),
  };
}

function actionStart(
  action: AnimationAction,
  previousStart: number,
  previousEnd: number,
): number {
  if (action.timing.startMode === 'afterPrevious') {
    return previousEnd + action.timing.startMs;
  }
  if (action.timing.startMode === 'withPrevious') {
    return previousStart + action.timing.startMs;
  }
  return action.timing.startMs;
}

function pair(
  start: number,
  duration: number,
  from: number,
  to: number,
): readonly [number, number][] {
  return [
    [start, from],
    [start + duration, to],
  ];
}

function recipesForAction(
  action: AnimationAction,
  start: number,
): TrackRecipe[] {
  const duration = action.timing.durationMs;
  const parameters = action.parameters;
  const from = parameters.from;
  const to = parameters.to;

  if (action.type === 'fade') {
    return action.targetIds.map((targetId, index) => ({
      targetId,
      property: 'opacity',
      values: pair(
        start + index * action.timing.staggerMs,
        duration,
        from ?? 0,
        to ?? 1,
      ),
    }));
  }
  if (action.type === 'slide') {
    const direction = parameters.direction ?? 'left';
    const distance = parameters.distance ?? 100;
    const property =
      direction === 'left' || direction === 'right'
        ? 'translateX'
        : 'translateY';
    const offset =
      direction === 'left' || direction === 'up' ? -distance : distance;
    return action.targetIds.map((targetId, index) => ({
      targetId,
      property,
      values: pair(
        start + index * action.timing.staggerMs,
        duration,
        from ?? offset,
        to ?? 0,
      ),
    }));
  }
  if (action.type === 'draw') {
    return action.targetIds.map((targetId, index) => ({
      targetId,
      property: 'drawProgress',
      values: pair(
        start + index * action.timing.staggerMs,
        duration,
        from ?? 0,
        to ?? 1,
      ),
    }));
  }
  if (action.type === 'pop') {
    return action.targetIds.flatMap((targetId, index) => {
      const targetStart = start + index * action.timing.staggerMs;
      return (['scaleX', 'scaleY'] as const).map((property) => ({
        targetId,
        property,
        values: pair(
          targetStart,
          duration,
          from ?? 0.8,
          to ?? 1,
        ),
      }));
    });
  }
  if (action.type === 'sequence') {
    const property = parameters.property ?? 'opacity';
    return action.targetIds.map((targetId, index) => ({
      targetId,
      property,
      values: pair(
        start + index * action.timing.staggerMs,
        duration,
        from ?? 0,
        to ?? 1,
      ),
    }));
  }

  const targetId = action.targetIds[0] ?? '__camera_frame__';
  const cameraRecipes: TrackRecipe[] = [];
  if (parameters.x !== undefined) {
    cameraRecipes.push({
      targetId,
      property: 'translateX',
      values: pair(start, duration, from ?? 0, parameters.x),
    });
  }
  if (parameters.y !== undefined) {
    cameraRecipes.push({
      targetId,
      property: 'translateY',
      values: pair(start, duration, from ?? 0, parameters.y),
    });
  }
  if (parameters.scale !== undefined) {
    for (const property of ['scaleX', 'scaleY'] as const) {
      cameraRecipes.push({
        targetId,
        property,
        values: pair(start, duration, from ?? 1, parameters.scale),
      });
    }
  }
  if (parameters.rotation !== undefined) {
    cameraRecipes.push({
      targetId,
      property: 'rotation',
      values: pair(start, duration, from ?? 0, parameters.rotation),
    });
  }
  return cameraRecipes;
}

function ownershipForTrack(track: AnimationTrack): GeneratedContentOwnership {
  const times = track.keyframes.map((keyframe) => keyframe.time);
  return {
    trackId: track.id,
    targetId: track.targetId,
    property: track.property,
    keyframeIds: track.keyframes.map((keyframe) => keyframe.id),
    startMs: Math.min(...times),
    endMs: Math.max(...times),
  };
}

export function createAnimationAction(
  draft: AnimationActionDraft,
  occurrence = 0,
): AnimationAction {
  const id =
    draft.id ??
    deterministicId(
      'action',
      draft.type,
      draft.preset,
      draft.targetIds,
      draft.timing,
      draft.parameters,
      occurrence,
    );
  return {
    id,
    type: draft.type,
    ...(draft.preset ? { preset: draft.preset } : {}),
    targetIds: [...draft.targetIds],
    timing: { ...draft.timing },
    easing: draft.easing ?? (draft.type === 'pop' ? 'easeOutBack' : 'easeOut'),
    parameters: { ...draft.parameters },
    ownership: [],
    generatedHash: generatedContentHash([]),
    status: 'managed',
  };
}

export function compileManagedActions(
  timeline: AnimationTimeline,
  previousActions: readonly AnimationAction[],
  nextActions: readonly AnimationAction[],
  options: CompileActionOptions = {},
): CompiledManagedActions {
  const nextById = new Map(nextActions.map((action) => [action.id, action]));
  const removedTrackIds = new Set<string>();
  for (const previous of previousActions) {
    const next = nextById.get(previous.id);
    const shouldReplace =
      !next || next.status === 'managed' || next.status === 'disabled';
    if (previous.status === 'managed' && shouldReplace) {
      for (const ownership of previous.ownership) {
        removedTrackIds.add(ownership.trackId);
      }
    }
  }

  const customTracks = timeline.tracks.filter(
    (track) => !removedTrackIds.has(track.id),
  );
  const generatedTracks: AnimationTrack[] = [];
  const compiledActions: AnimationAction[] = [];
  let previousStart = 0;
  let previousEnd = 0;

  for (const action of nextActions) {
    const start = actionStart(action, previousStart, previousEnd);
    const actionEnd =
      start +
      action.timing.durationMs +
      Math.max(0, action.targetIds.length - 1) * action.timing.staggerMs;
    previousStart = start;
    previousEnd = actionEnd;
    if (action.status !== 'managed') {
      compiledActions.push(
        action.status === 'disabled'
          ? {
              ...action,
              ownership: [],
              generatedHash: generatedContentHash([]),
            }
          : action,
      );
      continue;
    }

    const tracks = recipesForAction(action, start).map((recipe, recipeIndex) =>
      createGeneratedTrack(
        action,
        recipe,
        recipeIndex,
        options.targetTypes?.[recipe.targetId] ?? 'element',
      ),
    );
    const ownership = tracks.map(ownershipForTrack);
    const generatedHash = generatedContentHash(tracks);
    generatedTracks.push(...tracks);
    compiledActions.push({
      ...action,
      ownership,
      generatedHash,
    });
  }

  return {
    timeline: {
      ...timeline,
      tracks: [...customTracks, ...generatedTracks],
    },
    actions: compiledActions,
  };
}

export function detachAction(
  action: AnimationAction,
): AnimationAction {
  return {
    ...action,
    status: 'detached',
    ownership: [],
    generatedHash: generatedContentHash([]),
  };
}

export function customizeActionsForMutation(
  actions: readonly AnimationAction[],
  trackId: string,
  keyframeId?: string,
): AnimationAction[] {
  return actions.map((action) => {
    if (action.status !== 'managed') return action;
    const ownsMutation = action.ownership.some(
      (ownership) =>
        ownership.trackId === trackId &&
        (keyframeId === undefined || ownership.keyframeIds.includes(keyframeId)),
    );
    return ownsMutation ? { ...action, status: 'customized' } : action;
  });
}

export function presetDraft(
  preset: string,
  targetIds: readonly string[],
  timing: AnimationAction['timing'],
): AnimationActionDraft {
  if (preset.startsWith('slide-')) {
    const direction = preset.slice('slide-'.length);
    if (
      direction !== 'left' &&
      direction !== 'right' &&
      direction !== 'up' &&
      direction !== 'down'
    ) {
      throw new Error(`Unknown animation preset "${preset}"`);
    }
    return {
      type: 'slide',
      preset,
      targetIds,
      timing,
      parameters: { direction },
    };
  }
  if (preset === 'fade' || preset === 'draw' || preset === 'pop') {
    return {
      type: preset,
      preset,
      targetIds,
      timing,
      parameters: {},
    };
  }
  throw new Error(`Unknown animation preset "${preset}"`);
}
