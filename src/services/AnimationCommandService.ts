import {
  AnimationActionSchema,
  AnimationTimelineSchema,
  CAMERA_FRAME_TARGET_ID,
  PROJECT_LIMITS,
  ProjectAuthoringSchema,
  parseProjectDocument,
} from '@excalimate/project-schema';
import type {
  AnimationAction,
  AnimationActionTiming,
  AnimationTimeline,
  AnimationTrack,
  EasingType,
  ProjectAuthoring,
  ProjectDocument,
  SceneElementMapping,
  SceneState,
  SceneTransition,
  SmartTransitionSettings,
} from '@excalimate/project-schema';
import {
  captureSceneStateSnapshot,
  compileManagedActions,
  createSmartTransitionRecipes,
  createAnimationAction,
  deterministicId,
  diffSceneStates,
  detachAction as detachManagedAction,
  presetDraft,
  sceneStateFingerprint,
} from '@excalimate/animation-core';
import type {
  AnimationActionDraft,
  CompileActionOptions,
  SceneDiffResult,
  SceneElementInput,
} from '@excalimate/animation-core';
import {
  computeFrameAtTime,
  invalidatePlaybackCache,
  runAnimationStoreTransaction,
} from '../core/engine/playbackSingleton';
import { fromProjectDocument, toProjectDocument } from '../core/models/Project';
import type { AnimationProject } from '../core/models/Project';
import { extractTargets } from '../components/Canvas/extractTargets';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { useUndoRedoStore } from '../stores/undoRedoStore';

export type AnimationCommandErrorCode =
  | 'ACTION_NOT_FOUND'
  | 'ACTION_CUSTOMIZED'
  | 'SCENE_STATE_NOT_FOUND'
  | 'TRANSITION_NOT_FOUND'
  | 'AMBIGUOUS_MATCH'
  | 'DUPLICATE_ACTION'
  | 'INVALID_INPUT'
  | 'INVALID_REFERENCE'
  | 'LIMIT_EXCEEDED';

export interface AnimationCommandError {
  code: AnimationCommandErrorCode;
  message: string;
  details?: readonly string[];
}

export type AnimationCommandResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AnimationCommandError };

export interface AnimationCommandValue {
  action?: AnimationAction;
  track?: AnimationTrack;
  sceneState?: SceneState;
  transition?: SceneTransition;
  actions: readonly AnimationAction[];
  timelineRevision: number;
  documentRevision: number;
  sceneStates: readonly SceneState[];
  sceneTransitions: readonly SceneTransition[];
}

interface CommitOptions {
  pushUndo?: boolean;
  recomputeAt?: number;
  timelineChanged?: boolean;
  sceneStates?: readonly SceneState[];
  sceneTransitions?: readonly SceneTransition[];
}

export interface SmartTransitionProposal {
  transition: SceneTransition;
  diff: SceneDiffResult;
}

export const DEFAULT_SMART_TRANSITION_SETTINGS: SmartTransitionSettings = {
  durationMs: 600,
  easing: 'easeInOut',
  staggerMs: 40,
  includeCamera: false,
};

