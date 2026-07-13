import { z } from 'zod';

export const V1_PROJECT_VERSION = '1.0.0' as const;
export const PROJECT_VERSION = '2.0.0' as const;
export const CAMERA_FRAME_TARGET_ID = '__camera_frame__' as const;

export const PROJECT_LIMITS = Object.freeze({
  maxInputBytes: 20 * 1024 * 1024,
  maxDecompressedBytes: 64 * 1024 * 1024,
  maxSceneElements: 10_000,
  maxSceneFiles: 2_000,
  maxTracks: 10_000,
  maxKeyframesPerTrack: 10_000,
  maxTotalKeyframes: 100_000,
  maxTimelineDurationMs: 24 * 60 * 60 * 1_000,
  maxIdentifierLength: 256,
  maxNameLength: 256,
  maxStringLength: 16 * 1024 * 1024,
  maxCollectionItems: 200_000,
  maxNestingDepth: 100,
  maxVisitedValues: 1_000_000,
  maxAbsoluteNumber: Number.MAX_SAFE_INTEGER,
  maxAnimationValue: 1_000_000_000_000,
  maxSceneStates: 50,
  maxSceneTransitions: 100,
  maxSceneMappings: 10_000,
  maxTransitionRecipes: 60_000,
});

export const EASING_TYPES = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInQuad',
  'easeOutQuad',
  'easeInOutQuad',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeInBack',
  'easeOutBack',
  'easeInOutBack',
  'easeInElastic',
  'easeOutElastic',
  'easeInBounce',
  'easeOutBounce',
  'step',
] as const;

export const ANIMATABLE_PROPERTIES = [
  'opacity',
  'translateX',
  'translateY',
  'scaleX',
  'scaleY',
  'rotation',
  'drawProgress',
] as const;

export const ASPECT_RATIOS = ['16:9', '4:3', '1:1', '3:2'] as const;
export const PREFERRED_WORKSPACES = ['magic', 'sequence', 'studio'] as const;
export const ANIMATION_ACTION_TYPES = [
  'fade',
  'slide',
  'draw',
  'pop',
  'sequence',
  'cameraMove',
  'smartTransition',
] as const;
export const ANIMATION_ACTION_STATUSES = ['managed', 'customized', 'disabled', 'detached'] as const;
export const ACTION_START_MODES = ['absolute', 'afterPrevious', 'withPrevious'] as const;
export const SLIDE_DIRECTIONS = ['left', 'right', 'up', 'down'] as const;
export const CAMERA_ACTION_MODES = ['move', 'hold'] as const;
export const SCENE_TRANSITION_STATUSES = ['draft', 'accepted', 'customized', 'detached'] as const;

const identifierSchema = z.string().min(1).max(PROJECT_LIMITS.maxIdentifierLength);
const nameSchema = z.string().max(PROJECT_LIMITS.maxNameLength);
const finiteNumberSchema = z
  .number()
  .finite()
  .min(-PROJECT_LIMITS.maxAnimationValue)
  .max(PROJECT_LIMITS.maxAnimationValue);

export const KeyframeSchema = z
  .object({
    id: identifierSchema,
    time: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
    value: finiteNumberSchema,
    easing: z.enum(EASING_TYPES),
  })
  .strict();

export const AnimationTrackSchema = z
  .object({
    id: identifierSchema,
    targetId: identifierSchema,
    targetType: z.enum(['element', 'group']),
    property: z.enum(ANIMATABLE_PROPERTIES),
    managedActionId: identifierSchema.optional(),
    keyframes: z.array(KeyframeSchema).max(PROJECT_LIMITS.maxKeyframesPerTrack),
    enabled: z.boolean(),
  })
  .strict()
  .superRefine((track, context) => {
    const keyframeIds = new Set<string>();
    for (const keyframe of track.keyframes) {
      if (keyframeIds.has(keyframe.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['keyframes'],
          message: `Duplicate keyframe id "${keyframe.id}"`,
        });
      }
      keyframeIds.add(keyframe.id);
    }
  });

const animationTimelineMetadataShape = {
  id: identifierSchema,
  name: nameSchema,
  duration: finiteNumberSchema.positive().max(PROJECT_LIMITS.maxTimelineDurationMs),
  fps: finiteNumberSchema.int().min(1).max(240),
};

export const AnimationTimelineMetadataSchema = z.object(animationTimelineMetadataShape).strict();

