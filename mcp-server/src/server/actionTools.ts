import {
  AUTO_ANIMATE_STYLES,
  analyzeAnimationTopology,
  compileManagedActions,
  createAnimationAction,
  presetDraft,
} from '@excalimate/animation-core';
import type {
  AnimationActionDraft,
  AutoAnimateStyle,
} from '@excalimate/animation-core';
import {
  ACTION_START_MODES,
  ANIMATABLE_PROPERTIES,
  ANIMATION_ACTION_TYPES,
  CAMERA_FRAME_TARGET_ID,
  EASING_TYPES,
  ProjectValidationError,
  SLIDE_DIRECTIONS,
  parseProjectDocument,
} from '@excalimate/project-schema';
import type {
  AnimationAction,
  AnimationTrack,
  ProjectAuthoring,
  ServerState,
} from '../types.js';
import type { StateContext } from './stateContext.js';
import { z } from 'zod';
import {
  boundedAnimationValue,
  boundedString,
  boundedTime,
  toolError,
} from './limits.js';

const PRESETS = [
  'fade',
  'draw',
  'pop',
  'slide-left',
  'slide-right',
  'slide-up',
  'slide-down',
] as const;

function targetTypes(
  state: ServerState,
): Readonly<Record<string, AnimationTrack['targetType']>> {
  return Object.fromEntries([
    ...state.scene.elements.map(
      (element) => [element.id, 'element'] as const,
    ),
    [CAMERA_FRAME_TARGET_ID, 'element'] as const,
  ]);
}

function currentAuthoring(state: ServerState): ProjectAuthoring {
  return (
    state.authoring ?? {
      version: 1,
      documentRevision: 0,
      timelineRevision: 0,
      actions: [],
    }
  );
}

function targetError(
  state: ServerState,
  targetIds: readonly string[],
): string | undefined {
  const sceneIds = new Set(
    state.scene.elements.map((element) => element.id),
  );
  const missing = targetIds.filter(
    (targetId) =>
      targetId !== CAMERA_FRAME_TARGET_ID && !sceneIds.has(targetId),
  );
  return missing.length > 0
    ? `Unknown action target IDs: ${missing.join(', ')}`
    : undefined;
}

function generatedTracksForAction(
  state: ServerState,
  action: AnimationAction,
): AnimationTrack[] {
  return compileManagedActions(
    { ...state.timeline, tracks: [] },
    [],
    [action],
    { targetTypes: targetTypes(state) },
  ).timeline.tracks;
}

function conflictError(
  state: ServerState,
  previousActions: readonly AnimationAction[],
  nextActions: readonly AnimationAction[],
): string | undefined {
  const replacedManagedTrackIds = new Set(
    previousActions
      .filter((action) => action.status === 'managed')
      .flatMap((action) =>
        action.ownership.map((ownership) => ownership.trackId),
      ),
  );
  const unmanagedSignatures = new Set(
    state.timeline.tracks
      .filter((track) => !replacedManagedTrackIds.has(track.id))
      .map((track) => `${track.targetId}|${track.property}`),
  );
  const nextSignatures = new Map<string, string>();

  for (const action of nextActions) {
    if (action.status !== 'managed') continue;
    for (const track of generatedTracksForAction(state, action)) {
      const signature = `${track.targetId}|${track.property}`;
      if (unmanagedSignatures.has(signature)) {
        return (
          `Action "${action.id}" would overlap customized or unmanaged ` +
          `${track.property} keyframes for "${track.targetId}". ` +
          'Detach or remove that low-level track explicitly before applying the action.'
        );
      }
      const existingActionId = nextSignatures.get(signature);
      if (existingActionId && existingActionId !== action.id) {
        return (
          `Actions "${existingActionId}" and "${action.id}" both manage ` +
          `${track.property} for "${track.targetId}". Split the scope or use low-level keyframes.`
        );
      }
      nextSignatures.set(signature, action.id);
    }
  }
  return undefined;
}

function actionSummary(
  actions: readonly AnimationAction[],
  tracks: readonly AnimationTrack[],
): string {
  return actions
    .map((action) => {
      const trackCount = tracks.filter((track) =>
        action.ownership.some(
          (ownership) => ownership.trackId === track.id,
        ),
      ).length;
      return (
        `${action.id}: ${action.type}, ${action.targetIds.length} target(s), ` +
        `${trackCount} managed track(s), ${action.timing.durationMs}ms`
      );
    })
    .join('; ');
}