function failure(
  code: AnimationCommandErrorCode,
  message: string,
  details?: readonly string[],
): AnimationCommandResult<never> {
  return {
    ok: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

function targetTypes(): CompileActionOptions['targetTypes'] {
  return Object.fromEntries(
    useProjectStore.getState().targets.map((target) => [target.id, target.type] as const),
  );
}

function validateReferences(action: AnimationAction): AnimationCommandResult<AnimationAction> {
  const knownTargets = new Set(useProjectStore.getState().targets.map((target) => target.id));
  for (const element of useProjectStore.getState().project?.scene.elements ?? []) {
    knownTargets.add(element.id);
  }
  const missing = action.targetIds.filter(
    (targetId) => targetId !== CAMERA_FRAME_TARGET_ID && !knownTargets.has(targetId),
  );
  if (missing.length > 0) {
    return failure(
      'INVALID_REFERENCE',
      `Action references unknown target "${missing[0]}"`,
      missing,
    );
  }
  return { ok: true, value: action };
}

function commitAnimationState(
  timeline: AnimationTimeline,
  actions: readonly AnimationAction[],
  options: CommitOptions = {},
): AnimationCommandResult<AnimationCommandValue> {
  const timelineResult = AnimationTimelineSchema.safeParse(timeline);
  if (!timelineResult.success) {
    const details = timelineResult.error.issues.map((issue) => issue.message);
    const limitExceeded = details.some((detail) => detail.toLowerCase().includes('maximum'));
    return failure(
      limitExceeded ? 'LIMIT_EXCEEDED' : 'INVALID_INPUT',
      details[0] ?? 'Invalid animation timeline',
      details,
    );
  }

  const current = useAnimationStore.getState();
  const authoring: ProjectAuthoring = {
    version: 1,
    documentRevision: current.documentRevision + 1,
    timelineRevision: current.timelineRevision + ((options.timelineChanged ?? true) ? 1 : 0),
    actions: [...actions],
    ...((options.sceneStates ?? current.sceneStates).length > 0
      ? { sceneStates: [...(options.sceneStates ?? current.sceneStates)] }
      : {}),
    ...((options.sceneTransitions ?? current.sceneTransitions).length > 0
      ? {
          sceneTransitions: [...(options.sceneTransitions ?? current.sceneTransitions)],
        }
      : {}),
  };
  const authoringResult = ProjectAuthoringSchema.safeParse(authoring);
  if (!authoringResult.success) {
    const details = authoringResult.error.issues.map((issue) => issue.message);
    return failure('INVALID_INPUT', details[0] ?? 'Invalid animation authoring metadata', details);
  }

  if (options.pushUndo ?? true) {
    useUndoRedoStore.getState().pushState();
  }
  runAnimationStoreTransaction(() => {
    useAnimationStore.setState({
      timeline: timelineResult.data,
      actions: authoringResult.data.actions,
      sceneStates: authoringResult.data.sceneStates ?? [],
      sceneTransitions: authoringResult.data.sceneTransitions ?? [],
      timelineRevision: authoringResult.data.timelineRevision,
      documentRevision: authoringResult.data.documentRevision,
    });
  });
  invalidatePlaybackCache();
  computeFrameAtTime(options.recomputeAt ?? usePlaybackStore.getState().currentTime);
  return {
    ok: true,
    value: {
      actions: authoringResult.data.actions,
      timelineRevision: authoringResult.data.timelineRevision,
      documentRevision: authoringResult.data.documentRevision,
      sceneStates: authoringResult.data.sceneStates ?? [],
      sceneTransitions: authoringResult.data.sceneTransitions ?? [],
    },
  };
}

function compileAndCommit(
  actions: readonly AnimationAction[],
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const compiled = compileManagedActions(current.timeline, current.actions, actions, {
    targetTypes: targetTypes(),
  });
  return commitAnimationState(compiled.timeline, compiled.actions);
}

export function createAction(
  draft: AnimationActionDraft,
): AnimationCommandResult<AnimationCommandValue> {
  return createActions([draft]);
}

export function createActions(
  drafts: readonly AnimationActionDraft[],
): AnimationCommandResult<AnimationCommandValue> {
  if (drafts.length === 0) {
    return failure('INVALID_INPUT', 'At least one animation action is required');
  }
  const current = useAnimationStore.getState();
  const occurrences = new Map<AnimationAction['type'], number>();
  for (const action of current.actions) {
    occurrences.set(action.type, (occurrences.get(action.type) ?? 0) + 1);
  }
  const newActions: AnimationAction[] = [];
  const knownIds = new Set(current.actions.map((action) => action.id));
  for (const draft of drafts) {
    const occurrence = occurrences.get(draft.type) ?? 0;
    occurrences.set(draft.type, occurrence + 1);
    const action = createAnimationAction(draft, occurrence);
    if (knownIds.has(action.id)) {
      return failure('DUPLICATE_ACTION', `Animation action "${action.id}" already exists`);
    }
    const parsed = AnimationActionSchema.safeParse(action);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message);
      return failure('INVALID_INPUT', details[0] ?? 'Invalid animation action', details);
    }
    const references = validateReferences(parsed.data);
    if (!references.ok) return references;
    knownIds.add(parsed.data.id);
    newActions.push(parsed.data);
  }
  const result = compileAndCommit([...current.actions, ...newActions]);
  if (!result.ok) return result;
  const lastAction = newActions.at(-1);
  return {
    ...result,
    value: {
      ...result.value,
      action: result.value.actions.find((candidate) => candidate.id === lastAction?.id),
    },
  };
}

export function updateAction(
  actionId: string,
  update: (action: AnimationAction) => AnimationAction,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const existing = current.actions.find((action) => action.id === actionId);
  if (!existing) {
    return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
  }
  if (existing.status === 'customized' || existing.status === 'detached') {
    return failure(
      'ACTION_CUSTOMIZED',
      `Animation action "${actionId}" has customized content and cannot be regenerated`,
    );
  }
  const next = update(existing);
  const parsed = AnimationActionSchema.safeParse(next);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message);
    return failure('INVALID_INPUT', details[0] ?? 'Invalid animation action', details);
  }
  const references = validateReferences(parsed.data);
  if (!references.ok) return references;
  const result = compileAndCommit(
    current.actions.map((action) => (action.id === actionId ? parsed.data : action)),
  );
  if (!result.ok) return result;
  return {
    ...result,
    value: {
      ...result.value,
      action: result.value.actions.find((candidate) => candidate.id === parsed.data.id),
    },
  };
}

export function applyPreset(input: {
  preset: string;
  targetIds: readonly string[];
  timing: AnimationActionTiming;
  easing?: EasingType;
}): AnimationCommandResult<AnimationCommandValue> {
  try {
    return createAction({
      ...presetDraft(input.preset, input.targetIds, input.timing),
      ...(input.easing ? { easing: input.easing } : {}),
    });
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Invalid animation preset',
    );
  }
}