export const AnimationTimelineSchema = z
  .object({
    ...animationTimelineMetadataShape,
    tracks: z.array(AnimationTrackSchema).max(PROJECT_LIMITS.maxTracks),
  })
  .strict()
  .superRefine((timeline, context) => {
    const trackIds = new Set<string>();
    let totalKeyframes = 0;

    for (const [trackIndex, track] of timeline.tracks.entries()) {
      if (trackIds.has(track.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['tracks', trackIndex, 'id'],
          message: `Duplicate track id "${track.id}"`,
        });
      }
      trackIds.add(track.id);
      totalKeyframes += track.keyframes.length;
    }

    if (totalKeyframes > PROJECT_LIMITS.maxTotalKeyframes) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['tracks'],
        message: `Timeline exceeds ${PROJECT_LIMITS.maxTotalKeyframes} keyframes`,
      });
    }
  });

export const AnimationActionTimingSchema = z
  .object({
    startMs: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
    durationMs: finiteNumberSchema.positive().max(PROJECT_LIMITS.maxTimelineDurationMs),
    staggerMs: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
    startMode: z.enum(ACTION_START_MODES),
  })
  .strict();

export const TransitionPropertyRecipeSchema = z
  .object({
    targetId: identifierSchema,
    property: z.enum(ANIMATABLE_PROPERTIES),
    from: finiteNumberSchema,
    to: finiteNumberSchema,
    delayMs: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
  })
  .strict();

export const AnimationActionParametersSchema = z
  .object({
    direction: z.enum(SLIDE_DIRECTIONS).optional(),
    distance: finiteNumberSchema.nonnegative().optional(),
    from: finiteNumberSchema.optional(),
    fromX: finiteNumberSchema.optional(),
    fromY: finiteNumberSchema.optional(),
    fromScale: finiteNumberSchema.positive().optional(),
    fromRotation: finiteNumberSchema.optional(),
    to: finiteNumberSchema.optional(),
    property: z.enum(ANIMATABLE_PROPERTIES).optional(),
    x: finiteNumberSchema.optional(),
    y: finiteNumberSchema.optional(),
    scale: finiteNumberSchema.positive().optional(),
    rotation: finiteNumberSchema.optional(),
    cameraMode: z.enum(CAMERA_ACTION_MODES).optional(),
    transitionRecipes: z
      .array(TransitionPropertyRecipeSchema)
      .max(PROJECT_LIMITS.maxTransitionRecipes)
      .optional(),
  })
  .strict();

export const GeneratedContentOwnershipSchema = z
  .object({
    trackId: identifierSchema,
    targetId: identifierSchema,
    property: z.enum(ANIMATABLE_PROPERTIES),
    keyframeIds: z.array(identifierSchema).max(PROJECT_LIMITS.maxKeyframesPerTrack),
    startMs: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
    endMs: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
  })
  .strict()
  .superRefine((ownership, context) => {
    if (ownership.endMs < ownership.startMs) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endMs'],
        message: 'endMs must be greater than or equal to startMs',
      });
    }
  });

export const AnimationActionSchema = z
  .object({
    id: identifierSchema,
    type: z.enum(ANIMATION_ACTION_TYPES),
    preset: identifierSchema.optional(),
    targetIds: z.array(identifierSchema).min(1).max(PROJECT_LIMITS.maxSceneElements),
    timing: AnimationActionTimingSchema,
    easing: z.enum(EASING_TYPES),
    parameters: AnimationActionParametersSchema,
    ownership: z.array(GeneratedContentOwnershipSchema).max(PROJECT_LIMITS.maxTracks),
    generatedHash: identifierSchema,
    status: z.enum(ANIMATION_ACTION_STATUSES),
    transitionId: identifierSchema.optional(),
  })
  .strict()
  .superRefine((action, context) => {
    if (new Set(action.targetIds).size !== action.targetIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetIds'],
        message: 'Action target IDs must be unique',
      });
    }
    if (
      action.type === 'smartTransition' &&
      (!action.transitionId ||
        !action.parameters.transitionRecipes ||
        action.parameters.transitionRecipes.length === 0)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parameters', 'transitionRecipes'],
        message: 'Smart Transition actions require a transition id and at least one recipe',
      });
    }
    if (action.type !== 'smartTransition' && action.parameters.transitionRecipes !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parameters', 'transitionRecipes'],
        message: 'Transition recipes are only supported by Smart Transition actions',
      });
    }
    if (action.type !== 'smartTransition' && action.transitionId !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transitionId'],
        message: 'Transition IDs are only supported by Smart Transition actions',
      });
    }
  });

export const CameraFrameSchema = z
  .object({
    aspectRatio: z.enum(ASPECT_RATIOS),
    width: finiteNumberSchema.positive(),
    x: finiteNumberSchema,
    y: finiteNumberSchema,
  })
  .strict();

