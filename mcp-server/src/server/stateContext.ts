/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createDefaultState } from '../state.js';
import type { ServerState } from '../types.js';

export type StateChangeListener = (delta: Partial<ServerState>) => void;

let _activeState: ServerState = createDefaultState();
let _activeServerId: string | null = null;

export function getSharedState(): ServerState { return _activeState; }

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
  // Track which top-level state areas are dirty via flags set by tools.
  // When the debounced emit fires, only serialize and broadcast the
  // dirty fields. This avoids serializing the entire scene+timeline
  // on every keyframe addition.
  let _emitTimer: ReturnType<typeof setTimeout> | null = null;
  const _dirty = { scene: false, timeline: false, clip: false, cameraFrame: false };

  /** Mark a state area as dirty so it's included in the next broadcast. */
  function markDirty(area: 'scene' | 'timeline' | 'clip' | 'cameraFrame' | 'all') {
    if (area === 'all') {
      _dirty.scene = _dirty.timeline = _dirty.clip = _dirty.cameraFrame = true;
    } else {
      _dirty[area] = true;
    }
  }

  const emitChange = () => {
    // Default: mark everything dirty (tools that don't specify get full broadcast).
    // Specific tools can call markDirty() before emitChange() for fine-grained deltas.
    if (!_dirty.scene && !_dirty.timeline && !_dirty.clip && !_dirty.cameraFrame) {
      markDirty('all');
    }

    if (_emitTimer) clearTimeout(_emitTimer);
    _emitTimer = setTimeout(() => {
      _emitTimer = null;
      try {
        if (!onStateChange) return;

        const delta: Partial<ServerState> = {};
        if (_dirty.scene) delta.scene = _activeState.scene;
        if (_dirty.timeline) delta.timeline = _activeState.timeline;
        if (_dirty.clip) { delta.clipStart = _activeState.clipStart; delta.clipEnd = _activeState.clipEnd; }
        if (_dirty.cameraFrame) delta.cameraFrame = _activeState.cameraFrame;

        // Reset dirty flags
        _dirty.scene = _dirty.timeline = _dirty.clip = _dirty.cameraFrame = false;

        if (Object.keys(delta).length === 0) return;
        onStateChange(delta);
      } catch (err) {
        console.error('emitChange failed:', err);
      }
    }, 50);
  };

  (server as any).__getState = () => _activeState;

  const updateState = (newState: ServerState) => {
    _activeState = newState;
  };

  const mutatingTool: StateContext['mutatingTool'] = (name, description, schema, handler, dirtyAreas) => {
    server.tool(name, description, schema, async (args: any) => {
      const result = await handler(args);
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