function applyDrafts(
  ctx: StateContext,
  drafts: readonly AnimationActionDraft[],
):
  | { ok: true; actions: AnimationAction[]; summary: string }
  | { ok: false; message: string } {
  const state = ctx.getState();
  const authoring = currentAuthoring(state);
  const previousById = new Map(
    authoring.actions.map((action) => [action.id, action]),
  );
  const nextById = new Map(
    authoring.actions.map((action) => [action.id, action]),
  );
  const draftedActions = drafts.map((draft, index) =>
    createAnimationAction(draft, index),
  );

  for (const action of draftedActions) {
    const targetProblem = targetError(state, action.targetIds);
    if (targetProblem) return { ok: false, message: targetProblem };
    const previous = previousById.get(action.id);
    if (
      previous &&
      (previous.status === 'customized' || previous.status === 'detached')
    ) {
      return {
        ok: false,
        message:
          `Action "${action.id}" is ${previous.status}; refusing to silently replace its customized or unmanaged keyframes. ` +
          'Use a new action ID or remove the customized content explicitly.',
      };
    }
    nextById.set(action.id, action);
  }

  const nextActions = [...nextById.values()];
  const collision = conflictError(state, authoring.actions, nextActions);
  if (collision) return { ok: false, message: collision };

  const compiled = compileManagedActions(
    state.timeline,
    authoring.actions,
    nextActions,
    { targetTypes: targetTypes(state) },
  );
  const nextState = parseProjectDocument({
    ...state,
    timeline: compiled.timeline,
    authoring: {
      ...authoring,
      actions: compiled.actions,
    },
  });
  ctx.updateState(nextState);
  const appliedIds = new Set(draftedActions.map((action) => action.id));
  const appliedActions = compiled.actions.filter((action) =>
    appliedIds.has(action.id),
  );
  return {
    ok: true,
    actions: appliedActions,
    summary: actionSummary(appliedActions, compiled.timeline.tracks),
  };
}

