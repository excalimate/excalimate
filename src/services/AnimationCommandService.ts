import {
  AnimationActionSchema,
  AnimationTimelineSchema,
  CAMERA_FRAME_TARGET_ID,
  ProjectAuthoringSchema,
  parseProjectDocument,
} from '@excalimate/project-schema';
import type {
  AnimationAction,
  AnimationActionTiming,
  AnimationTimeline,
  ProjectAuthoring,
  ProjectDocument,
} from '@excalimate/project-schema';
import {
  compileManagedActions,
  createAnimationAction,
  detachAction as detachManagedAction,
  presetDraft,
} from '@excalimate/animation-core';
import type {
  AnimationActionDraft,
  CompileActionOptions,
} from '@excalimate/animation-core';
import {
  computeFrameAtTime,
  invalidatePlaybackCache,
  runAnimationStoreTransaction,
} from '../core/engine/playbackSingleton';
import {
  fromProjectDocument,
  toProjectDocument,
} from '../core/models/Project';
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
  actions: readonly AnimationAction[];
  timelineRevision: number;
  documentRevision: number;
}

interface CommitOptions {
  pushUndo?: boolean;
  recomputeAt?: number;
}

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
    useProjectStore
      .getState()
      .targets.map((target) => [target.id, target.type] as const),
  );
}

function validateReferences(
  action: AnimationAction,
): AnimationCommandResult<AnimationAction> {
  const knownTargets = new Set(
    useProjectStore.getState().targets.map((target) => target.id),
  );
  const missing = action.targetIds.filter(
    (targetId) =>
      targetId !== CAMERA_FRAME_TARGET_ID && !knownTargets.has(targetId),
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
    const limitExceeded = details.some((detail) =>
      detail.toLowerCase().includes('maximum'),
    );
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
    timelineRevision: current.timelineRevision + 1,
    actions: [...actions],
  };
  const authoringResult = ProjectAuthoringSchema.safeParse(authoring);
  if (!authoringResult.success) {
    const details = authoringResult.error.issues.map((issue) => issue.message);
    return failure(
      'INVALID_INPUT',
      details[0] ?? 'Invalid animation authoring metadata',
      details,
    );
  }

  if (options.pushUndo ?? true) {
    useUndoRedoStore.getState().pushState();
  }
  runAnimationStoreTransaction(() => {
    useAnimationStore.setState({
      timeline: timelineResult.data,
      actions: authoringResult.data.actions,
      timelineRevision: authoringResult.data.timelineRevision,
      documentRevision: authoringResult.data.documentRevision,
    });
  });
  invalidatePlaybackCache();
  computeFrameAtTime(
    options.recomputeAt ?? usePlaybackStore.getState().currentTime,
  );
  return {
    ok: true,
    value: {
      actions: authoringResult.data.actions,
      timelineRevision: authoringResult.data.timelineRevision,
      documentRevision: authoringResult.data.documentRevision,
    },
  };
}

function compileAndCommit(
  actions: readonly AnimationAction[],
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const compiled = compileManagedActions(
    current.timeline,
    current.actions,
    actions,
    { targetTypes: targetTypes() },
  );
  return commitAnimationState(compiled.timeline, compiled.actions);
}

export function createAction(
  draft: AnimationActionDraft,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const occurrence = current.actions.filter(
    (action) => action.type === draft.type,
  ).length;
  const action = createAnimationAction(draft, occurrence);
  if (current.actions.some((candidate) => candidate.id === action.id)) {
    return failure(
      'DUPLICATE_ACTION',
      `Animation action "${action.id}" already exists`,
    );
  }
  const parsed = AnimationActionSchema.safeParse(action);
  if (!parsed.success) {
    const details = parsed.error.issues.map((issue) => issue.message);
    return failure(
      'INVALID_INPUT',
      details[0] ?? 'Invalid animation action',
      details,
    );
  }
  const references = validateReferences(parsed.data);
  if (!references.ok) return references;
  const result = compileAndCommit([...current.actions, parsed.data]);
  if (!result.ok) return result;
  return {
    ...result,
    value: {
      ...result.value,
      action: result.value.actions.find(
        (candidate) => candidate.id === parsed.data.id,
      ),
    },
  };
}