export const SceneStateElementSchema = z
  .object({
    id: identifierSchema,
    type: identifierSchema,
    x: finiteNumberSchema,
    y: finiteNumberSchema,
    width: finiteNumberSchema.nonnegative(),
    height: finiteNumberSchema.nonnegative(),
    angle: finiteNumberSchema,
    opacity: finiteNumberSchema.min(0).max(1),
    present: z.boolean(),
    groupIds: z.array(identifierSchema).max(64),
    boundElementIds: z.array(identifierSchema).max(256),
    containerId: identifierSchema.optional(),
    fileId: identifierSchema.optional(),
    label: z.string().max(PROJECT_LIMITS.maxNameLength).optional(),
  })
  .strict();

export const SceneStateSchema = z
  .object({
    id: identifierSchema,
    name: nameSchema,
    createdAt: z.string().datetime({ offset: true }),
    elements: z.array(SceneStateElementSchema).max(PROJECT_LIMITS.maxSceneElements),
    cameraFrame: CameraFrameSchema.optional(),
  })
  .strict()
  .superRefine((state, context) => {
    const ids = new Set<string>();
    for (const [index, element] of state.elements.entries()) {
      if (ids.has(element.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['elements', index, 'id'],
          message: `Duplicate scene-state element id "${element.id}"`,
        });
      }
      ids.add(element.id);
    }
  });

export const SceneElementMappingSchema = z
  .object({
    fromElementId: identifierSchema,
    toElementId: identifierSchema,
  })
  .strict();

export const SmartTransitionSettingsSchema = z
  .object({
    durationMs: finiteNumberSchema.positive().max(PROJECT_LIMITS.maxTimelineDurationMs),
    easing: z.enum(EASING_TYPES),
    staggerMs: finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs),
    includeCamera: z.boolean(),
  })
  .strict();

export const SceneTransitionSchema = z
  .object({
    id: identifierSchema,
    fromStateId: identifierSchema,
    toStateId: identifierSchema,
    mappings: z.array(SceneElementMappingSchema).max(PROJECT_LIMITS.maxSceneMappings),
    settings: SmartTransitionSettingsSchema,
    status: z.enum(SCENE_TRANSITION_STATUSES),
    managedActionId: identifierSchema.optional(),
  })
  .strict()
  .superRefine((transition, context) => {
    const fromIds = new Set<string>();
    const toIds = new Set<string>();
    for (const [index, mapping] of transition.mappings.entries()) {
      if (fromIds.has(mapping.fromElementId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mappings', index, 'fromElementId'],
          message: 'Each source element can be mapped only once',
        });
      }
      if (toIds.has(mapping.toElementId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['mappings', index, 'toElementId'],
          message: 'Each target element can be mapped only once',
        });
      }
      fromIds.add(mapping.fromElementId);
      toIds.add(mapping.toElementId);
    }
    if (transition.status !== 'draft' && !transition.managedActionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['managedActionId'],
        message: 'Accepted or customized transitions require a managed action',
      });
    }
    if (transition.status === 'draft' && transition.managedActionId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['managedActionId'],
        message: 'Draft transitions cannot own a managed action',
      });
    }
  });

const projectAuthoringMetadataShape = {
  version: z.literal(1),
  documentRevision: z.number().int().nonnegative(),
  timelineRevision: z.number().int().nonnegative(),
};

export const ProjectAuthoringMetadataSchema = z.object(projectAuthoringMetadataShape).strict();

export const ProjectAuthoringSchema = z
  .object({
    ...projectAuthoringMetadataShape,
    actions: z.array(AnimationActionSchema).max(PROJECT_LIMITS.maxTracks),
    sceneStates: z.array(SceneStateSchema).max(PROJECT_LIMITS.maxSceneStates).optional(),
    sceneTransitions: z
      .array(SceneTransitionSchema)
      .max(PROJECT_LIMITS.maxSceneTransitions)
      .optional(),
  })
  .strict()
  .superRefine((authoring, context) => {
    const actionIds = new Set<string>();
    for (const [actionIndex, action] of authoring.actions.entries()) {
      if (actionIds.has(action.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['actions', actionIndex, 'id'],
          message: `Duplicate action id "${action.id}"`,
        });
      }
      actionIds.add(action.id);
    }
    const stateIds = new Set<string>();
    for (const [stateIndex, state] of (authoring.sceneStates ?? []).entries()) {
      if (stateIds.has(state.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sceneStates', stateIndex, 'id'],
          message: `Duplicate scene state id "${state.id}"`,
        });
      }
      stateIds.add(state.id);
    }
    const transitionIds = new Set<string>();
    for (const [transitionIndex, transition] of (authoring.sceneTransitions ?? []).entries()) {
      if (transitionIds.has(transition.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sceneTransitions', transitionIndex, 'id'],
          message: `Duplicate scene transition id "${transition.id}"`,
        });
      }
      transitionIds.add(transition.id);
    }
  });

const clipStartSchema = finiteNumberSchema.nonnegative().max(PROJECT_LIMITS.maxTimelineDurationMs);
const clipEndSchema = finiteNumberSchema.positive().max(PROJECT_LIMITS.maxTimelineDurationMs);

