import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRequire } from 'node:module';
import type { CheckpointStore } from './checkpoint-store.js';

const require = createRequire(import.meta.url);
const { version: PKG_VERSION } = require('../package.json');
import { normalizeElements } from './server/elementNormalizer.js';
import { getElementBounds } from './server/geometry.js';
import * as geometry from './server/geometry.js';
import { registerAnimationTools } from './server/animationTools.js';
import { registerActionTools } from './server/actionTools.js';
import { registerCheckpointTools } from './server/checkpointTools.js';
import { registerCompositeTools } from './server/compositeTools.js';
import { registerQueryTools } from './server/queryTools.js';
import { registerShareTools } from './server/shareTools.js';
import { REFERENCE_TEXT, EXAMPLES_TEXT } from './server/referenceText.js';
import { registerSceneTools } from './server/sceneTools.js';
import { createStateContext } from './server/stateContext.js';
import type {
  StateChangeListener,
  StateContext,
  StateContextOptions,
} from './server/stateContext.js';

export type { StateChangeListener } from './server/stateContext.js';

export type ExcalimateMcpServer = McpServer & {
  readonly stateContext: StateContext;
};

export function createServer(
  store: CheckpointStore,
  onStateChange?: StateChangeListener,
  options: StateContextOptions = {},
): ExcalimateMcpServer {
  const server = new McpServer({ name: 'excalimate', version: PKG_VERSION });
  const ctx = createStateContext(server, onStateChange, options);
  Object.defineProperty(server, 'stateContext', {
    value: ctx,
    enumerable: false,
    configurable: false,
    writable: false,
  });

  ctx.tool(
    'read_me',
    'Returns the V2 action-first workflow, project/element reference, managed-content rules, low-level animation compatibility, and safe persistence guidance. Call this first.',
    {},
    async () => ({ content: [{ type: 'text', text: REFERENCE_TEXT }] }),
  );

  ctx.tool(
    'get_examples',
    'Returns action-first examples for scene creation, deterministic auto animation, presets, action sequences, and low-level compatibility.',
    {},
    async () => ({ content: [{ type: 'text' as const, text: EXAMPLES_TEXT }] }),
  );

  registerSceneTools(server, ctx, normalizeElements);
  registerAnimationTools(server, ctx, getElementBounds);
  registerActionTools(ctx);
  registerCompositeTools(server, ctx, normalizeElements, getElementBounds);
  registerQueryTools(server, ctx, geometry);
  registerCheckpointTools(server, ctx, store);
  registerShareTools(server, ctx);

  return server as ExcalimateMcpServer;
}