export function applyPresetBatch(
  inputs: readonly {
    preset: string;
    targetIds: readonly string[];
    timing: AnimationActionTiming;
    easing?: EasingType;
  }[],
): AnimationCommandResult<AnimationCommandValue> {
  try {
    return createActions(
      inputs.map((input) => ({
        ...presetDraft(input.preset, input.targetIds, input.timing),
        ...(input.easing ? { easing: input.easing } : {}),
      })),
    );
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Invalid animation preset batch',
    );
  }
}

export function reorderActions(
  orderedActionIds: readonly string[],
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  if (
    orderedActionIds.length !== current.actions.length ||
    new Set(orderedActionIds).size !== current.actions.length
  ) {
    return failure('INVALID_INPUT', 'Action order must contain every action exactly once');
  }
  const byId = new Map(current.actions.map((action) => [action.id, action]));
  const ordered: AnimationAction[] = [];
  for (const actionId of orderedActionIds) {
    const action = byId.get(actionId);
    if (!action) {
      return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
    }
    ordered.push(action);
  }
  return compileAndCommit(ordered);
}

export function updateActionTiming(
  actionId: string,
  timing: AnimationActionTiming,
): AnimationCommandResult<AnimationCommandValue> {
  return updateAction(actionId, (action) => ({
    ...action,
    timing: { ...timing },
  }));
}

export function updateActionTimings(
  updates: readonly {
    actionId: string;
    timing: AnimationActionTiming;
  }[],
): AnimationCommandResult<AnimationCommandValue> {
  if (updates.length === 0) {
    return failure('INVALID_INPUT', 'At least one timing update is required');
  }
  const current = useAnimationStore.getState();
  const updatesById = new Map(updates.map((update) => [update.actionId, update.timing]));
  if (updatesById.size !== updates.length) {
    return failure('INVALID_INPUT', 'Each action can be updated only once');
  }
  const actionIds = new Set(current.actions.map((action) => action.id));
  for (const actionId of updatesById.keys()) {
    if (!actionIds.has(actionId)) {
      return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
    }
  }

  const nextActions: AnimationAction[] = [];
  for (const action of current.actions) {
    const timing = updatesById.get(action.id);
    if (!timing) {
      nextActions.push(action);
      continue;
    }
    if (action.status === 'customized' || action.status === 'detached') {
      return failure(
        'ACTION_CUSTOMIZED',
        `Animation action "${action.id}" has customized content and cannot be regenerated`,
      );
    }
    const parsed = AnimationActionSchema.safeParse({
      ...action,
      timing: { ...timing },
    });
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => issue.message);
      return failure('INVALID_INPUT', details[0] ?? 'Invalid animation action', details);
    }
    const references = validateReferences(parsed.data);
    if (!references.ok) return references;
    nextActions.push(parsed.data);
  }
  return compileAndCommit(nextActions);
}

export function disableAction(actionId: string): AnimationCommandResult<AnimationCommandValue> {
  return setActionsEnabled([actionId], false);
}

export function enableAction(actionId: string): AnimationCommandResult<AnimationCommandValue> {
  return setActionsEnabled([actionId], true);
}

export function setActionsEnabled(
  actionIds: readonly string[],
  enabled: boolean,
): AnimationCommandResult<AnimationCommandValue> {
  if (actionIds.length === 0) {
    return failure('INVALID_INPUT', 'At least one animation action is required');
  }
  const requested = new Set(actionIds);
  if (requested.size !== actionIds.length) {
    return failure('INVALID_INPUT', 'Action IDs must be unique');
  }
  const current = useAnimationStore.getState();
  for (const actionId of requested) {
    const action = current.actions.find((candidate) => candidate.id === actionId);
    if (!action) {
      return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
    }
    if (action.status === 'detached') {
      return failure(
        'ACTION_CUSTOMIZED',
        `Animation action "${actionId}" is detached and must be edited in Studio`,
      );
    }
  }
  const nextActions: AnimationAction[] = current.actions.map((action) =>
    requested.has(action.id) && action.status !== 'customized'
      ? { ...action, status: enabled ? 'managed' : 'disabled' }
      : action,
  );
  const customizedTrackIds = new Set(
    current.actions
      .filter((action) => requested.has(action.id) && action.status === 'customized')
      .flatMap((action) => action.ownership.map((ownership) => ownership.trackId)),
  );
  const compiled = compileManagedActions(current.timeline, current.actions, nextActions, {
    targetTypes: targetTypes(),
  });
  return commitAnimationState(
    {
      ...compiled.timeline,
      tracks: compiled.timeline.tracks.map((track) =>
        customizedTrackIds.has(track.id) ? { ...track, enabled } : track,
      ),
    },
    compiled.actions,
  );
}

export function deleteAction(actionId: string): AnimationCommandResult<AnimationCommandValue> {
  return deleteActions([actionId]);
}

