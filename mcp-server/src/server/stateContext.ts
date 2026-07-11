/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { createDefaultState } from '../state.js';
import type { ServerState } from '../types.js';
import { getRequestId } from '../requestContext.js';
import {
  assertInputWithinLimits,
  assertStateWithinLimits,
  mergeResourceLimits,
} from './limits.js';
import type { ResourceLimits } from './limits.js';

type DirtyArea = 'scene' | 'timeline' | 'clip' | 'cameraFrame';

export interface StateDelta {
  revision: number;
  sequence: number;
  baseRevision: number;
  scene?: {
    upsert: any[];
    removed: string[];
  };
  timeline?: {
    upsertedTracks: any[];
    removedTrackIds: string[];
    meta?: { duration: number; fps: number };
  };
  clipStart?: number;
  clipEnd?: number;
  cameraFrame?: ServerState['cameraFrame'];
}

export type StateChangeListener = (delta: StateDelta) => void;

export interface StateSnapshot extends ServerState {
  revision: number;
  sequence: number;
}

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

const STRIP_ELEMENT_KEYS = new Set([
  'seed', 'versionNonce', 'updated', 'link', 'locked',
  'roundness', 'boundElements', 'lastCommittedPoint',
  'startBinding', 'endBinding', 'originalText', 'autoResize', 'baseline',
]);

function stripElement(el: any): any {
  const stripped: any = {};
  for (const key of Object.keys(el)) {
    if (!STRIP_ELEMENT_KEYS.has(key)) stripped[key] = el[key];
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
    previous.scene.elements.map((element: any) => [element.id as string, fingerprint(element)]),
  );
  const currentIds = new Set<string>();
  const upsert: any[] = [];

  for (const element of current.scene.elements) {
    currentIds.add(element.id);
    if (previousElements.get(element.id) !== fingerprint(element)) {
      upsert.push(stripElement(element));
    }
  }

  const removed = [...previousElements.keys()].filter((id) => !currentIds.has(id));
  return upsert.length > 0 || removed.length > 0 ? { upsert, removed } : undefined;
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

  const removedTrackIds = [...previousTracks.keys()].filter((id) => !currentTrackIds.has(id));
  const metaChanged =
    previous.timeline.duration !== current.timeline.duration ||
    previous.timeline.fps !== current.timeline.fps;

  if (upsertedTracks.length === 0 && removedTrackIds.length === 0 && !metaChanged) {
    return undefined;
  }
  return {
    upsertedTracks,
    removedTrackIds,
    ...(metaChanged
      ? { meta: { duration: current.timeline.duration, fps: current.timeline.fps } }
      : {}),
  };
}

export function computeStateDelta(
  previous: ServerState,
  current: ServerState,
  metadata: Pick<StateDelta, 'revision' | 'sequence' | 'baseRevision'>,
  areas: ReadonlySet<DirtyArea> = new Set(['scene', 'timeline', 'clip', 'cameraFrame']),
): StateDelta | null {
  const delta: StateDelta = { ...metadata };
  if (areas.has('scene')) delta.scene = computeSceneDelta(previous, current);
  if (areas.has('timeline')) delta.timeline = computeTimelineDelta(previous, current);
  if (
    areas.has('clip') &&
    (previous.clipStart !== current.clipStart || previous.clipEnd !== current.clipEnd)
  ) {
    delta.clipStart = current.clipStart;
    delta.clipEnd = current.clipEnd;
  }
  if (areas.has('cameraFrame') && fingerprint(previous.cameraFrame) !== fingerprint(current.cameraFrame)) {
    delta.cameraFrame = current.cameraFrame;
  }

  return delta.scene || delta.timeline || delta.clipStart !== undefined || delta.cameraFrame
    ? delta
    : null;
}

