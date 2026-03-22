/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createDefaultState } from '../state.js';
import type { ServerState } from '../types.js';

/**
 * Delta message format sent over SSE.
 * Instead of full state areas, we send fine-grained changes:
 * - Scene: only added/updated/removed elements
 * - Timeline: only upserted/removed tracks
 * - Clip and cameraFrame: sent as-is (small payloads)
 */
export interface StateDelta {
  scene?: {
    /** Elements that were added or have changed properties */
    upsert: any[];
    /** Element IDs that were removed */
    removed: string[];
  };
  timeline?: {
    /** Tracks that were added or have changed keyframes */
    upsertedTracks: any[];
    /** Track IDs that were removed */
    removedTrackIds: string[];
    /** Timeline metadata (duration, fps) — only sent if changed */
    meta?: { duration: number; fps: number };
  };
  clipStart?: number;
  clipEnd?: number;
  cameraFrame?: ServerState['cameraFrame'];
}

export type StateChangeListener = (delta: StateDelta) => void;

let _activeState: ServerState = createDefaultState();
let _activeServerId: string | null = null;
let _stateVersion = 0;

export function getSharedState(): ServerState { return _activeState; }

/**
 * Cached JSON serialization of state areas.
 * Invalidated by version counter — avoids re-serializing unchanged state
 * on repeated get_scene / get_timeline / /state calls.
 */
const _jsonCache = {
  fullState: { version: -1, json: '' },
  sceneElements: { version: -1, json: '' },
  timeline: { version: -1, json: '' },
};

/** Get the full state as a JSON string, using cache when unchanged. */
export function getSharedStateJSON(): string {
  if (_jsonCache.fullState.version === _stateVersion) return _jsonCache.fullState.json;
  const json = JSON.stringify(_activeState);
  _jsonCache.fullState = { version: _stateVersion, json };
  return json;
}

/** Get scene elements as a pretty JSON string, using cache when unchanged. */
export function getSceneElementsJSON(): string {
  if (_jsonCache.sceneElements.version === _stateVersion) return _jsonCache.sceneElements.json;
  const json = JSON.stringify(_activeState.scene.elements, null, 2);
  _jsonCache.sceneElements = { version: _stateVersion, json };
  return json;
}

/** Get timeline + clip + camera as a pretty JSON string, using cache when unchanged. */
export function getTimelineJSON(): string {
  if (_jsonCache.timeline.version === _stateVersion) return _jsonCache.timeline.json;
  const json = JSON.stringify({
    timeline: _activeState.timeline,
    clipStart: _activeState.clipStart,
    clipEnd: _activeState.clipEnd,
    cameraFrame: _activeState.cameraFrame,
  }, null, 2);
  _jsonCache.timeline = { version: _stateVersion, json };
  return json;
}

export interface StateContext {
  getState: () => ServerState;
  updateState: (newState: ServerState) => void;
  emitChange: () => void;
  /** Mark a state area as dirty for delta broadcasting. */
  markDirty: (area: 'scene' | 'timeline' | 'clip' | 'cameraFrame' | 'all') => void;
  mutatingTool: (
    name: string,
    description: string,
    schema: any,
    handler: (args: any) => Promise<{ content: { type: 'text'; text: string }[] }>,
    /** Which state areas this tool modifies (for delta broadcasting). Defaults to 'all'. */
    dirtyAreas?: Array<'scene' | 'timeline' | 'clip' | 'cameraFrame'>,
  ) => void;
}

// ── Delta computation helpers ──────────────────────────────────

/** Snapshot the minimal data needed to compute scene deltas. */
function snapshotElementIds(state: ServerState): Map<string, number> {
  const map = new Map<string, number>();
  for (const el of state.scene.elements) {
    // Use version (or versionNonce) as a change indicator
    map.set(el.id, el.version ?? 0);
  }
  return map;
}

/** Snapshot track IDs and their keyframe counts for change detection. */
function snapshotTracks(state: ServerState): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of state.timeline.tracks) {
    map.set(t.id, t.keyframes.length);
  }
  return map;
}

/**
 * Properties stripped from elements in SSE deltas to reduce payload size.
 * These are non-visual metadata that the client can re-fetch on reconnect
 * via the /state endpoint (which sends full elements).
 */
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

function computeSceneDelta(
  prevElements: Map<string, number>,
  current: ServerState,
): StateDelta['scene'] | undefined {
  const upsert: any[] = [];
  const currentIds = new Set<string>();

  for (const el of current.scene.elements) {
    currentIds.add(el.id);
    const prevVersion = prevElements.get(el.id);
    if (prevVersion === undefined || prevVersion !== (el.version ?? 0)) {
      upsert.push(stripElement(el));
    }
  }

  const removed: string[] = [];
  for (const id of prevElements.keys()) {
    if (!currentIds.has(id)) removed.push(id);
  }

  if (upsert.length === 0 && removed.length === 0) return undefined;
  return { upsert, removed };
}