export const PlaybackSchema = z
  .object({
    clipStart: clipStartSchema,
    clipEnd: clipEndSchema,
    cameraFrame: CameraFrameSchema,
  })
  .strict()
  .superRefine((playback, context) => {
    if (playback.clipEnd <= playback.clipStart) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clipEnd'],
        message: 'clipEnd must be greater than clipStart',
      });
    }
  });

export const ProjectSceneElementSchema = z
  .object({
    id: identifierSchema,
    type: z.string().min(1).max(PROJECT_LIMITS.maxIdentifierLength),
  })
  .passthrough();

export const ProjectSceneSchema = z
  .object({
    elements: z.array(ProjectSceneElementSchema).max(PROJECT_LIMITS.maxSceneElements),
    appState: z.record(z.unknown()).default({}),
    files: z.record(z.unknown()).default({}),
  })
  .strict()
  .superRefine((scene, context) => {
    const elementIds = new Set<string>();
    for (const [elementIndex, element] of scene.elements.entries()) {
      if (elementIds.has(element.id)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['elements', elementIndex, 'id'],
          message: `Duplicate scene element id "${element.id}"`,
        });
      }
      elementIds.add(element.id);

      const fileId = element['fileId'];
      if (typeof fileId === 'string' && fileId.length > 0 && !Object.hasOwn(scene.files, fileId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['elements', elementIndex, 'fileId'],
          message: `Scene element references missing file "${fileId}"`,
        });
      }
    }

    if (Object.keys(scene.files).length > PROJECT_LIMITS.maxSceneFiles) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['files'],
        message: `Scene exceeds ${PROJECT_LIMITS.maxSceneFiles} files`,
      });
    }
  });

export const ProjectMetadataSchema = z
  .object({
    id: identifierSchema,
    name: nameSchema,
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

export const ProjectDocumentSchema = z
  .object({
    version: z.literal(PROJECT_VERSION),
    metadata: ProjectMetadataSchema,
    scene: ProjectSceneSchema,
    timeline: AnimationTimelineSchema,
    playback: PlaybackSchema,
    authoring: ProjectAuthoringSchema.optional(),
    preferredWorkspace: z.enum(PREFERRED_WORKSPACES).optional(),
  })
  .strict()
  .superRefine((project, context) => {
    validateProjectRelationships(project, context);
  });

export const McpStateDeltaSchema = z
  .object({
    revision: z.number().int().positive(),
    sequence: z.number().int().positive(),
    baseRevision: z.number().int().nonnegative(),
    scene: z
      .object({
        upsert: z.array(ProjectSceneElementSchema).max(PROJECT_LIMITS.maxSceneElements),
        removed: z.array(identifierSchema).max(PROJECT_LIMITS.maxSceneElements),
        appState: z.record(z.unknown()).optional(),
        files: z.record(z.unknown()).optional(),
      })
      .strict()
      .optional(),
    timeline: z
      .object({
        upsertedTracks: z.array(AnimationTrackSchema).max(PROJECT_LIMITS.maxTracks),
        removedTrackIds: z.array(identifierSchema).max(PROJECT_LIMITS.maxTracks),
        meta: AnimationTimelineMetadataSchema.optional(),
      })
      .strict()
      .optional(),
    authoring: z
      .object({
        upsertedActions: z.array(AnimationActionSchema).max(PROJECT_LIMITS.maxTracks),
        removedActionIds: z.array(identifierSchema).max(PROJECT_LIMITS.maxTracks),
        upsertedSceneStates: z
          .array(SceneStateSchema)
          .max(PROJECT_LIMITS.maxSceneStates)
          .optional(),
        removedSceneStateIds: z
          .array(identifierSchema)
          .max(PROJECT_LIMITS.maxSceneStates)
          .optional(),
        upsertedSceneTransitions: z
          .array(SceneTransitionSchema)
          .max(PROJECT_LIMITS.maxSceneTransitions)
          .optional(),
        removedSceneTransitionIds: z
          .array(identifierSchema)
          .max(PROJECT_LIMITS.maxSceneTransitions)
          .optional(),
        meta: ProjectAuthoringMetadataSchema,
      })
      .strict()
      .optional(),
    project: z
      .object({
        version: z.literal(PROJECT_VERSION),
        metadata: ProjectMetadataSchema,
        preferredWorkspace: z.enum(PREFERRED_WORKSPACES).nullable().optional(),
      })
      .strict()
      .optional(),
    clipStart: clipStartSchema.optional(),
    clipEnd: clipEndSchema.optional(),
    cameraFrame: CameraFrameSchema.optional(),
  })
  .strict()
  .superRefine((delta, context) => {
    if (delta.baseRevision >= delta.revision) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['baseRevision'],
        message: 'baseRevision must be less than revision',
      });
    }
    if (
      !delta.scene &&
      !delta.timeline &&
      !delta.authoring &&
      !delta.project &&
      delta.clipStart === undefined &&
      delta.clipEnd === undefined &&
      !delta.cameraFrame
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'MCP state delta does not contain a state change',
      });
    }
    if ((delta.clipStart === undefined) !== (delta.clipEnd === undefined)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clipStart'],
        message: 'clipStart and clipEnd must be provided together',
      });
    }
    if (
      delta.clipStart !== undefined &&
      delta.clipEnd !== undefined &&
      delta.clipEnd <= delta.clipStart
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['clipEnd'],
        message: 'clipEnd must be greater than clipStart',
      });
    }
  });

