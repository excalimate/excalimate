/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { getRequestId } from '../requestContext.js';
import {
  createDefaultState,
  parseServerState,
  reconcileManagedActionMutations,
  serializeServerState,
} from '../state.js';
import type { AnimationAction, ServerState } from '../types.js';
import {
  assertInputWithinLimits,
  assertStateWithinLimits,
  mergeResourceLimits,
} from './limits.js';
import type { ResourceLimits } from './limits.js';

type DirtyArea =
  | 'scene'
  | 'timeline'
  | 'clip'
  | 'cameraFrame'
  | 'authoring'
  | 'project';

export interface StateDelta {
  revision: number;
  sequence: number;
  baseRevision: number;
  scene?: {
    upsert: any[];
    removed: string[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
  timeline?: {
    upsertedTracks: any[];
    removedTrackIds: string[];
    meta?: {
      id: string;
      name: string;
      duration: number;
      fps: number;
    };
  };
  authoring?: {
    upsertedActions: AnimationAction[];
    removedActionIds: string[];
    meta: {
      version: 1;
      documentRevision: number;
      timelineRevision: number;
    };
  };
  project?: {
    version: ServerState['version'];
    metadata: ServerState['metadata'];
    preferredWorkspace?: ServerState['preferredWorkspace'];
  };
  clipStart?: number;
  clipEnd?: number;
  cameraFrame?: ServerState['playback']['cameraFrame'];
}

export type StateChangeListener = (delta: StateDelta) => void;

export type StateSnapshot = ServerState & {
  clipStart: number;
  clipEnd: number;
  cameraFrame: ServerState['playback']['cameraFrame'];
  revision: number;
  sequence: number;
};

export interface StateContextOptions {
  resourceLimits?: Partial<ResourceLimits>;
}

export interface StateContext {
  readonly limits: ResourceLimits;
  getState: () => ServerState;
  getRevision: () => number;
  getSequence: () => number;
  getSnapshot: () => StateSnapshot;
  getStateJSON: () => string;
  getSceneElementsJSON: () => string;
  getTimelineJSON: () => string;
  updateState: (newState: ServerState) => void;
  emitChange: () => void;
  close: () => void;
  markDirty: (area: DirtyArea | 'all') => void;
  tool: (
    name: string,
    description: string,
    schema: any,
    handler: (args: any) => Promise<any>,
  ) => void;
  mutatingTool: (
    name: string,
    description: string,
    schema: any,
    handler: (args: any) => Promise<any>,
    dirtyAreas?: DirtyArea[],
  ) => void;
}

const ALL_DIRTY_AREAS: readonly DirtyArea[] = [
  'scene',
  'timeline',
  'clip',
  'cameraFrame',
  'authoring',
  'project',
];

const STRIP_ELEMENT_KEYS = new Set([
  'seed',
  'versionNonce',
  'updated',
  'link',
  'locked',
  'roundness',
  'boundElements',
  'lastCommittedPoint',
  'startBinding',
  'endBinding',
  'originalText',
  'autoResize',
  'baseline',
]);

function stripElement(element: any): any {
  const stripped: any = {};
  for (const key of Object.keys(element)) {
    if (!STRIP_ELEMENT_KEYS.has(key)) stripped[key] = element[key];
  }
  return stripped;
}

function fingerprint(value: unknown): string {
  return JSON.stringify(value);
}

function computeSceneDelta(
  previous: ServerState,
  current: ServerState,
): StateDelta['scene'] | undefined {
  const previousElements = new Map(
    previous.scene.elements.map((element) => [
      element.id,
      fingerprint(element),
    ]),
  );
  const currentIds = new Set<string>();
  const upsert: any[] = [];

  for (const element of current.scene.elements) {
    currentIds.add(element.id);
    if (previousElements.get(element.id) !== fingerprint(element)) {
      upsert.push(stripElement(element));
    }
  }

  const removed = [...previousElements.keys()].filter(
    (id) => !currentIds.has(id),
  );
  const appStateChanged =
    fingerprint(previous.scene.appState) !== fingerprint(current.scene.appState);
  const filesChanged =
    fingerprint(previous.scene.files) !== fingerprint(current.scene.files);
  if (
    upsert.length === 0 &&
    removed.length === 0 &&
    !appStateChanged &&
    !filesChanged
  ) {
    return undefined;
  }
  return {
    upsert,
    removed,
    ...(appStateChanged ? { appState: current.scene.appState } : {}),
    ...(filesChanged ? { files: current.scene.files } : {}),
  };
}

function computeTimelineDelta(
  previous: ServerState,
  current: ServerState,
): StateDelta['timeline'] | undefined {
  const previousTracks = new Map(
    previous.timeline.tracks.map((track) => [track.id, fingerprint(track)]),
  );
  const currentTrackIds = new Set<string>();
  const upsertedTracks = [];

  for (const track of current.timeline.tracks) {
    currentTrackIds.add(track.id);
    if (previousTracks.get(track.id) !== fingerprint(track)) {
      upsertedTracks.push(track);
    }
  }

  const removedTrackIds = [...previousTracks.keys()].filter(
    (id) => !currentTrackIds.has(id),
  );
  const previousMeta = {
    id: previous.timeline.id,
    name: previous.timeline.name,
    duration: previous.timeline.duration,
    fps: previous.timeline.fps,
  };
  const currentMeta = {
    id: current.timeline.id,
    name: current.timeline.name,
    duration: current.timeline.duration,
    fps: current.timeline.fps,
  };
  const metaChanged = fingerprint(previousMeta) !== fingerprint(currentMeta);

  if (
    upsertedTracks.length === 0 &&
    removedTrackIds.length === 0 &&
    !metaChanged
  ) {
    return undefined;
  }
  return {
    upsertedTracks,
    removedTrackIds,
    ...(metaChanged ? { meta: currentMeta } : {}),
  };
}

function computeAuthoringDelta(
  previous: ServerState,
  current: ServerState,
): StateDelta['authoring'] | undefined {
  const previousAuthoring = previous.authoring;
  const currentAuthoring = current.authoring;
  if (!previousAuthoring && !currentAuthoring) return undefined;

  const previousActions = new Map(
    (previousAuthoring?.actions ?? []).map((action) => [
      action.id,
      fingerprint(action),
    ]),
  );
  const currentActionIds = new Set<string>();
  const upsertedActions: AnimationAction[] = [];
  for (const action of currentAuthoring?.actions ?? []) {
    currentActionIds.add(action.id);
    if (previousActions.get(action.id) !== fingerprint(action)) {
      upsertedActions.push(action);
    }
  }
  const removedActionIds = [...previousActions.keys()].filter(
    (id) => !currentActionIds.has(id),
  );
  const meta = {
    version: 1 as const,
    documentRevision: currentAuthoring?.documentRevision ?? 0,
    timelineRevision: currentAuthoring?.timelineRevision ?? 0,
  };
  const previousMeta = {
    version: 1 as const,
    documentRevision: previousAuthoring?.documentRevision ?? 0,
    timelineRevision: previousAuthoring?.timelineRevision ?? 0,
  };
  if (
    upsertedActions.length === 0 &&
    removedActionIds.length === 0 &&
    fingerprint(meta) === fingerprint(previousMeta)
  ) {
    return undefined;
  }
  return { upsertedActions, removedActionIds, meta };
}

function computeProjectDelta(
  previous: ServerState,
  current: ServerState,
): StateDelta['project'] | undefined {
  const previousProject = {
    version: previous.version,
    metadata: previous.metadata,
    preferredWorkspace: previous.preferredWorkspace,
  };
  const currentProject = {
    version: current.version,
    metadata: current.metadata,
    preferredWorkspace: current.preferredWorkspace,
  };
  return fingerprint(previousProject) === fingerprint(currentProject)
    ? undefined
    : currentProject;
}

export function computeStateDelta(
  previous: ServerState,
  current: ServerState,
  metadata: Pick<StateDelta, 'revision' | 'sequence' | 'baseRevision'>,
  areas: ReadonlySet<DirtyArea> = new Set(ALL_DIRTY_AREAS),
): StateDelta | null {
  const delta: StateDelta = { ...metadata };
  if (areas.has('scene')) delta.scene = computeSceneDelta(previous, current);
  if (areas.has('timeline')) {
    delta.timeline = computeTimelineDelta(previous, current);
  }
  if (areas.has('authoring')) {
    delta.authoring = computeAuthoringDelta(previous, current);
  }
  if (areas.has('project')) {
    delta.project = computeProjectDelta(previous, current);
  }
  if (
    areas.has('clip') &&
    (previous.playback.clipStart !== current.playback.clipStart ||
      previous.playback.clipEnd !== current.playback.clipEnd)
  ) {
    delta.clipStart = current.playback.clipStart;
    delta.clipEnd = current.playback.clipEnd;
  }
  if (
    areas.has('cameraFrame') &&
    fingerprint(previous.playback.cameraFrame) !==
      fingerprint(current.playback.cameraFrame)
  ) {
    delta.cameraFrame = current.playback.cameraFrame;
  }

  return delta.scene ||
    delta.timeline ||
    delta.authoring ||
    delta.project ||
    delta.clipStart !== undefined ||
    delta.cameraFrame
    ? delta
    : null;
}

function cloneState(state: ServerState): ServerState {
  return parseServerState(JSON.parse(serializeServerState(state)));
}

function isMcpError(error: unknown): error is McpError {
  return error instanceof McpError;
}

export function createStateContext(
  server: McpServer,
  onStateChange?: StateChangeListener,
  options: StateContextOptions = {},
): StateContext {
  const limits = mergeResourceLimits(options.resourceLimits);
  let state = createDefaultState();
  let lastPublishedState = cloneState(state);
  let revision = 0;
  let sequence = 0;
  let closed = false;
  let pendingDirtyAreas = new Set<DirtyArea>();
  const mutationTimestamps: number[] = [];
  let stateJsonCache: {
    revision: number;
    sequence: number;
    json: string;
  } | null = null;
  let mutationQueue: Promise<void> = Promise.resolve();

  assertStateWithinLimits(state, limits);

  function markDirty(area: DirtyArea | 'all'): void {
    if (area === 'all') {
      pendingDirtyAreas = new Set(ALL_DIRTY_AREAS);
    } else {
      pendingDirtyAreas.add(area);
    }
  }

  function publishChange(
    previous: ServerState,
    areas: ReadonlySet<DirtyArea>,
  ): void {
    const nextRevision = revision + 1;
    const nextSequence = sequence + 1;
    const delta = computeStateDelta(
      previous,
      state,
      {
        revision: nextRevision,
        sequence: nextSequence,
        baseRevision: revision,
      },
      areas,
    );
    if (!delta) return;

    revision = nextRevision;
    sequence = nextSequence;
    stateJsonCache = null;
    lastPublishedState = cloneState(state);
    try {
      onStateChange?.(structuredClone(delta));
    } catch {
      const requestId = getRequestId();
      console.error(
        `[excalimate] State listener failed (request ID: ${requestId})`,
      );
    }
  }

  function emitChange(): void {
    assertStateWithinLimits(state, limits);
    const areas =
      pendingDirtyAreas.size > 0
        ? new Set(pendingDirtyAreas)
        : new Set<DirtyArea>(ALL_DIRTY_AREAS);
    pendingDirtyAreas.clear();
    publishChange(lastPublishedState, areas);
  }

  function assertMutationAllowed(): void {
    const now = Date.now();
    while (
      mutationTimestamps.length > 0 &&
      mutationTimestamps[0] <= now - limits.mutationWindowMs
    ) {
      mutationTimestamps.shift();
    }
    if (mutationTimestamps.length >= limits.maxMutationsPerWindow) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Mutation rate limit exceeded; retry after ${limits.mutationWindowMs}ms`,
      );
    }
    mutationTimestamps.push(now);
  }

  function bumpDocumentRevisions(previous: ServerState): void {
    const timelineChanged =
      fingerprint(previous.timeline) !== fingerprint(state.timeline);
    const previousAuthoring = previous.authoring ?? {
      version: 1 as const,
      documentRevision: 0,
      timelineRevision: 0,
      actions: [],
    };
    const currentAuthoring = state.authoring ?? {
      version: 1 as const,
      documentRevision: 0,
      timelineRevision: 0,
      actions: [],
    };
    state = {
      ...state,
      metadata: {
        ...state.metadata,
        updatedAt: new Date().toISOString(),
      },
      authoring: {
        ...currentAuthoring,
        documentRevision: previousAuthoring.documentRevision + 1,
        timelineRevision:
          previousAuthoring.timelineRevision + (timelineChanged ? 1 : 0),
      },
    };
  }

  async function runSafely<T>(
    name: string,
    handler: () => Promise<T>,
  ): Promise<T> {
    if (closed) {
      throw new McpError(ErrorCode.ConnectionClosed, 'MCP session is closed');
    }
    try {
      return await handler();
    } catch (error) {
      if (isMcpError(error)) throw error;
      const requestId = getRequestId();
      console.error(
        `[excalimate] Tool "${name}" failed (request ID: ${requestId})`,
      );
      throw new McpError(
        ErrorCode.InternalError,
        `Internal tool error (request ID: ${requestId})`,
      );
    }
  }

  const tool: StateContext['tool'] = (
    name,
    description,
    schema,
    handler,
  ) => {
    server.tool(name, description, schema, async (args: any) =>
      runSafely(name, async () => {
        assertInputWithinLimits(args, limits);
        return handler(args);
      }),
    );
  };

  const mutatingTool: StateContext['mutatingTool'] = (
    name,
    description,
    schema,
    handler,
    dirtyAreas,
  ) => {
    server.tool(name, description, schema, async (args: any) => {
      const operation = mutationQueue.then(() =>
        runSafely(name, async () => {
          assertMutationAllowed();
          assertInputWithinLimits(args, limits);
          const previous = cloneState(state);
          const previousJson = serializeServerState(previous);
          pendingDirtyAreas.clear();

          try {
            const result = await handler(args);
            if (closed) {
              throw new McpError(
                ErrorCode.ConnectionClosed,
                'MCP session is closed',
              );
            }
            state = reconcileManagedActionMutations(state);
            if (serializeServerState(state) !== previousJson) {
              bumpDocumentRevisions(previous);
              assertStateWithinLimits(state, limits);
              const areas = dirtyAreas
                ? new Set(dirtyAreas)
                : pendingDirtyAreas.size > 0
                  ? new Set(pendingDirtyAreas)
                  : new Set<DirtyArea>(ALL_DIRTY_AREAS);
              publishChange(previous, areas);
            }
            pendingDirtyAreas.clear();
            return result;
          } catch (error) {
            state = previous;
            pendingDirtyAreas.clear();
            throw error;
          }
        }),
      );
      mutationQueue = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    });
  };

  function getSnapshot(): StateSnapshot {
    const project = cloneState(state);
    return {
      ...project,
      clipStart: project.playback.clipStart,
      clipEnd: project.playback.clipEnd,
      cameraFrame: project.playback.cameraFrame,
      revision,
      sequence,
    };
  }

  return {
    limits,
    getState: () => state,
    getRevision: () => revision,
    getSequence: () => sequence,
    getSnapshot,
    getStateJSON: () => {
      if (
        stateJsonCache &&
        stateJsonCache.revision === revision &&
        stateJsonCache.sequence === sequence
      ) {
        return stateJsonCache.json;
      }
      const json = JSON.stringify(getSnapshot());
      stateJsonCache = { revision, sequence, json };
      return json;
    },
    getSceneElementsJSON: () =>
      JSON.stringify(state.scene.elements, null, 2),
    getTimelineJSON: () =>
      JSON.stringify(
        {
          timeline: state.timeline,
          clipStart: state.playback.clipStart,
          clipEnd: state.playback.clipEnd,
          cameraFrame: state.playback.cameraFrame,
          authoring: state.authoring,
          revision,
          sequence,
        },
        null,
        2,
      ),
    updateState: (newState) => {
      state = parseServerState(newState);
    },
    emitChange,
    close: () => {
      closed = true;
      mutationTimestamps.length = 0;
      pendingDirtyAreas.clear();
    },
    markDirty,
    tool,
    mutatingTool,
  };
}