function computeTimelineDelta(
  prevTracks: Map<string, number>,
  prevDuration: number,
  prevFps: number,
  current: ServerState,
): StateDelta['timeline'] | undefined {
  const upsertedTracks: any[] = [];
  const currentTrackIds = new Set<string>();

  for (const track of current.timeline.tracks) {
    currentTrackIds.add(track.id);
    const prevKfCount = prevTracks.get(track.id);
    if (prevKfCount === undefined || prevKfCount !== track.keyframes.length) {
      upsertedTracks.push(track);
    }
  }

  const removedTrackIds: string[] = [];
  for (const id of prevTracks.keys()) {
    if (!currentTrackIds.has(id)) removedTrackIds.push(id);
  }

  const metaChanged = current.timeline.duration !== prevDuration || current.timeline.fps !== prevFps;

  if (upsertedTracks.length === 0 && removedTrackIds.length === 0 && !metaChanged) return undefined;

  const result: StateDelta['timeline'] = { upsertedTracks, removedTrackIds };
  if (metaChanged) {
    result.meta = { duration: current.timeline.duration, fps: current.timeline.fps };
  }
  return result;
}

// ── State context factory ──────────────────────────────────────

export function createStateContext(
  serverId: string,
  server: McpServer,
  onStateChange?: StateChangeListener,
): StateContext {
  if (_activeServerId !== null) {
    console.warn(
      `[excalimate] New server ${serverId} replacing active server ${_activeServerId}. ` +
      'Concurrent MCP sessions share the same state (single-tenant design).',
    );
  }
  _activeServerId = serverId;

  // ── Delta broadcasting with debounce ───────────────────────────
  let _emitTimer: ReturnType<typeof setTimeout> | null = null;
  const _dirty = { scene: false, timeline: false, clip: false, cameraFrame: false };

  // Snapshots taken before each tool call for delta computation
  let _prevElementSnapshot: Map<string, number> = snapshotElementIds(_activeState);
  let _prevTrackSnapshot: Map<string, number> = snapshotTracks(_activeState);
  let _prevDuration: number = _activeState.timeline.duration;
  let _prevFps: number = _activeState.timeline.fps;

  function markDirty(area: 'scene' | 'timeline' | 'clip' | 'cameraFrame' | 'all') {
    if (area === 'all') {
      _dirty.scene = _dirty.timeline = _dirty.clip = _dirty.cameraFrame = true;
    } else {
      _dirty[area] = true;
    }
  }

  const emitChange = () => {
    if (!_dirty.scene && !_dirty.timeline && !_dirty.clip && !_dirty.cameraFrame) {
      markDirty('all');
    }

    if (_emitTimer) clearTimeout(_emitTimer);
    _emitTimer = setTimeout(() => {
      _emitTimer = null;
      try {
        if (!onStateChange) return;

        const delta: StateDelta = {};
        let hasContent = false;

        if (_dirty.scene) {
          delta.scene = computeSceneDelta(_prevElementSnapshot, _activeState);
          _prevElementSnapshot = snapshotElementIds(_activeState);
          if (delta.scene) hasContent = true;
        }
        if (_dirty.timeline) {
          delta.timeline = computeTimelineDelta(_prevTrackSnapshot, _prevDuration, _prevFps, _activeState);
          _prevTrackSnapshot = snapshotTracks(_activeState);
          _prevDuration = _activeState.timeline.duration;
          _prevFps = _activeState.timeline.fps;
          if (delta.timeline) hasContent = true;
        }
        if (_dirty.clip) {
          delta.clipStart = _activeState.clipStart;
          delta.clipEnd = _activeState.clipEnd;
          hasContent = true;
        }
        if (_dirty.cameraFrame) {
          delta.cameraFrame = _activeState.cameraFrame;
          hasContent = true;
        }

        // Reset dirty flags
        _dirty.scene = _dirty.timeline = _dirty.clip = _dirty.cameraFrame = false;

        if (!hasContent) return;
        onStateChange(delta);
      } catch (err) {
        console.error('emitChange failed:', err);
      }
    }, 50);
  };

  (server as any).__getState = () => _activeState;

  const updateState = (newState: ServerState) => {
    _activeState = newState;
    _stateVersion++;
  };

  const mutatingTool: StateContext['mutatingTool'] = (name, description, schema, handler, dirtyAreas) => {
    server.tool(name, description, schema, async (args: any) => {
      // Snapshot before the tool mutates state
      if (!dirtyAreas || dirtyAreas.includes('scene')) {
        _prevElementSnapshot = snapshotElementIds(_activeState);
      }
      if (!dirtyAreas || dirtyAreas.includes('timeline')) {
        _prevTrackSnapshot = snapshotTracks(_activeState);
        _prevDuration = _activeState.timeline.duration;
        _prevFps = _activeState.timeline.fps;
      }

      const result = await handler(args);
      // Bump version after mutation — invalidates JSON cache
      _stateVersion++;
      if (dirtyAreas) {
        for (const area of dirtyAreas) markDirty(area);
      }
      emitChange();
      return result;
    });
  };

  return {
    getState: () => _activeState,
    updateState,
    emitChange,
    markDirty,
    mutatingTool,
  };
}