export function deleteActions(
  actionIds: readonly string[],
): AnimationCommandResult<AnimationCommandValue> {
  if (actionIds.length === 0) {
    return failure('INVALID_INPUT', 'At least one animation action is required');
  }
  const requested = new Set(actionIds);
  if (requested.size !== actionIds.length) {
    return failure('INVALID_INPUT', 'Action IDs must be unique');
  }
  const current = useAnimationStore.getState();
  for (const actionId of requested) {
    if (!current.actions.some((action) => action.id === actionId)) {
      return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
    }
  }
  const nextActions = current.actions.filter((action) => !requested.has(action.id));
  const compiled = compileManagedActions(current.timeline, current.actions, nextActions, {
    targetTypes: targetTypes(),
  });
  const timeline = {
    ...compiled.timeline,
    tracks: compiled.timeline.tracks.map((track) => {
      if (!track.managedActionId || !requested.has(track.managedActionId)) return track;
      const { managedActionId: _managedActionId, ...unmanagedTrack } = track;
      return unmanagedTrack;
    }),
  };
  return commitAnimationState(timeline, compiled.actions, {
    sceneTransitions: current.sceneTransitions.filter(
      (transition) => !transition.managedActionId || !requested.has(transition.managedActionId),
    ),
  });
}

export function duplicateAction(actionId: string): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const actionIndex = current.actions.findIndex((candidate) => candidate.id === actionId);
  const action = current.actions[actionIndex];
  if (!action) {
    return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
  }
  if (action.status === 'customized' || action.status === 'detached') {
    return failure(
      'ACTION_CUSTOMIZED',
      `Animation action "${actionId}" has customized content and cannot be duplicated safely`,
    );
  }
  if (action.type === 'smartTransition') {
    return failure(
      'INVALID_INPUT',
      'Smart Transitions cannot be duplicated independently of their scene states',
    );
  }

  const knownIds = new Set(current.actions.map((candidate) => candidate.id));
  let occurrence = current.actions.length;
  let duplicate: AnimationAction;
  do {
    duplicate = createAnimationAction(
      {
        type: action.type,
        preset: action.preset,
        targetIds: action.targetIds,
        timing: action.timing,
        easing: action.easing,
        parameters: action.parameters,
      },
      occurrence,
    );
    occurrence += 1;
  } while (knownIds.has(duplicate.id));
  if (action.status === 'disabled') {
    duplicate = { ...duplicate, status: 'disabled' };
  }

  const nextActions = [...current.actions];
  nextActions.splice(actionIndex + 1, 0, duplicate);
  const result = compileAndCommit(nextActions);
  if (!result.ok) return result;
  return {
    ...result,
    value: {
      ...result.value,
      action: result.value.actions.find((candidate) => candidate.id === duplicate.id),
    },
  };
}

export function detachAction(actionId: string): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const action = current.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
  }
  const ownedTrackIds = new Set(action.ownership.map((ownership) => ownership.trackId));
  const detached = detachManagedAction(action);
  const sceneTransitions = current.sceneTransitions.map((transition) =>
    transition.managedActionId === actionId
      ? { ...transition, status: 'detached' as const }
      : transition,
  );
  return commitAnimationState(
    {
      ...current.timeline,
      tracks: current.timeline.tracks.map((track) => {
        if (!ownedTrackIds.has(track.id)) return track;
        const { managedActionId: _managedActionId, ...unmanagedTrack } = track;
        return unmanagedTrack;
      }),
    },
    current.actions.map((candidate) => (candidate.id === actionId ? detached : candidate)),
    { sceneTransitions },
  );
}

export function createCameraMove(input: {
  timing: AnimationActionTiming;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
  fromX?: number;
  fromY?: number;
  fromScale?: number;
  fromRotation?: number;
  easing?: EasingType;
  mode?: 'move' | 'hold';
  preset?: 'camera-fit-selection' | 'camera-hold' | 'camera-pan-zoom';
}): AnimationCommandResult<AnimationCommandValue> {
  return createAction({
    type: 'cameraMove',
    preset: input.preset ?? 'camera-pan-zoom',
    targetIds: [CAMERA_FRAME_TARGET_ID],
    timing: input.timing,
    ...(input.easing ? { easing: input.easing } : {}),
    parameters: {
      ...(input.x !== undefined ? { x: input.x } : {}),
      ...(input.y !== undefined ? { y: input.y } : {}),
      ...(input.scale !== undefined ? { scale: input.scale } : {}),
      ...(input.rotation !== undefined ? { rotation: input.rotation } : {}),
      ...(input.fromX !== undefined ? { fromX: input.fromX } : {}),
      ...(input.fromY !== undefined ? { fromY: input.fromY } : {}),
      ...(input.fromScale !== undefined ? { fromScale: input.fromScale } : {}),
      ...(input.fromRotation !== undefined ? { fromRotation: input.fromRotation } : {}),
      ...(input.mode ? { cameraMode: input.mode } : {}),
    },
  });
}

