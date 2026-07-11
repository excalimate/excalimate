/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { StateContext } from './stateContext.js';
import { boundedString, invalidInput } from './limits.js';

export function registerSceneTools(
  server: McpServer,
  ctx: StateContext,
  normalizeElements: (elements: any[]) => any[],
): void {
  const elementSchema = z.record(z.unknown());
  const elementsSchema = z.array(elementSchema).max(ctx.limits.maxElements);
  const updateSchema = z.object({
    id: boundedString(ctx.limits),
  }).passthrough();
  const updatesSchema = z.array(updateSchema).max(ctx.limits.maxBatchItems);

  function parseArray<T>(input: string, schema: z.ZodType<T>, label: string): T {
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      invalidInput(`${label} must be valid JSON`);
    }
    const result = schema.safeParse(parsed);
    if (!result.success) invalidInput(`${label} must be a valid array`);
    return result.data;
  }

  ctx.mutatingTool(
    'create_scene',
    'Create or replace the Excalidraw scene with the given elements.',
    { elements: z.string().max(ctx.limits.maxStateBytes).describe('JSON string of Excalidraw elements array') },
    async ({ elements }) => {
      const parsed = parseArray(elements, elementsSchema, 'elements');
      const state = ctx.getState();
      state.scene.elements = normalizeElements(parsed);
      return { content: [{ type: 'text' as const, text: `Scene created with ${parsed.length} elements.` }] };
    },
  );

  ctx.mutatingTool(
    'add_elements',
    'Add elements to the existing scene.',
    { elements: z.string().max(ctx.limits.maxStateBytes).describe('JSON string of elements to add') },
    async ({ elements }) => {
      const parsed = parseArray(elements, elementsSchema, 'elements');
      const state = ctx.getState();
      state.scene.elements.push(...normalizeElements(parsed));
      return { content: [{ type: 'text' as const, text: `Added ${parsed.length} elements. Total: ${state.scene.elements.length}.` }] };
    },
  );

  ctx.mutatingTool(
    'remove_elements',
    'Remove elements by their IDs.',
    {
      ids: z.array(boundedString(ctx.limits))
        .max(ctx.limits.maxBatchItems)
        .describe('Array of element IDs to remove'),
    },
    async ({ ids }) => {
      const state = ctx.getState();
      const idSet = new Set(ids);
      const before = state.scene.elements.length;
      state.scene.elements = state.scene.elements.filter((el: any) => !idSet.has(el.id));
      const removed = before - state.scene.elements.length;
      return { content: [{ type: 'text' as const, text: `Removed ${removed} elements. Total: ${state.scene.elements.length}.` }] };
    },
  );

  ctx.mutatingTool(
    'update_elements',
    'Update properties of existing elements.',
    {
      updates: z.string()
        .max(ctx.limits.maxStateBytes)
        .describe('JSON string of array [{id, ...properties}]'),
    },
    async ({ updates }) => {
      const parsed = parseArray(updates, updatesSchema, 'updates');
      const state = ctx.getState();
      // Build id→index map for O(1) lookups instead of O(n) findIndex per update
      const indexById = new Map<string, number>();
      for (let i = 0; i < state.scene.elements.length; i++) {
        indexById.set((state.scene.elements[i] as any).id, i);
      }
      let updated = 0;
      for (const upd of parsed) {
        const idx = indexById.get(upd.id);
        if (idx !== undefined) {
          state.scene.elements[idx] = { ...state.scene.elements[idx], ...upd };
          updated++;
        }
      }
      return { content: [{ type: 'text' as const, text: `Updated ${updated} elements.` }] };
    },
  );

  ctx.tool(
    'get_scene',
    'Return the current scene elements as JSON.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: ctx.getSceneElementsJSON() }],
    }),
  );

  ctx.mutatingTool(
    'clear_scene',
    'Clear all elements and all animation tracks. Resets the scene to a blank canvas.',
    {},
    async () => {
      const state = ctx.getState();
      state.scene.elements = [];
      state.scene.files = {};
      state.timeline.tracks = [];
      return { content: [{ type: 'text' as const, text: 'Scene and all animations cleared.' }] };
    },
  );

  ctx.mutatingTool(
    'delete_items',
    'Delete specific elements and all their animation tracks. Batch operation.',
    {
      ids: z.array(boundedString(ctx.limits))
        .max(ctx.limits.maxBatchItems)
        .describe('Element IDs to delete'),
    },
    async ({ ids }) => {
      const state = ctx.getState();
      const idSet = new Set(ids);
      const beforeEl = state.scene.elements.length;
      const beforeTr = state.timeline.tracks.length;
      state.scene.elements = state.scene.elements.filter((el: any) => !idSet.has(el.id));
      state.timeline.tracks = state.timeline.tracks.filter((t: any) => !idSet.has(t.targetId));
      const removedEl = beforeEl - state.scene.elements.length;
      const removedTr = beforeTr - state.timeline.tracks.length;
      return { content: [{ type: 'text' as const, text: `Deleted ${removedEl} elements and ${removedTr} animation tracks.` }] };
    },
  );
}
