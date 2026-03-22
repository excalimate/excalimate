/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addKeyframesBatchToState } from '../state.js';
import type { AnimatableProperty, EasingType } from '../types.js';
import { ANIMATABLE_PROPERTIES, EASING_TYPES } from '../types.js';
import { ORIGIN_MAP } from './geometry.js';
import type { StateContext } from './stateContext.js';

/**
 * Registers the `create_animated_scene` composite tool.
 *
 * This is a high-level tool that replaces the typical multi-call pattern:
 *   create_scene → add_keyframes_batch → create_sequence → set_clip_range → set_camera_frame
 *
 * All operations happen in a single tool call with one SSE broadcast at the end,
 * reducing AI round-trips from 5-18 to 1 and minimizing network traffic.
 */
export function registerCompositeTools(
  server: McpServer,
  ctx: StateContext,
  normalizeElements: (elements: any[]) => any[],
  getElementBounds: (el: any) => { minX: number; minY: number; maxX: number; maxY: number },
): void {
  ctx.mutatingTool(
    'create_animated_scene',
    'Create a complete animated scene in one call: elements + keyframes + sequences + camera + clip range. ' +
    'Preferred over calling create_scene, add_keyframes_batch, create_sequence separately. ' +
    'Only elements is required — all other fields are optional.',
    {
      elements: z.string().describe(
        'JSON string of Excalidraw elements array',
      ),
      keyframes: z.string().optional().describe(
        'JSON array of {targetId, property, time, value, easing?, scaleOrigin?}. ' +
        'Properties: opacity, translateX, translateY, scaleX, scaleY, rotation, drawProgress.',
      ),
      sequences: z.string().optional().describe(
        'JSON array of {elementIds: string[], property?: "opacity"|"drawProgress", ' +
        'startTime?: number, delay?: number, duration?: number}. Creates reveal sequences.',
      ),
      duration: z.number().optional().describe('Timeline duration in ms (default: 30000)'),
      clipStart: z.number().optional().describe('Clip start time in ms (default: 0)'),
      clipEnd: z.number().optional().describe('Clip end time in ms'),
      cameraFrame: z.object({
        x: z.number().optional(),
        y: z.number().optional(),
        width: z.number().optional(),
        aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:2']).optional(),
      }).optional().describe('Camera frame position and size'),
    },
    async ({ elements, keyframes, sequences, duration, clipStart, clipEnd, cameraFrame }) => {
      const errors: string[] = [];
      const stats = { elements: 0, keyframes: 0, sequences: 0 };

      // ── 1. Parse and create scene elements ───────────────
      let parsedElements: any[];
      try {
        parsedElements = JSON.parse(elements);
        if (!Array.isArray(parsedElements)) {
          return { content: [{ type: 'text' as const, text: 'Error: elements must be a JSON array' }] };
        }
      } catch (e) {
        return { content: [{ type: 'text' as const, text: `Error parsing elements: ${e}` }] };
      }

      const state = ctx.getState();
      state.scene.elements = normalizeElements(parsedElements);
      stats.elements = parsedElements.length;

      // ── 2. Set timeline duration ─────────────────────────
      if (duration !== undefined) {
        state.timeline.duration = Math.max(1000, duration);
      }

      // ── 3. Camera frame ──────────────────────────────────
      if (cameraFrame) {
        if (cameraFrame.x !== undefined) state.cameraFrame.x = cameraFrame.x;
        if (cameraFrame.y !== undefined) state.cameraFrame.y = cameraFrame.y;
        if (cameraFrame.width !== undefined) state.cameraFrame.width = cameraFrame.width;
        if (cameraFrame.aspectRatio !== undefined) state.cameraFrame.aspectRatio = cameraFrame.aspectRatio;
      }

      // ── 4. Collect all keyframes into a single batch ─────
      const allKeyframes: { targetId: string; property: AnimatableProperty; time: number; value: number; easing?: EasingType }[] = [];
      const validProperties = new Set<string>(ANIMATABLE_PROPERTIES);
      const validEasings = new Set<string>(EASING_TYPES);

      // 4a. Camera initial keyframes (always create at t=0 so camera starts correctly)
      if (cameraFrame) {
        const CAMERA_ID = '__camera_frame__';
        allKeyframes.push(
          { targetId: CAMERA_ID, property: 'translateX', time: 0, value: 0 },
          { targetId: CAMERA_ID, property: 'translateY', time: 0, value: 0 },
          { targetId: CAMERA_ID, property: 'scaleX', time: 0, value: 1 },
          { targetId: CAMERA_ID, property: 'scaleY', time: 0, value: 1 },
        );
      }

      // 4b. User-supplied keyframes
      if (keyframes) {
        try {
          const parsedKfs = JSON.parse(keyframes);
          if (!Array.isArray(parsedKfs)) {
            errors.push('keyframes must be a JSON array — skipped');
          } else {
            // Pre-process scale compensation (same logic as add_keyframes_batch)
            const scaleCompensation = new Map<string, { targetId: string; time: number; sx: number; sy: number; origin: string; easing: string }>();

            for (const kf of parsedKfs) {
              if (!kf.targetId || !kf.property || kf.time === undefined || kf.value === undefined) continue;
              if (!validProperties.has(kf.property)) continue;

              // Collect scale origin compensation data
              if ((kf.property === 'scaleX' || kf.property === 'scaleY') && kf.scaleOrigin && kf.scaleOrigin !== 'top-left') {
                const key = `${kf.targetId}@${kf.time}`;
                const existing = scaleCompensation.get(key) ?? {
                  targetId: kf.targetId, time: kf.time, sx: 1, sy: 1,
                  origin: kf.scaleOrigin, easing: kf.easing ?? 'linear',
                };
                if (kf.property === 'scaleX') existing.sx = kf.value;
                if (kf.property === 'scaleY') existing.sy = kf.value;
                existing.origin = kf.scaleOrigin;
                scaleCompensation.set(key, existing);
              }

              const easing = (kf.easing && validEasings.has(kf.easing)) ? kf.easing : 'linear';
              allKeyframes.push({
                targetId: kf.targetId,
                property: kf.property as AnimatableProperty,
                time: kf.time,
                value: kf.value,
                easing: easing as EasingType,
              });
              stats.keyframes++;
            }

            // Compute scale origin translation compensation
            for (const skf of scaleCompensation.values()) {
              const [ox, oy] = ORIGIN_MAP[skf.origin] ?? [0.5, 0.5];
              const el = state.scene.elements.find((e: any) => e.id === skf.targetId);
              if (!el) continue;
              const bounds = getElementBounds(el);
              const w = bounds.maxX - bounds.minX;
              const h = bounds.maxY - bounds.minY;
              const tx = -w * (skf.sx - 1) * ox;
              const ty = -h * (skf.sy - 1) * oy;
              const easing = (validEasings.has(skf.easing) ? skf.easing : 'linear') as EasingType;
              allKeyframes.push(
                { targetId: skf.targetId, property: 'translateX', time: skf.time, value: tx, easing },
                { targetId: skf.targetId, property: 'translateY', time: skf.time, value: ty, easing },
              );
              stats.keyframes += 2;
            }
          }
        } catch (e) {
          errors.push(`Error parsing keyframes: ${e}`);
        }
      }

      // 4c. Sequence reveals → expand into keyframes
      if (sequences) {
        try {
          const parsedSeqs = JSON.parse(sequences);
          if (!Array.isArray(parsedSeqs)) {
            errors.push('sequences must be a JSON array — skipped');
          } else {
            for (const seq of parsedSeqs) {
              const ids = seq.elementIds;
              if (!Array.isArray(ids) || ids.length === 0) continue;

              const prop: AnimatableProperty = (seq.property === 'drawProgress') ? 'drawProgress' : 'opacity';
              const startTime = seq.startTime ?? 0;
              const delay = seq.delay ?? 300;
              const dur = seq.duration ?? 500;

              for (let i = 0; i < ids.length; i++) {
                const revealStart = startTime + i * delay;
                const revealEnd = revealStart + dur;
                const targetId = ids[i];

                if (revealStart > 0) {
                  allKeyframes.push({ targetId, property: prop, time: 0, value: 0 });
                }
                if (revealStart > 10) {
                  allKeyframes.push({ targetId, property: prop, time: revealStart, value: 0 });
                }
                allKeyframes.push({ targetId, property: prop, time: revealEnd, value: 1, easing: 'easeOut' });
                stats.keyframes += (revealStart > 0 ? 1 : 0) + (revealStart > 10 ? 1 : 0) + 1;
              }
              stats.sequences++;
            }
          }
        } catch (e) {
          errors.push(`Error parsing sequences: ${e}`);
        }
      }

      // ── 5. Apply all keyframes in one batched pass ───────
      if (allKeyframes.length > 0) {
        const newState = addKeyframesBatchToState(state, allKeyframes);
        ctx.updateState(newState);
      }

      // ── 6. Clip range ────────────────────────────────────
      const finalState = ctx.getState();
      if (clipStart !== undefined) finalState.clipStart = clipStart;
      if (clipEnd !== undefined) {
        finalState.clipEnd = Math.max((clipStart ?? finalState.clipStart) + 100, clipEnd);
      } else if (clipStart === undefined && stats.sequences > 0) {
        // Auto-set clip end to match the last sequence keyframe
        let maxTime = 0;
        for (const kf of allKeyframes) {
          if (kf.time > maxTime) maxTime = kf.time;
        }
        if (maxTime > 0) {
          finalState.clipEnd = Math.max(finalState.clipEnd, maxTime + 500);
        }
      }

      // ── 7. Build response ────────────────────────────────
      const parts = [
        `Scene: ${stats.elements} elements`,
        stats.keyframes > 0 ? `${stats.keyframes} keyframes` : null,
        stats.sequences > 0 ? `${stats.sequences} sequences` : null,
        cameraFrame ? `camera: ${finalState.cameraFrame.aspectRatio} at (${finalState.cameraFrame.x}, ${finalState.cameraFrame.y})` : null,
        `clip: ${finalState.clipStart}ms–${finalState.clipEnd}ms`,
      ].filter(Boolean).join(', ');

      const msg = errors.length > 0
        ? `${parts}\nWarnings: ${errors.join('; ')}`
        : parts;

      return { content: [{ type: 'text' as const, text: msg }] };
    },
    // Mark all areas dirty — this tool touches everything
    ['scene', 'timeline', 'clip', 'cameraFrame'],
  );
}