const McpStateSnapshotMetadataSchema = z
  .object({
    clipStart: clipStartSchema,
    clipEnd: clipEndSchema,
    cameraFrame: CameraFrameSchema,
    revision: z.number().int().nonnegative(),
    sequence: z.number().int().nonnegative(),
  })
  .strict();

export const V1ProjectDocumentSchema = z
  .object({
    version: z.literal(V1_PROJECT_VERSION),
    id: identifierSchema,
    name: nameSchema,
    scene: ProjectSceneSchema,
    timeline: AnimationTimelineSchema,
    clipStart: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs)
      .optional(),
    clipEnd: finiteNumberSchema.positive().max(PROJECT_LIMITS.maxTimelineDurationMs).optional(),
    cameraFrame: CameraFrameSchema.optional(),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const legacyTransferSchema = z
  .object({
    name: nameSchema.optional(),
    scene: ProjectSceneSchema,
    timeline: AnimationTimelineSchema.nullish(),
    clipStart: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs)
      .optional(),
    clipEnd: finiteNumberSchema.positive().max(PROJECT_LIMITS.maxTimelineDurationMs).optional(),
    cameraFrame: CameraFrameSchema.nullish(),
    playback: PlaybackSchema.optional(),
    authoring: ProjectAuthoringSchema.optional(),
    preferredWorkspace: z.enum(PREFERRED_WORKSPACES).optional(),
  })
  .passthrough();

export type AnimatableProperty = (typeof ANIMATABLE_PROPERTIES)[number];
export type EasingType = (typeof EASING_TYPES)[number];
export type AspectRatio = (typeof ASPECT_RATIOS)[number];
export type PreferredWorkspace = (typeof PREFERRED_WORKSPACES)[number];
export type AnimationActionType = (typeof ANIMATION_ACTION_TYPES)[number];
export type AnimationActionStatus = (typeof ANIMATION_ACTION_STATUSES)[number];
export type ActionStartMode = (typeof ACTION_START_MODES)[number];
export type SlideDirection = (typeof SLIDE_DIRECTIONS)[number];
export type Keyframe = z.infer<typeof KeyframeSchema>;
export type AnimationTrack = z.infer<typeof AnimationTrackSchema>;
export type AnimationTimeline = z.infer<typeof AnimationTimelineSchema>;
export type AnimationActionTiming = z.infer<typeof AnimationActionTimingSchema>;
export type AnimationActionParameters = z.infer<typeof AnimationActionParametersSchema>;
export type TransitionPropertyRecipe = z.infer<typeof TransitionPropertyRecipeSchema>;
export type GeneratedContentOwnership = z.infer<typeof GeneratedContentOwnershipSchema>;
export type AnimationAction = z.infer<typeof AnimationActionSchema>;
export type SceneStateElement = z.infer<typeof SceneStateElementSchema>;
export type SceneState = z.infer<typeof SceneStateSchema>;
export type SceneElementMapping = z.infer<typeof SceneElementMappingSchema>;
export type SmartTransitionSettings = z.infer<typeof SmartTransitionSettingsSchema>;
export type SceneTransitionStatus = (typeof SCENE_TRANSITION_STATUSES)[number];
export type SceneTransition = z.infer<typeof SceneTransitionSchema>;
export type ProjectAuthoring = z.infer<typeof ProjectAuthoringSchema>;
export type CameraFrame = z.infer<typeof CameraFrameSchema>;
export type Playback = z.infer<typeof PlaybackSchema>;
export type ProjectScene = z.infer<typeof ProjectSceneSchema>;
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type ProjectDocument = z.infer<typeof ProjectDocumentSchema>;
export type V1ProjectDocument = z.infer<typeof V1ProjectDocumentSchema>;
export type McpStateDelta = z.infer<typeof McpStateDeltaSchema>;
export type McpStateSnapshot = ProjectDocument & z.infer<typeof McpStateSnapshotMetadataSchema>;