export function captureSceneState(name: string): AnimationCommandResult<AnimationCommandValue> {
  const projectState = useProjectStore.getState();
  const project = projectState.project;
  if (!project) return failure('INVALID_INPUT', 'Open a project before capturing a state');
  const current = useAnimationStore.getState();
  if (current.sceneStates.length >= PROJECT_LIMITS.maxSceneStates) {
    return failure(
      'LIMIT_EXCEEDED',
      `You can capture up to ${PROJECT_LIMITS.maxSceneStates} states. Delete one before capturing another.`,
    );
  }
  const trimmedName = name.trim();
  if (!trimmedName) return failure('INVALID_INPUT', 'Scene state name is required');
  const id = uniqueDeterministicId(
    'scene-state',
    trimmedName,
    current.documentRevision,
    new Set(current.sceneStates.map((state) => state.id)),
  );
  let sceneState: SceneState;
  try {
    sceneState = captureSceneStateSnapshot({
      id,
      name: trimmedName,
      createdAt: new Date().toISOString(),
      elements: project.scene.elements as readonly SceneElementInput[],
      cameraFrame: projectState.cameraFrame,
    });
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'The state could not be captured',
    );
  }
  const result = commitAnimationState(current.timeline, current.actions, {
    timelineChanged: false,
    sceneStates: [...current.sceneStates, sceneState],
  });
  if (!result.ok) return result;
  return {
    ...result,
    value: { ...result.value, sceneState },
  };
}

export function updateSceneState(
  sceneStateId: string,
  name?: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const existing = current.sceneStates.find((state) => state.id === sceneStateId);
  if (!existing) {
    return failure('SCENE_STATE_NOT_FOUND', `Scene state "${sceneStateId}" was not found`);
  }
  const projectState = useProjectStore.getState();
  const project = projectState.project;
  if (!project) return failure('INVALID_INPUT', 'Open a project before updating a state');
  let sceneState: SceneState;
  try {
    sceneState = captureSceneStateSnapshot({
      id: existing.id,
      name: name?.trim() || existing.name,
      createdAt: existing.createdAt,
      elements: project.scene.elements as readonly SceneElementInput[],
      cameraFrame: projectState.cameraFrame,
    });
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Scene state could not be updated',
    );
  }
  const result = commitAnimationState(current.timeline, current.actions, {
    timelineChanged: false,
    sceneStates: current.sceneStates.map((state) =>
      state.id === sceneStateId ? sceneState : state,
    ),
  });
  if (!result.ok) return result;
  return {
    ...result,
    value: { ...result.value, sceneState },
  };
}

export function deleteSceneState(
  sceneStateId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  if (!current.sceneStates.some((state) => state.id === sceneStateId)) {
    return failure('SCENE_STATE_NOT_FOUND', `Scene state "${sceneStateId}" was not found`);
  }
  const removedTransitions = current.sceneTransitions.filter(
    (transition) =>
      transition.fromStateId === sceneStateId || transition.toStateId === sceneStateId,
  );
  if (
    removedTransitions.some(
      (transition) => transition.status === 'customized' || transition.status === 'detached',
    )
  ) {
    return failure(
      'ACTION_CUSTOMIZED',
      'Detach customized transition tracks in Studio before deleting this state',
    );
  }
  const removedActionIds = new Set(
    removedTransitions.flatMap((transition) =>
      transition.managedActionId ? [transition.managedActionId] : [],
    ),
  );
  const nextActions = current.actions.filter((action) => !removedActionIds.has(action.id));
  const compiled = compileManagedActions(current.timeline, current.actions, nextActions, {
    targetTypes: targetTypes(),
  });
  return commitAnimationState(compiled.timeline, compiled.actions, {
    sceneStates: current.sceneStates.filter((state) => state.id !== sceneStateId),
    sceneTransitions: current.sceneTransitions.filter(
      (transition) =>
        transition.fromStateId !== sceneStateId && transition.toStateId !== sceneStateId,
    ),
  });
}

export function proposeSmartTransition(input: {
  fromStateId: string;
  toStateId: string;
  transitionId?: string;
  settings?: SmartTransitionSettings;
  analysis?: {
    diff: SceneDiffResult;
    mappings: readonly SceneElementMapping[];
    fromStateFingerprint: string;
    toStateFingerprint: string;
  };
}): AnimationCommandResult<SmartTransitionProposal> {
  const current = useAnimationStore.getState();
  const fromState = current.sceneStates.find((state) => state.id === input.fromStateId);
  const toState = current.sceneStates.find((state) => state.id === input.toStateId);
  if (!fromState || !toState) {
    return failure('SCENE_STATE_NOT_FOUND', 'Choose an existing starting point and next state');
  }
  if (fromState.id === toState.id) {
    return failure('INVALID_INPUT', 'Starting point and next state must be different');
  }
  const existing = input.transitionId
    ? current.sceneTransitions.find((transition) => transition.id === input.transitionId)
    : current.sceneTransitions.find(
        (transition) =>
          transition.fromStateId === fromState.id &&
          transition.toStateId === toState.id &&
          transition.status === 'draft',
      );
  if (existing?.managedActionId) {
    return failure(
      'ACTION_CUSTOMIZED',
      'Detach or delete the accepted transition before proposing it again',
    );
  }
  if (!existing && current.sceneTransitions.length >= PROJECT_LIMITS.maxSceneTransitions) {
    return failure(
      'LIMIT_EXCEEDED',
      `Projects support at most ${PROJECT_LIMITS.maxSceneTransitions} transitions`,
    );
  }
  const transition: SceneTransition = {
    id:
      existing?.id ??
      uniqueDeterministicId(
        'scene-transition',
        fromState.id,
        toState.id,
        new Set(current.sceneTransitions.map((item) => item.id)),
      ),
    fromStateId: fromState.id,
    toStateId: toState.id,
    mappings: existing?.mappings ?? [],
    settings: input.settings ?? existing?.settings ?? DEFAULT_SMART_TRANSITION_SETTINGS,
    status: 'draft',
  };
  let diff: SceneDiffResult;
  try {
    if (
      input.analysis &&
      mappingFingerprint(input.analysis.mappings) !== mappingFingerprint(transition.mappings)
    ) {
      return failure('INVALID_INPUT', 'The element choices changed. Preview the transition again');
    }
    if (
      input.analysis &&
      (input.analysis.fromStateFingerprint !== sceneStateFingerprint(fromState) ||
        input.analysis.toStateFingerprint !== sceneStateFingerprint(toState))
    ) {
      return failure('INVALID_INPUT', 'A captured state changed. Preview the transition again');
    }
    diff =
      input.analysis?.diff ??
      diffSceneStates(fromState, toState, {
        mappings: transition.mappings,
      });
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'The captured states could not be compared',
    );
  }
  const sceneTransitions = existing
    ? current.sceneTransitions.map((item) => (item.id === transition.id ? transition : item))
    : [...current.sceneTransitions, transition];
  const committed = commitAnimationState(current.timeline, current.actions, {
    timelineChanged: false,
    sceneTransitions,
  });
  if (!committed.ok) return committed;
  return { ok: true, value: { transition, diff } };
}

