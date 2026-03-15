import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import type { CheckpointStore } from '../checkpoint-store.js';
import type { StateContext } from './stateContext.js';

export function registerCheckpointTools(
  server: McpServer,
  ctx: StateContext,
  store: CheckpointStore,
): void {
  ctx.mutatingTool(
    'save_checkpoint',
    'Save current scene + animation state to a checkpoint.',
    { id: z.string().optional().describe('Checkpoint ID (auto-generated if omitted)') },
    async ({ id }) => {
      const checkpointId = id ?? nanoid(12);
      await store.save(checkpointId, ctx.getState());
      return { content: [{ type: 'text', text: `Saved checkpoint: ${checkpointId}` }] };
    },
  );

  ctx.mutatingTool(
    'load_checkpoint',
    'Load scene + animation state from a checkpoint.',
    { id: z.string().describe('Checkpoint ID') },
    async ({ id }) => {
      const loaded = await store.load(id);
      if (!loaded) return { content: [{ type: 'text', text: `Checkpoint "${id}" not found.` }] };
      ctx.updateState(loaded);
      const state = ctx.getState();
      return { content: [{ type: 'text', text: `Loaded checkpoint "${id}": ${state.scene.elements.length} elements, ${state.timeline.tracks.length} tracks.` }] };
    },
  );

  server.tool(
    'list_checkpoints',
    'List all saved checkpoints.',
    {},
    async () => {
      const ids = await store.list();
      return { content: [{ type: 'text' as const, text: ids.length > 0 ? `Checkpoints:\n${ids.join('\n')}` : 'No checkpoints saved.' }] };
    },
  );
}