export interface ProjectContent {
  name?: string;
  scene: ProjectScene;
  timeline: AnimationTimeline;
  playback: Playback;
  authoring?: ProjectAuthoring;
  preferredWorkspace?: PreferredWorkspace;
}

export class ProjectValidationError extends Error {
  readonly details: readonly string[];

  constructor(message: string, details: readonly string[] = []) {
    super(message);
    this.name = 'ProjectValidationError';
    this.details = details;
  }
}

export function assertInputByteLimit(
  byteLength: number,
  limit = PROJECT_LIMITS.maxInputBytes,
  label = 'Project payload',
): void {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new ProjectValidationError(`${label} has an invalid byte length`);
  }
  if (byteLength > limit) {
    throw new ProjectValidationError(`${label} exceeds the ${formatBytes(limit)} limit`);
  }
}

export function decodeProjectDocument(json: string): ProjectDocument {
  assertInputByteLimit(new TextEncoder().encode(json).byteLength);
  return parseProjectDocument(parseJson(json, 'project'));
}

export function encodeProjectDocument(project: ProjectDocument): string {
  let json: string;
  try {
    json = JSON.stringify(project);
  } catch (error) {
    throw new ProjectValidationError(`Project could not be serialized: ${getErrorMessage(error)}`);
  }

  assertInputByteLimit(
    new TextEncoder().encode(json).byteLength,
    PROJECT_LIMITS.maxDecompressedBytes,
    'Serialized project',
  );
  const validated = parseProjectDocument(parseJson(json, 'project'));
  const encoded = JSON.stringify(validated);
  assertInputByteLimit(new TextEncoder().encode(encoded).byteLength, PROJECT_LIMITS.maxInputBytes);
  return encoded;
}

export function parseProjectDocument(input: unknown): ProjectDocument {
  assertResourceSafety(input);
  const version = readVersion(input);

  if (version === PROJECT_VERSION) {
    return parseWithSchema(ProjectDocumentSchema, input, 'Invalid V2 project');
  }
  if (version === V1_PROJECT_VERSION) {
    return migrateV1Project(input);
  }

  throw new ProjectValidationError(`Unsupported project version "${version ?? 'missing'}"`);
}

export function parseMcpStateDelta(input: unknown): McpStateDelta {
  assertResourceSafety(input);
  return parseWithSchema(McpStateDeltaSchema, input, 'Invalid MCP state delta');
}

export function parseMcpStateSnapshot(input: unknown): McpStateSnapshot {
  assertResourceSafety(input);
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ProjectValidationError('Invalid MCP state snapshot');
  }

  const { clipStart, clipEnd, cameraFrame, revision, sequence, ...projectInput } = input as Record<
    string,
    unknown
  >;
  const project = parseProjectDocument(projectInput);
  const transport = parseWithSchema(
    McpStateSnapshotMetadataSchema,
    { clipStart, clipEnd, cameraFrame, revision, sequence },
    'Invalid MCP state snapshot metadata',
  );
  if (
    transport.clipStart !== project.playback.clipStart ||
    transport.clipEnd !== project.playback.clipEnd ||
    JSON.stringify(transport.cameraFrame) !== JSON.stringify(project.playback.cameraFrame)
  ) {
    throw new ProjectValidationError(
      'MCP state snapshot playback metadata does not match the project document',
    );
  }
  return { ...project, ...transport };
}

export function migrateV1Project(input: unknown): ProjectDocument {
  assertResourceSafety(input);
  const version = readVersion(input);
  if (version === PROJECT_VERSION) {
    return parseWithSchema(ProjectDocumentSchema, input, 'Invalid V2 project');
  }
  if (version !== V1_PROJECT_VERSION) {
    throw new ProjectValidationError(
      `Expected project version "${V1_PROJECT_VERSION}" or "${PROJECT_VERSION}"`,
    );
  }

  const legacy = parseWithSchema(V1ProjectDocumentSchema, input, 'Invalid V1 project');
  const clipStart = legacy.clipStart ?? 0;
  const clipEnd = legacy.clipEnd ?? legacy.timeline.duration;
  const migrated: ProjectDocument = {
    version: PROJECT_VERSION,
    metadata: {
      id: legacy.id,
      name: legacy.name,
      createdAt: legacy.createdAt,
      updatedAt: legacy.updatedAt,
    },
    scene: legacy.scene,
    timeline: legacy.timeline,
    playback: {
      clipStart,
      clipEnd,
      cameraFrame: legacy.cameraFrame ?? createDefaultCameraFrame(),
    },
    preferredWorkspace: legacy.timeline.tracks.length > 0 ? 'studio' : 'magic',
  };

  return parseWithSchema(ProjectDocumentSchema, migrated, 'Migrated project is invalid');
}

