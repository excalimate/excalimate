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
] as const;
export const ANIMATION_ACTION_STATUSES = [
  'managed',
  'customized',
  'disabled',
  'detached',
] as const;
export const ACTION_START_MODES = [
  'absolute',
  'afterPrevious',
  'withPrevious',
] as const;
export const SLIDE_DIRECTIONS = ['left', 'right', 'up', 'down'] as const;

const identifierSchema = z
  .string()
  .min(1)
  .max(PROJECT_LIMITS.maxIdentifierLength);
const nameSchema = z.string().max(PROJECT_LIMITS.maxNameLength);
const finiteNumberSchema = z
  .number()
  .finite()
  .min(-PROJECT_LIMITS.maxAnimationValue)
  .max(PROJECT_LIMITS.maxAnimationValue);

export const KeyframeSchema = z
  .object({
    id: identifierSchema,
    time: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
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
    keyframes: z
      .array(KeyframeSchema)
      .max(PROJECT_LIMITS.maxKeyframesPerTrack),
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

export const AnimationTimelineSchema = z
  .object({
    id: identifierSchema,
    name: nameSchema,
    duration: finiteNumberSchema
      .positive()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
    fps: finiteNumberSchema.int().min(1).max(240),
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
    startMs: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
    durationMs: finiteNumberSchema
      .positive()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
    staggerMs: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
    startMode: z.enum(ACTION_START_MODES),
  })
  .strict();

export const AnimationActionParametersSchema = z
  .object({
    direction: z.enum(SLIDE_DIRECTIONS).optional(),
    distance: finiteNumberSchema.nonnegative().optional(),
    from: finiteNumberSchema.optional(),
    to: finiteNumberSchema.optional(),
    property: z.enum(ANIMATABLE_PROPERTIES).optional(),
    x: finiteNumberSchema.optional(),
    y: finiteNumberSchema.optional(),
    scale: finiteNumberSchema.positive().optional(),
    rotation: finiteNumberSchema.optional(),
  })
  .strict();

export const GeneratedContentOwnershipSchema = z
  .object({
    trackId: identifierSchema,
    targetId: identifierSchema,
    property: z.enum(ANIMATABLE_PROPERTIES),
    keyframeIds: z
      .array(identifierSchema)
      .max(PROJECT_LIMITS.maxKeyframesPerTrack),
    startMs: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
    endMs: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
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
    targetIds: z
      .array(identifierSchema)
      .min(1)
      .max(PROJECT_LIMITS.maxSceneElements),
    timing: AnimationActionTimingSchema,
    easing: z.enum(EASING_TYPES),
    parameters: AnimationActionParametersSchema,
    ownership: z
      .array(GeneratedContentOwnershipSchema)
      .max(PROJECT_LIMITS.maxTracks),
    generatedHash: identifierSchema,
    status: z.enum(ANIMATION_ACTION_STATUSES),
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
  });

export const ProjectAuthoringSchema = z
  .object({
    version: z.literal(1),
    documentRevision: z.number().int().nonnegative(),
    timelineRevision: z.number().int().nonnegative(),
    actions: z.array(AnimationActionSchema).max(PROJECT_LIMITS.maxTracks),
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
  });

export const CameraFrameSchema = z
  .object({
    aspectRatio: z.enum(ASPECT_RATIOS),
    width: finiteNumberSchema.positive(),
    x: finiteNumberSchema,
    y: finiteNumberSchema,
  })
  .strict();

export const PlaybackSchema = z
  .object({
    clipStart: finiteNumberSchema
      .nonnegative()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
    clipEnd: finiteNumberSchema
      .positive()
      .max(PROJECT_LIMITS.maxTimelineDurationMs),
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

const sceneElementSchema = z
  .object({
    id: identifierSchema,
    type: z.string().min(1).max(PROJECT_LIMITS.maxIdentifierLength),
  })
  .passthrough();

export const ProjectSceneSchema = z
  .object({
    elements: z
      .array(sceneElementSchema)
      .max(PROJECT_LIMITS.maxSceneElements),
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
      if (
        typeof fileId === 'string' &&
        fileId.length > 0 &&
        !Object.hasOwn(scene.files, fileId)
      ) {
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
    clipEnd: finiteNumberSchema
      .positive()
      .max(PROJECT_LIMITS.maxTimelineDurationMs)
      .optional(),
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
    clipEnd: finiteNumberSchema
      .positive()
      .max(PROJECT_LIMITS.maxTimelineDurationMs)
      .optional(),
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
export type GeneratedContentOwnership = z.infer<typeof GeneratedContentOwnershipSchema>;
export type AnimationAction = z.infer<typeof AnimationActionSchema>;
export type ProjectAuthoring = z.infer<typeof ProjectAuthoringSchema>;
export type CameraFrame = z.infer<typeof CameraFrameSchema>;
export type Playback = z.infer<typeof PlaybackSchema>;
export type ProjectScene = z.infer<typeof ProjectSceneSchema>;
export type ProjectMetadata = z.infer<typeof ProjectMetadataSchema>;
export type ProjectDocument = z.infer<typeof ProjectDocumentSchema>;
export type V1ProjectDocument = z.infer<typeof V1ProjectDocumentSchema>;

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
    throw new ProjectValidationError(
      `${label} exceeds the ${formatBytes(limit)} limit`,
    );
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
    throw new ProjectValidationError(
      `Project could not be serialized: ${getErrorMessage(error)}`,
    );
  }

  assertInputByteLimit(
    new TextEncoder().encode(json).byteLength,
    PROJECT_LIMITS.maxDecompressedBytes,
    'Serialized project',
  );
  const validated = parseProjectDocument(parseJson(json, 'project'));
  const encoded = JSON.stringify(validated);
  assertInputByteLimit(
    new TextEncoder().encode(encoded).byteLength,
    PROJECT_LIMITS.maxInputBytes,
  );
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

  throw new ProjectValidationError(
    `Unsupported project version "${version ?? 'missing'}"`,
  );
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

  const legacy = parseWithSchema(
    V1ProjectDocumentSchema,
    input,
    'Invalid V1 project',
  );
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
    preferredWorkspace:
      legacy.timeline.tracks.length > 0 ? 'studio' : 'magic',
  };

  return parseWithSchema(
    ProjectDocumentSchema,
    migrated,
    'Migrated project is invalid',
  );
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

  const transfer = parseWithSchema(
    legacyTransferSchema,
    input,
    'Invalid project transfer payload',
  );
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

function validateProjectRelationships(
  project: ProjectDocument,
  context: z.RefinementCtx,
): void {
  const sceneElementIds = new Set(
    project.scene.elements.map((element) => element.id),
  );
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
  const tracksById = new Map(
    project.timeline.tracks.map((track) => [track.id, track]),
  );
  for (const [actionIndex, action] of project.authoring.actions.entries()) {
    for (const [ownershipIndex, ownership] of action.ownership.entries()) {
      const track = tracksById.get(ownership.trackId);
      if (!track) {
        if (action.status === 'managed' || action.status === 'customized') {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            path: [
              'authoring',
              'actions',
              actionIndex,
              'ownership',
              ownershipIndex,
              'trackId',
            ],
            message: `Action references missing generated track "${ownership.trackId}"`,
          });
        }
        continue;
      }
      if (
        track.targetId !== ownership.targetId ||
        track.property !== ownership.property
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            'authoring',
            'actions',
            actionIndex,
            'ownership',
            ownershipIndex,
          ],
          message: 'Action ownership does not match its generated track',
        });
      }
      const keyframeIds = new Set(track.keyframes.map((keyframe) => keyframe.id));
      if (
        ownership.keyframeIds.some(
          (keyframeId) => !keyframeIds.has(keyframeId),
        )
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [
            'authoring',
            'actions',
            actionIndex,
            'ownership',
            ownershipIndex,
            'keyframeIds',
          ],
          message: 'Action references a missing generated keyframe',
        });
      }
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
  parseWithSchema(
    ProjectDocumentSchema,
    syntheticProject,
    'Invalid project transfer payload',
  );
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
      if (
        !Number.isFinite(value) ||
        Math.abs(value) > PROJECT_LIMITS.maxAbsoluteNumber
      ) {
        throw new ProjectValidationError(
          'Project contains an invalid numeric value',
        );
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