export function setExplicitSceneMapping(
  transitionId: string,
  mapping: SceneElementMapping,
): AnimationCommandResult<AnimationCommandValue> {
  return updateTransitionMappings(transitionId, (mappings) => [
    ...mappings.filter(
      (candidate) =>
        candidate.fromElementId !== mapping.fromElementId &&
        candidate.toElementId !== mapping.toElementId,
    ),
    mapping,
  ]);
}

export function clearExplicitSceneMapping(
  transitionId: string,
  fromElementId: string,
): AnimationCommandResult<AnimationCommandValue> {
  return updateTransitionMappings(transitionId, (mappings) =>
    mappings.filter((mapping) => mapping.fromElementId !== fromElementId),
  );
}

export function acceptSmartTransition(
  transitionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const transition = current.sceneTransitions.find((candidate) => candidate.id === transitionId);
  if (!transition) {
    return failure('TRANSITION_NOT_FOUND', `Transition "${transitionId}" was not found`);
  }
  const fromState = current.sceneStates.find((state) => state.id === transition.fromStateId);
  const toState = current.sceneStates.find((state) => state.id === transition.toStateId);
  if (!fromState || !toState) {
    return failure('SCENE_STATE_NOT_FOUND', 'One of the captured states is no longer available');
  }
  let diff: SceneDiffResult;
  try {
    diff = diffSceneStates(fromState, toState, {
      mappings: transition.mappings,
    });
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'The captured states could not be compared',
    );
  }
  if (diff.ambiguousFromElementIds.length > 0) {
    return failure(
      'AMBIGUOUS_MATCH',
      'Review every suggested element pair before creating the transition',
      diff.ambiguousFromElementIds,
    );
  }
  const projectState = useProjectStore.getState();
  const recipes = createSmartTransitionRecipes(fromState, toState, diff, transition.settings, {
    baselineElements: projectState.project?.scene.elements as
      | readonly SceneElementInput[]
      | undefined,
    baselineCameraFrame: projectState.cameraFrame,
  });
  if (recipes.length === 0) {
    return failure('INVALID_INPUT', 'The selected states have no changes that can be animated');
  }
  const actionId =
    transition.managedActionId ?? deterministicId('smart-transition-action', transition.id);
  const action = createAnimationAction({
    id: actionId,
    type: 'smartTransition',
    transitionId: transition.id,
    preset: 'smart-transition',
    targetIds: [...new Set(recipes.map((recipe) => recipe.targetId))].sort(),
    timing: {
      startMs: 0,
      durationMs: transition.settings.durationMs,
      staggerMs: 0,
      startMode: 'absolute',
    },
    easing: transition.settings.easing,
    parameters: { transitionRecipes: recipes },
  });
  const parsed = AnimationActionSchema.safeParse(action);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message);
    return failure('INVALID_INPUT', 'The transition could not be created', details);
  }
  const references = validateReferences(parsed.data);
  if (!references.ok) return references;
  const nextActions = [
    ...current.actions.filter((candidate) => candidate.id !== actionId),
    parsed.data,
  ];
  const compiled = compileManagedActions(current.timeline, current.actions, nextActions, {
    targetTypes: targetTypes(),
  });
  const accepted: SceneTransition = {
    ...transition,
    status: 'accepted',
    managedActionId: actionId,
  };
  const result = commitAnimationState(compiled.timeline, compiled.actions, {
    sceneTransitions: current.sceneTransitions.map((candidate) =>
      candidate.id === transition.id ? accepted : candidate,
    ),
  });
  if (!result.ok) return result;
  return {
    ...result,
    value: {
      ...result.value,
      action: result.value.actions.find((candidate) => candidate.id === actionId),
      transition: accepted,
    },
  };
}