export function parseProjectContent(input: unknown): ProjectContent {
  assertResourceSafety(input);
  const version = readVersion(input);
  if (version !== undefined) {
    const project = parseProjectDocument(input);
    return {
      name: project.metadata.name,
      scene: project.scene,
      timeline: project.timeline,
      playback: project.playback,
      authoring: project.authoring,
      preferredWorkspace: project.preferredWorkspace,
    };
  }

  const transfer = parseWithSchema(legacyTransferSchema, input, 'Invalid project transfer payload');
  const timeline = transfer.timeline ?? createDefaultTimeline();
  const playback =
    transfer.playback ??
    ({
      clipStart: transfer.clipStart ?? 0,
      clipEnd: transfer.clipEnd ?? timeline.duration,
      cameraFrame: transfer.cameraFrame ?? createDefaultCameraFrame(),
    } satisfies Playback);
  const content: ProjectContent = {
    name: transfer.name,
    scene: transfer.scene,
    timeline,
    playback,
    authoring: transfer.authoring,
    preferredWorkspace: transfer.preferredWorkspace,
  };

  validateContentRelationships(content);
  return content;
}

export function decodeProjectContent(json: string): ProjectContent {
  assertInputByteLimit(new TextEncoder().encode(json).byteLength);
  return parseProjectContent(parseJson(json, 'project transfer payload'));
}

export function createDefaultTimeline(): AnimationTimeline {
  return {
    id: 'timeline',
    name: 'Animation 1',
    duration: 30_000,
    fps: 60,
    tracks: [],
  };
}

export function createDefaultCameraFrame(): CameraFrame {
  return {
    aspectRatio: '16:9',
    width: 1280,
    x: 640,
    y: 360,
  };
}

function validateProjectRelationships(project: ProjectDocument, context: z.RefinementCtx): void {
  const sceneElementIds = new Set(project.scene.elements.map((element) => element.id));
  for (const [trackIndex, track] of project.timeline.tracks.entries()) {
    if (
      track.targetType === 'element' &&
      track.targetId !== CAMERA_FRAME_TARGET_ID &&
      !sceneElementIds.has(track.targetId)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['timeline', 'tracks', trackIndex, 'targetId'],
        message: `Track references missing scene element "${track.targetId}"`,
      });
    }
  }

  if (!project.authoring) return;
  const tracksById = new Map(project.timeline.tracks.map((track) => [track.id, track]));
  for (const [actionIndex, action] of project.authoring.actions.entries()) {
    for (const [ownershipIndex, ownership] of action.ownership.entries()) {
      const track = tracksById.get(ownership.trackId);
      if (!track) {
        if (action.status === 'managed' || action.status === 'customized') {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['authoring', 'actions', actionIndex, 'ownership', ownershipIndex, 'trackId'],
            message: `Action references missing generated track "${ownership.trackId}"`,
          });
        }
        continue;
      }
      if (track.targetId !== ownership.targetId || track.property !== ownership.property) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authoring', 'actions', actionIndex, 'ownership', ownershipIndex],
          message: 'Action ownership does not match its generated track',
        });
      }
      const keyframeIds = new Set(track.keyframes.map((keyframe) => keyframe.id));
      if (ownership.keyframeIds.some((keyframeId) => !keyframeIds.has(keyframeId))) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authoring', 'actions', actionIndex, 'ownership', ownershipIndex, 'keyframeIds'],
          message: 'Action references a missing generated keyframe',
        });
      }
    }
  }

  const sceneStates = project.authoring.sceneStates ?? [];
  const stateById = new Map(sceneStates.map((state) => [state.id, state]));
  for (const [stateIndex, state] of sceneStates.entries()) {
    for (const [elementIndex, element] of state.elements.entries()) {
      if (element.fileId && !Object.hasOwn(project.scene.files, element.fileId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authoring', 'sceneStates', stateIndex, 'elements', elementIndex, 'fileId'],
          message: `Scene state references missing shared file "${element.fileId}"`,
        });
      }
    }
  }

  const actionById = new Map(project.authoring.actions.map((action) => [action.id, action]));
  const transitions = project.authoring.sceneTransitions ?? [];
  const transitionById = new Map(transitions.map((transition) => [transition.id, transition]));
  for (const [transitionIndex, transition] of transitions.entries()) {
    const fromState = stateById.get(transition.fromStateId);
    const toState = stateById.get(transition.toStateId);
    if (!fromState || !toState) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['authoring', 'sceneTransitions', transitionIndex],
        message: 'Scene transition references a missing scene state',
      });
      continue;
    }
    const fromElementIds = new Set(fromState.elements.map((element) => element.id));
    const toElementIds = new Set(toState.elements.map((element) => element.id));
    for (const [mappingIndex, mapping] of transition.mappings.entries()) {
      if (!fromElementIds.has(mapping.fromElementId) || !toElementIds.has(mapping.toElementId)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authoring', 'sceneTransitions', transitionIndex, 'mappings', mappingIndex],
          message: 'Scene transition mapping references a missing state element',
        });
      }
    }
    if (transition.managedActionId) {
      const action = actionById.get(transition.managedActionId);
      if (!action || action.type !== 'smartTransition' || action.transitionId !== transition.id) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['authoring', 'sceneTransitions', transitionIndex, 'managedActionId'],
          message: 'Scene transition references a stale managed action',
        });
      }
    }
  }
  for (const [actionIndex, action] of project.authoring.actions.entries()) {
    if (!action.transitionId) continue;
    const transition = transitionById.get(action.transitionId);
    if (!transition) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['authoring', 'actions', actionIndex, 'transitionId'],
        message: 'Smart Transition action references a missing transition',
      });
      continue;
    }
    if (transition.managedActionId !== action.id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['authoring', 'actions', actionIndex, 'transitionId'],
        message: 'Smart Transition action is missing its reciprocal transition ownership',
      });
    }
    const compatibleStatus =
      (transition.status === 'accepted' &&
        (action.status === 'managed' || action.status === 'disabled')) ||
      (transition.status === 'customized' && action.status === 'customized') ||
      (transition.status === 'detached' && action.status === 'detached');
    if (!compatibleStatus) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['authoring', 'actions', actionIndex, 'status'],
        message: 'Smart Transition action and transition statuses are inconsistent',
      });
    }
  }
}

