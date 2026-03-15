import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { nanoid } from 'nanoid';
import type { CheckpointStore } from './checkpoint-store.js';
import { normalizeElements } from './server/elementNormalizer.js';
import { getElementBounds } from './server/geometry.js';
import * as geometry from './server/geometry.js';
import { registerAnimationTools } from './server/animationTools.js';
import { registerCheckpointTools } from './server/checkpointTools.js';
import { registerQueryTools } from './server/queryTools.js';
import { REFERENCE_TEXT, EXAMPLES_TEXT } from './server/referenceText.js';
import { registerSceneTools } from './server/sceneTools.js';
import { createStateContext, getSharedState } from './server/stateContext.js';
import type { StateChangeListener } from './server/stateContext.js';

export { getSharedState };
export type { StateChangeListener } from './server/stateContext.js';

export function createServer(
  store: CheckpointStore,
  onStateChange?: StateChangeListener,
): McpServer {
  const server = new McpServer({ name: 'excalimate', version: '0.1.0' });
  const ctx = createStateContext(nanoid(8), server, onStateChange);

  server.tool(
    'read_me',
    'Returns the Excalidraw element format reference, animation property docs, easing types, and usage examples. Call this FIRST before creating scenes or animations.',
    {},
    async () => ({ content: [{ type: 'text', text: REFERENCE_TEXT }] }),
  );

  server.tool(
    'get_examples',
    'Returns few-shot examples showing how to create elements and animate them. Call this to learn common patterns.',
    {},
    async () => ({ content: [{ type: 'text' as const, text: EXAMPLES_TEXT }] }),
  );

  registerSceneTools(server, ctx, normalizeElements);
  registerAnimationTools(server, ctx, getElementBounds);
  registerQueryTools(server, ctx, geometry);
  registerCheckpointTools(server, ctx, store);

  return server;
}