export function customizeSmartTransition(
  transitionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  return setSmartTransitionAuthoringStatus(transitionId, 'customized');
}

export function detachSmartTransition(
  transitionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const transition = current.sceneTransitions.find((candidate) => candidate.id === transitionId);
  if (!transition) {
    return failure('TRANSITION_NOT_FOUND', `Scene transition "${transitionId}" was not found`);
  }
  const action = current.actions.find((candidate) => candidate.id === transition.managedActionId);
  if (!action) {
    return failure('ACTION_NOT_FOUND', 'The transition managed action was not found');
  }
  const ownedTrackIds = new Set(action.ownership.map((ownership) => ownership.trackId));
  const detachedAction = detachManagedAction(action);
  const detachedTransition: SceneTransition = {
    ...transition,
    status: 'detached',
  };
  return commitAnimationState(
    {
      ...current.timeline,
      tracks: current.timeline.tracks.map((track) => {
        if (!ownedTrackIds.has(track.id)) return track;
        const { managedActionId: _managedActionId, ...unmanagedTrack } = track;
        return unmanagedTrack;
      }),
    },
    current.actions.map((candidate) => (candidate.id === action.id ? detachedAction : candidate)),
    {
      sceneTransitions: current.sceneTransitions.map((candidate) =>
        candidate.id === transition.id ? detachedTransition : candidate,
      ),
    },
  );
}

export function deleteSceneTransition(
  transitionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const transition = current.sceneTransitions.find((candidate) => candidate.id === transitionId);
  if (!transition) {
    return failure('TRANSITION_NOT_FOUND', `Scene transition "${transitionId}" was not found`);
  }
  if (transition.status === 'customized' || transition.status === 'detached') {
    return failure('ACTION_CUSTOMIZED', 'Customized transition tracks must be removed in Studio');
  }
  const nextActions = transition.managedActionId
    ? current.actions.filter((action) => action.id !== transition.managedActionId)
    : current.actions;
  const compiled = compileManagedActions(current.timeline, current.actions, nextActions, {
    targetTypes: targetTypes(),
  });
  return commitAnimationState(compiled.timeline, compiled.actions, {
    timelineChanged: transition.managedActionId !== undefined,
    sceneTransitions: current.sceneTransitions.filter((candidate) => candidate.id !== transitionId),
  });
}

function updateTransitionMappings(
  transitionId: string,
  update: (mappings: readonly SceneElementMapping[]) => readonly SceneElementMapping[],
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const transition = current.sceneTransitions.find((candidate) => candidate.id === transitionId);
  if (!transition) {
    return failure('TRANSITION_NOT_FOUND', `Scene transition "${transitionId}" was not found`);
  }
  if (transition.managedActionId) {
    return failure(
      'ACTION_CUSTOMIZED',
      'Accepted transition mappings cannot change until the transition is detached',
    );
  }
  const nextTransition: SceneTransition = {
    ...transition,
    mappings: [...update(transition.mappings)].sort(
      (left, right) =>
        left.fromElementId.localeCompare(right.fromElementId) ||
        left.toElementId.localeCompare(right.toElementId),
    ),
  };
  const result = commitAnimationState(current.timeline, current.actions, {
    timelineChanged: false,
    sceneTransitions: current.sceneTransitions.map((candidate) =>
      candidate.id === transitionId ? nextTransition : candidate,
    ),
  });
  if (!result.ok) return result;
  return {
    ...result,
    value: { ...result.value, transition: nextTransition },
  };
}

function setSmartTransitionAuthoringStatus(
  transitionId: string,
  status: 'customized',
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const transition = current.sceneTransitions.find((candidate) => candidate.id === transitionId);
  if (!transition) {
    return failure('TRANSITION_NOT_FOUND', `Scene transition "${transitionId}" was not found`);
  }
  const action = current.actions.find((candidate) => candidate.id === transition.managedActionId);
  if (!action) {
    return failure('ACTION_NOT_FOUND', 'The transition managed action was not found');
  }
  const nextTransition: SceneTransition = { ...transition, status };
  return commitAnimationState(
    current.timeline,
    current.actions.map((candidate) =>
      candidate.id === action.id ? { ...candidate, status: 'customized' } : candidate,
    ),
    {
      timelineChanged: false,
      sceneTransitions: current.sceneTransitions.map((candidate) =>
        candidate.id === transition.id ? nextTransition : candidate,
      ),
    },
  );
}

function uniqueDeterministicId(namespace: string, ...parts: readonly unknown[]): string {
  const knownIds = parts.at(-1) instanceof Set ? (parts.at(-1) as Set<string>) : new Set<string>();
  const idParts = parts.at(-1) instanceof Set ? parts.slice(0, -1) : parts;
  let occurrence = 0;
  let id: string;
  do {
    id = deterministicId(namespace, ...idParts, occurrence);
    occurrence += 1;
  } while (knownIds.has(id));
  return id;
}