export function updateAction(
  actionId: string,
  update: (
    action: AnimationAction,
  ) => AnimationAction,
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
    current.actions.map((action) =>
      action.id === actionId ? parsed.data : action,
    ),
  );
  if (!result.ok) return result;
  return {
    ...result,
    value: {
      ...result.value,
      action: result.value.actions.find(
        (candidate) => candidate.id === parsed.data.id,
      ),
    },
  };
}

export function applyPreset(input: {
  preset: string;
  targetIds: readonly string[];
  timing: AnimationActionTiming;
}): AnimationCommandResult<AnimationCommandValue> {
  try {
    return createAction(
      presetDraft(input.preset, input.targetIds, input.timing),
    );
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Invalid animation preset',
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
    return failure(
      'INVALID_INPUT',
      'Action order must contain every action exactly once',
    );
  }
  const byId = new Map(current.actions.map((action) => [action.id, action]));
  const ordered: AnimationAction[] = [];
  for (const actionId of orderedActionIds) {
    const action = byId.get(actionId);
    if (!action) {
      return failure(
        'ACTION_NOT_FOUND',
        `Animation action "${actionId}" was not found`,
      );
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

export function disableAction(
  actionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  return updateAction(actionId, (action) => ({
    ...action,
    status: 'disabled',
  }));
}

export function deleteAction(
  actionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  if (!current.actions.some((action) => action.id === actionId)) {
    return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
  }
  return compileAndCommit(
    current.actions.filter((action) => action.id !== actionId),
  );
}

export function detachAction(
  actionId: string,
): AnimationCommandResult<AnimationCommandValue> {
  const current = useAnimationStore.getState();
  const action = current.actions.find((candidate) => candidate.id === actionId);
  if (!action) {
    return failure('ACTION_NOT_FOUND', `Animation action "${actionId}" was not found`);
  }
  const detached = detachManagedAction(action);
  return commitAnimationState(
    current.timeline,
    current.actions.map((candidate) =>
      candidate.id === actionId ? detached : candidate,
    ),
  );
}

export function createCameraMove(input: {
  timing: AnimationActionTiming;
  x?: number;
  y?: number;
  scale?: number;
  rotation?: number;
}): AnimationCommandResult<AnimationCommandValue> {
  return createAction({
    type: 'cameraMove',
    preset: 'camera-move',
    targetIds: [CAMERA_FRAME_TARGET_ID],
    timing: input.timing,
    parameters: {
      ...(input.x !== undefined ? { x: input.x } : {}),
      ...(input.y !== undefined ? { y: input.y } : {}),
      ...(input.scale !== undefined ? { scale: input.scale } : {}),
      ...(input.rotation !== undefined ? { rotation: input.rotation } : {}),
    },
  });
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
    document = parseProjectDocument(
      'id' in project ? toProjectDocument(project) : project,
    );
  } catch (error) {
    return failure(
      'INVALID_INPUT',
      error instanceof Error ? error.message : 'Invalid project document',
    );
  }
  const appProject = fromProjectDocument(document);
  if (options.pushUndo) useUndoRedoStore.getState().pushState(true);
  const targets = extractTargets(appProject.scene.elements);
  useProjectStore.setState({
    project: appProject,
    targets,
    cameraFrame: appProject.playback.cameraFrame,
    isDirty: false,
  });
  runAnimationStoreTransaction(() => {
    useAnimationStore.setState({
      timeline: appProject.timeline,
      clipStart: appProject.playback.clipStart,
      clipEnd: appProject.playback.clipEnd,
      actions: appProject.authoring?.actions ?? [],
      timelineRevision: appProject.authoring?.timelineRevision ?? 0,
      documentRevision: appProject.authoring?.documentRevision ?? 0,
    });
  });
  invalidatePlaybackCache();
  if (options.activateAnimationMode ?? true) {
    useUIStore.getState().setMode('animate');
    computeFrameAtTime(0);
  }
  return { ok: true, value: appProject };
}