function cloneState(state: ServerState): ServerState {
  return structuredClone(state);
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
  let stateJsonCache: { revision: number; sequence: number; json: string } | null = null;
  let mutationQueue: Promise<void> = Promise.resolve();

  assertStateWithinLimits(state, limits);

  function markDirty(area: DirtyArea | 'all'): void {
    if (area === 'all') {
      pendingDirtyAreas = new Set(['scene', 'timeline', 'clip', 'cameraFrame']);
    } else {
      pendingDirtyAreas.add(area);
    }
  }

  function publishChange(previous: ServerState, areas: ReadonlySet<DirtyArea>): void {
    const nextRevision = revision + 1;
    const nextSequence = sequence + 1;
    const delta = computeStateDelta(previous, state, {
      revision: nextRevision,
      sequence: nextSequence,
      baseRevision: revision,
    }, areas);
    if (!delta) return;

    revision = nextRevision;
    sequence = nextSequence;
    stateJsonCache = null;
    lastPublishedState = cloneState(state);
    try {
      onStateChange?.(structuredClone(delta));
    } catch {
      const requestId = getRequestId();
      console.error(`[excalimate] State listener failed (request ID: ${requestId})`);
    }
  }

  function emitChange(): void {
    assertStateWithinLimits(state, limits);
    const areas = pendingDirtyAreas.size > 0
      ? new Set(pendingDirtyAreas)
      : new Set<DirtyArea>(['scene', 'timeline', 'clip', 'cameraFrame']);
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

  async function runSafely<T>(name: string, handler: () => Promise<T>): Promise<T> {
    if (closed) {
      throw new McpError(ErrorCode.ConnectionClosed, 'MCP session is closed');
    }
    try {
      return await handler();
    } catch (error) {
      if (isMcpError(error)) throw error;
      const requestId = getRequestId();
      console.error(`[excalimate] Tool "${name}" failed (request ID: ${requestId})`);
      throw new McpError(
        ErrorCode.InternalError,
        `Internal tool error (request ID: ${requestId})`,
      );
    }
  }

  const tool: StateContext['tool'] = (name, description, schema, handler) => {
    server.tool(name, description, schema, async (args: any) => runSafely(name, async () => {
      assertInputWithinLimits(args, limits);
      return handler(args);
    }));
  };

  const mutatingTool: StateContext['mutatingTool'] = (
    name,
    description,
    schema,
    handler,
    dirtyAreas,
  ) => {
    server.tool(name, description, schema, async (args: any) => {
      const operation = mutationQueue.then(() => runSafely(name, async () => {
        assertMutationAllowed();
        assertInputWithinLimits(args, limits);
        const previous = cloneState(state);
        const previousJson = JSON.stringify(previous);
        pendingDirtyAreas.clear();

        try {
          const result = await handler(args);
          if (closed) {
            throw new McpError(ErrorCode.ConnectionClosed, 'MCP session is closed');
          }
          assertStateWithinLimits(state, limits);
          if (JSON.stringify(state) !== previousJson) {
            const areas = dirtyAreas
              ? new Set(dirtyAreas)
              : pendingDirtyAreas.size > 0
                ? new Set(pendingDirtyAreas)
                : new Set<DirtyArea>(['scene', 'timeline', 'clip', 'cameraFrame']);
            publishChange(previous, areas);
          }
          pendingDirtyAreas.clear();
          return result;
        } catch (error) {
          state = previous;
          pendingDirtyAreas.clear();
          throw error;
        }
      }));
      mutationQueue = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    });
  };

  return {
    limits,
    getState: () => state,
    getRevision: () => revision,
    getSequence: () => sequence,
    getSnapshot: () => ({
      ...cloneState(state),
      revision,
      sequence,
    }),
    getStateJSON: () => {
      if (
        stateJsonCache &&
        stateJsonCache.revision === revision &&
        stateJsonCache.sequence === sequence
      ) {
        return stateJsonCache.json;
      }
      const json = JSON.stringify({ ...state, revision, sequence });
      stateJsonCache = { revision, sequence, json };
      return json;
    },
    getSceneElementsJSON: () => JSON.stringify(state.scene.elements, null, 2),
    getTimelineJSON: () => JSON.stringify({
      timeline: state.timeline,
      clipStart: state.clipStart,
      clipEnd: state.clipEnd,
      cameraFrame: state.cameraFrame,
      revision,
      sequence,
    }, null, 2),
    updateState: (newState) => {
      state = newState;
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