function validateContentRelationships(content: ProjectContent): void {
  const syntheticProject: ProjectDocument = {
    version: PROJECT_VERSION,
    metadata: {
      id: 'transfer',
      name: content.name ?? '',
      createdAt: new Date(0).toISOString(),
      updatedAt: new Date(0).toISOString(),
    },
    scene: content.scene,
    timeline: content.timeline,
    playback: content.playback,
    authoring: content.authoring,
    preferredWorkspace: content.preferredWorkspace,
  };
  parseWithSchema(ProjectDocumentSchema, syntheticProject, 'Invalid project transfer payload');
}

function assertResourceSafety(input: unknown): void {
  const stack: Array<{ value: unknown; depth: number; exit?: boolean }> = [
    { value: input, depth: 0 },
  ];
  const activeObjects = new WeakSet<object>();
  let visitedValues = 0;

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) break;
    const { value, depth, exit } = item;
    if (exit && typeof value === 'object' && value !== null) {
      activeObjects.delete(value);
      continue;
    }
    visitedValues += 1;

    if (visitedValues > PROJECT_LIMITS.maxVisitedValues) {
      throw new ProjectValidationError('Project contains too many values');
    }
    if (depth > PROJECT_LIMITS.maxNestingDepth) {
      throw new ProjectValidationError('Project nesting is too deep');
    }
    if (typeof value === 'string') {
      if (value.length > PROJECT_LIMITS.maxStringLength) {
        throw new ProjectValidationError('Project contains an oversized string');
      }
      continue;
    }
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || Math.abs(value) > PROJECT_LIMITS.maxAbsoluteNumber) {
        throw new ProjectValidationError('Project contains an invalid numeric value');
      }
      continue;
    }
    if (typeof value !== 'object' || value === null) continue;
    if (activeObjects.has(value)) {
      throw new ProjectValidationError('Project contains a circular reference');
    }
    activeObjects.add(value);
    stack.push({ value, depth, exit: true });

    if (Array.isArray(value)) {
      if (value.length > PROJECT_LIMITS.maxCollectionItems) {
        throw new ProjectValidationError('Project contains an oversized array');
      }
      for (const child of value) {
        stack.push({ value: child, depth: depth + 1 });
      }
      continue;
    }

    const entries = Object.entries(value);
    if (entries.length > PROJECT_LIMITS.maxCollectionItems) {
      throw new ProjectValidationError('Project contains an oversized object');
    }
    for (const [key, child] of entries) {
      if (key.length > PROJECT_LIMITS.maxIdentifierLength) {
        throw new ProjectValidationError('Project contains an oversized key');
      }
      stack.push({ value: child, depth: depth + 1 });
    }
  }
}

function parseJson(json: string, label: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    throw new ProjectValidationError(`Invalid JSON: failed to parse ${label}`);
  }
}

function parseWithSchema<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
  message: string,
): T {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const details = result.error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join('.') : 'document';
    return `${path}: ${issue.message}`;
  });
  throw new ProjectValidationError(`${message}: ${details[0]}`, details);
}

function readVersion(input: unknown): string | undefined {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return undefined;
  }
  const version = Reflect.get(input, 'version');
  return typeof version === 'string' ? version : undefined;
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MiB`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown error';
}