export function registerActionTools(ctx: StateContext): void {
  const identifier = boundedString(ctx.limits);
  const targetIds = identifier.array()
    .min(1)
    .max(ctx.limits.maxTargetsPerAction);
  const timingSchema = z.object({
    startMs: boundedTime(ctx.limits),
    durationMs: boundedTime(ctx.limits).min(1),
    staggerMs: boundedTime(ctx.limits),
    startMode: enumSchema(ACTION_START_MODES),
  }).strict();
  const parametersSchema = z.object({
    direction: enumSchema(SLIDE_DIRECTIONS).optional(),
    distance: boundedAnimationValue().nonnegative().optional(),
    from: boundedAnimationValue().optional(),
    to: boundedAnimationValue().optional(),
    property: enumSchema(ANIMATABLE_PROPERTIES).optional(),
    x: boundedAnimationValue().optional(),
    y: boundedAnimationValue().optional(),
    scale: boundedAnimationValue().positive().optional(),
    rotation: boundedAnimationValue().optional(),
  }).strict();
  const actionDraftSchema = z.object({
    id: identifier.optional(),
    type: enumSchema(ANIMATION_ACTION_TYPES),
    preset: identifier.optional(),
    targetIds,
    timing: timingSchema,
    easing: enumSchema(EASING_TYPES).optional(),
    parameters: parametersSchema.optional(),
  }).strict();

  ctx.mutatingTool(
    'upsert_action_sequence',
    'Upsert deterministic managed animation actions. Nested action objects are compiled by @excalimate/animation-core; customized and unmanaged keyframes are never silently replaced.',
    {
      sequence: z.object({
        actions: actionDraftSchema.array()
          .min(1)
          .max(ctx.limits.maxActions),
      }).strict(),
    },
    async ({ sequence }) => {
      const result = applyDrafts(ctx, sequence.actions);
      return result.ok
        ? {
            content: [{
              type: 'text' as const,
              text: `Action sequence upserted. ${result.summary}`,
            }],
          }
        : toolError(result.message);
    },
  );

  ctx.tool(
    'get_action_sequence',
    'Return the V2 managed-action authoring sequence and its document/timeline revisions.',
    {},
    async () => ({
      content: [{
        type: 'text' as const,
        text: JSON.stringify(currentAuthoring(ctx.getState()), null, 2),
      }],
    }),
  );

  ctx.mutatingTool(
    'apply_animation_preset',
    'Apply a deterministic managed animation preset to an explicit target scope.',
    {
      preset: z.object({
        name: enumSchema(PRESETS),
        targetIds,
        timing: timingSchema,
      }).strict(),
    },
    async ({ preset }) => {
      const result = applyDrafts(ctx, [
        presetDraft(preset.name, preset.targetIds, preset.timing),
      ]);
      return result.ok
        ? {
            content: [{
              type: 'text' as const,
              text: `Animation preset applied. ${result.summary}`,
            }],
          }
        : toolError(result.message);
    },
  );

  ctx.mutatingTool(
    'create_camera_move',
    'Create a deterministic managed camera move for the V2 camera-frame target.',
    {
      move: z.object({
        id: identifier.optional(),
        x: boundedAnimationValue().optional(),
        y: boundedAnimationValue().optional(),
        scale: boundedAnimationValue().positive().optional(),
        rotation: boundedAnimationValue().optional(),
        timing: timingSchema,
        easing: enumSchema(EASING_TYPES).optional(),
      }).strict().refine(
        (move) =>
          move.x !== undefined ||
          move.y !== undefined ||
          move.scale !== undefined ||
          move.rotation !== undefined,
        'At least one of x, y, scale, or rotation is required',
      ),
    },
    async ({ move }) => {
      const result = applyDrafts(ctx, [{
        id: move.id,
        type: 'cameraMove',
        targetIds: [CAMERA_FRAME_TARGET_ID],
        timing: move.timing,
        easing: move.easing,
        parameters: {
          x: move.x,
          y: move.y,
          scale: move.scale,
          rotation: move.rotation,
        },
      }]);
      return result.ok
        ? {
            content: [{
              type: 'text' as const,
              text: `Camera move created. ${result.summary}`,
            }],
          }
        : toolError(result.message);
    },
  );

  ctx.mutatingTool(
    'auto_animate',
    'Analyze an explicit local scene scope with the shared deterministic topology analyzer and compile its managed recipe. No scene content leaves the process.',
    {
      scope: z.object({
        elementIds: targetIds,
      }).strict(),
      style: z.object({
        intensity: enumSchema(AUTO_ANIMATE_STYLES),
      }).strict(),
    },
    async ({ scope, style }) => {
      const state = ctx.getState();
      const elementsById = new Map(
        state.scene.elements.map((element) => [element.id, element]),
      );
      const missing = scope.elementIds.filter(
        (elementId: string) => !elementsById.has(elementId),
      );
      if (missing.length > 0) {
        return toolError(
          `Unknown auto-animation scope IDs: ${missing.join(', ')}`,
        );
      }
      const analysis = analyzeAnimationTopology(
        scope.elementIds.map((elementId: string) => {
          const element = elementsById.get(elementId);
          return {
            id: elementId,
            type: String(element?.type ?? 'unknown'),
            x: typeof element?.x === 'number' ? element.x : undefined,
            y: typeof element?.y === 'number' ? element.y : undefined,
          };
        }),
        style.intensity as AutoAnimateStyle,
      );
      const result = applyDrafts(ctx, [analysis.draft]);
      return result.ok
        ? {
            content: [{
              type: 'text' as const,
              text:
                `Auto animation: strategy=${analysis.strategy}, ` +
                `confidence=${analysis.confidence.toFixed(2)}, ` +
                `reason=${analysis.reason} ${result.summary}`,
            }],
          }
        : toolError(result.message);
    },
  );

  ctx.tool(
    'validate_project',
    'Validate the current project or a supplied project object with the shared V2 codec. V1 documents are migrated before validation.',
    {
      input: z.object({
        project: recordUnknownSchema().optional(),
      }).strict().optional(),
    },
    async ({ input }) => {
      try {
        const project = parseProjectDocument(
          input?.project ?? ctx.getState(),
        );
        return {
          content: [{
            type: 'text' as const,
            text:
              `Project is valid V2: ${project.scene.elements.length} elements, ` +
              `${project.timeline.tracks.length} tracks, ` +
              `${project.authoring?.actions.length ?? 0} actions.`,
          }],
        };
      } catch (error) {
        if (error instanceof ProjectValidationError) {
          return toolError(error.message);
        }
        throw error;
      }
    },
  );
}

function enumSchema<const T extends readonly [string, ...string[]]>(
  values: T,
) {
  return z.enum(values);
}

function recordUnknownSchema() {
  return z.record(z.unknown());
}