function mappingFingerprint(mappings: readonly SceneElementMapping[]): string {
  return [...mappings]
    .sort(
      (left, right) =>
        left.fromElementId.localeCompare(right.fromElementId) ||
        left.toElementId.localeCompare(right.toElementId),
    )
    .map((mapping) => `${mapping.fromElementId}\u0000${mapping.toElementId}`)
    .join('\u0001');
}

function findUnmanagedTrack(trackId: string): AnimationCommandResult<AnimationTrack> {
  const current = useAnimationStore.getState();
  const track = current.timeline.tracks.find((candidate) => candidate.id === trackId);
  if (!track) {
    return failure('INVALID_REFERENCE', `Animation track "${trackId}" was not found`);
  }
  const owner = current.actions.find((action) =>
    action.ownership.some((ownership) => ownership.trackId === trackId),
  );
  if (owner) {
    return failure('INVALID_INPUT', `Animation track "${trackId}" is managed by an action`);
  }
  return { ok: true, value: track };
}

export function setUnmanagedTrackEnabled(
  trackId: string,
  enabled: boolean,
): AnimationCommandResult<AnimationCommandValue> {
  const trackResult = findUnmanagedTrack(trackId);
  if (!trackResult.ok) return trackResult;
  const current = useAnimationStore.getState();
  return commitAnimationState(
    {
      ...current.timeline,
      tracks: current.timeline.tracks.map((track) =>
        track.id === trackId ? { ...track, enabled } : track,
      ),
    },
    current.actions,
  );
}

export function deleteUnmanagedTrack(
  trackId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const trackResult = findUnmanagedTrack(trackId);
  if (!trackResult.ok) return trackResult;
  const current = useAnimationStore.getState();
  return commitAnimationState(
    {
      ...current.timeline,
      tracks: current.timeline.tracks.filter((track) => track.id !== trackId),
    },
    current.actions,
  );
}

export function duplicateUnmanagedTrack(
  trackId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const trackResult = findUnmanagedTrack(trackId);
  if (!trackResult.ok) return trackResult;
  const current = useAnimationStore.getState();
  const knownIds = new Set(current.timeline.tracks.map((track) => track.id));
  let occurrence = 0;
  let duplicateId: string;
  do {
    duplicateId = deterministicId('custom-track-copy', trackId, occurrence);
    occurrence += 1;
  } while (knownIds.has(duplicateId));
  const { managedActionId: _managedActionId, ...unmanagedSource } = trackResult.value;
  const duplicate: AnimationTrack = {
    ...unmanagedSource,
    id: duplicateId,
    keyframes: trackResult.value.keyframes.map((keyframe, index) => ({
      ...keyframe,
      id: deterministicId('custom-keyframe-copy', duplicateId, index),
    })),
  };
  const index = current.timeline.tracks.findIndex((track) => track.id === trackId);
  const tracks = [...current.timeline.tracks];
  tracks.splice(index + 1, 0, duplicate);
  const result = commitAnimationState({ ...current.timeline, tracks }, current.actions);
  if (!result.ok) return result;
  return {
    ...result,
    value: {
      ...result.value,
      track: useAnimationStore.getState().timeline.tracks.find((track) => track.id === duplicateId),
    },
  };
}

export function replaceTimeline(
  timeline: AnimationTimeline,
  authoring?: ProjectAuthoring,
): AnimationCommandResult<AnimationCommandValue> {
  return commitAnimationState(timeline, authoring?.actions ?? []);
}

export function replaceProject(
  project: AnimationProject | ProjectDocument,
  options: {
    activateAnimationMode?: boolean;
    pushUndo?: boolean;
  } = {},
): AnimationCommandResult<AnimationProject> {
  let document: ProjectDocument;
  try {
    document = parseProjectDocument('id' in project ? toProjectDocument(project) : project);
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Invalid project document',
    );
  }
  const appProject = fromProjectDocument(document);
  const previousMode = useUIStore.getState().mode;
  if (options.pushUndo) useUndoRedoStore.getState().pushState(true);
  const targets = extractTargets(appProject.scene.elements);
  useProjectStore.setState({
    project: appProject,
    targets,
    cameraFrame: appProject.playback.cameraFrame,
    isDirty: false,
  });
  const workspace =
    document.preferredWorkspace ?? (document.timeline.tracks.length > 0 ? 'studio' : 'magic');
  useUIStore.getState().hydrateWorkspace(workspace);
  runAnimationStoreTransaction(() => {
    useAnimationStore.setState({
      timeline: appProject.timeline,
      clipStart: appProject.playback.clipStart,
      clipEnd: appProject.playback.clipEnd,
      actions: appProject.authoring?.actions ?? [],
      sceneStates: appProject.authoring?.sceneStates ?? [],
      sceneTransitions: appProject.authoring?.sceneTransitions ?? [],
      timelineRevision: appProject.authoring?.timelineRevision ?? 0,
      documentRevision: appProject.authoring?.documentRevision ?? 0,
    });
  });
  invalidatePlaybackCache();
  if (workspace !== 'magic') {
    if (options.activateAnimationMode ?? true) {
      useUIStore.getState().setMode('animate');
      computeFrameAtTime(0);
    } else {
      useUIStore.getState().setMode(previousMode);
    }
  }
  return { ok: true, value: appProject };
}
