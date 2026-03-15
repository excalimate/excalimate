/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createDefaultState } from '../state.js';
import type { ServerState } from '../types.js';

export type StateChangeListener = (state: ServerState) => void;

let _activeState: ServerState = createDefaultState();
let _activeServerId: string | null = null;

export function getSharedState(): ServerState { return _activeState; }

export interface StateContext {
  getState: () => ServerState;
  updateState: (newState: ServerState) => void;
  emitChange: () => void;
  mutatingTool: (
    name: string,
    description: string,
    schema: any,
    handler: (args: any) => Promise<{ content: { type: 'text'; text: string }[] }>,
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

  const emitChange = () => {
    try {
      onStateChange?.(_activeState);
    } catch (err) {
      console.error('emitChange failed:', err);
    }
  };

  (server as any).__getState = () => _activeState;

  const updateState = (newState: ServerState) => {
    _activeState = newState;
  };

  const mutatingTool: StateContext['mutatingTool'] = (name, description, schema, handler) => {
    server.tool(name, description, schema, async (args: any) => {
      const result = await handler(args);
      emitChange();
      return result;
    });
  };

  return {
    getState: () => _activeState,
    updateState,
    emitChange,
    mutatingTool,
  };
}
