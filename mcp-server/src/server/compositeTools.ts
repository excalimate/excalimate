/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addKeyframesBatchToState } from '../state.js';
import type { AnimatableProperty, EasingType } from '../types.js';
import { ANIMATABLE_PROPERTIES, EASING_TYPES } from '../types.js';
import { ORIGIN_MAP } from './geometry.js';
import type { StateContext } from './stateContext.js';
import {
  assertAdditionalKeyframes,
  boundedString,
  boundedTime,
  invalidInput,
  legacyDeprecation,
  parseLegacyArray,
} from './limits.js';

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
  const propertySchema = z.enum(
    ANIMATABLE_PROPERTIES as unknown as [AnimatableProperty, ...AnimatableProperty[]],
  );
  const easingSchema = z.enum(
    EASING_TYPES as unknown as [EasingType, ...EasingType[]],
  );
  const scaleOriginSchema = z.enum([
    'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right',
    'top', 'bottom', 'left', 'right',
  ]);
  const keyframeSchema = z.object({
    targetId: boundedString(ctx.limits),
    property: propertySchema,
    time: boundedTime(ctx.limits),
    value: z.number().finite(),
    easing: easingSchema.optional(),
    scaleOrigin: scaleOriginSchema.optional(),
  }).strict();
  const keyframesSchema = z.array(keyframeSchema).max(ctx.limits.maxBatchItems);
  const sequenceSchema = z.object({
    elementIds: z.array(boundedString(ctx.limits))
      .min(1)
      .max(ctx.limits.maxBatchItems),
    property: z.enum(['opacity', 'drawProgress']).optional(),
    startTime: boundedTime(ctx.limits).optional(),
    delay: boundedTime(ctx.limits).optional(),
    duration: boundedTime(ctx.limits).min(50).optional(),
  }).strict();
  const sequencesSchema = z.array(sequenceSchema).max(ctx.limits.maxBatchItems);
  const elementsSchema = z.array(z.record(z.unknown())).max(ctx.limits.maxElements);

  ctx.mutatingTool(
    'create_animated_scene',
    'Create a complete animated scene in one call: elements + keyframes + sequences + camera + clip range. ' +
    'Preferred over calling create_scene, add_keyframes_batch, create_sequence separately. ' +
    'Only elements is required — all other fields are optional.',
    {
      elements: z.string().max(ctx.limits.maxStateBytes).describe(
        'JSON string of Excalidraw elements array',
      ),
      keyframes: z.union([
        keyframesSchema,
        z.string().max(ctx.limits.maxStateBytes),
      ]).optional().describe(
        'Array of {targetId, property, time, value, easing?, scaleOrigin?}; legacy JSON strings are deprecated.',
      ),
      sequences: z.union([
        sequencesSchema,
        z.string().max(ctx.limits.maxStateBytes),
      ]).optional().describe(
        'Array of reveal sequences; legacy JSON strings are deprecated.',
      ),
      duration: boundedTime(ctx.limits).optional().describe('Timeline duration in ms (default: 30000)'),
      clipStart: boundedTime(ctx.limits).optional().describe('Clip start time in ms (default: 0)'),
      clipEnd: boundedTime(ctx.limits).optional().describe('Clip end time in ms'),
      cameraFrame: z.object({
        x: z.number().finite().optional(),
        y: z.number().finite().optional(),
        width: z.number().finite().positive().optional(),
        aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:2']).optional(),
      }).strict().optional().describe('Camera frame position and size'),
    },
    async ({ elements, keyframes, sequences, duration, clipStart, clipEnd, cameraFrame }) => {
      const stats = { elements: 0, keyframes: 0, sequences: 0 };
      let keyframesLegacy = false;
      let sequencesLegacy = false;

      // ── 1. Parse and create scene elements ───────────────
      let rawElements: unknown;
      try {
        rawElements = JSON.parse(elements);
      } catch {
        invalidInput('elements must be valid JSON');
      }
      const parsedElements = elementsSchema.safeParse(rawElements);
      if (!parsedElements.success) invalidInput('elements must be a valid array');

      const state = ctx.getState();
      state.scene.elements = normalizeElements(parsedElements.data);
      stats.elements = parsedElements.data.length;

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
        const parsed = parseLegacyArray(keyframes, keyframesSchema, 'keyframes', ctx.limits);
        keyframesLegacy = parsed.legacy;
        const scaleCompensation = new Map<string, {
          targetId: string;
          time: number;
          scaleX: number;
          scaleY: number;
          origin: string;
          easing: EasingType;
        }>();

        for (const keyframe of parsed.value) {
          if (
            (keyframe.property === 'scaleX' || keyframe.property === 'scaleY') &&
            keyframe.scaleOrigin &&
            keyframe.scaleOrigin !== 'top-left'
          ) {
            const key = `${keyframe.targetId}@${keyframe.time}`;
            const existing = scaleCompensation.get(key) ?? {
              targetId: keyframe.targetId,
              time: keyframe.time,
              scaleX: 1,
              scaleY: 1,
              origin: keyframe.scaleOrigin,
              easing: keyframe.easing ?? 'linear',
            };
            if (keyframe.property === 'scaleX') existing.scaleX = keyframe.value;
            if (keyframe.property === 'scaleY') existing.scaleY = keyframe.value;
            existing.origin = keyframe.scaleOrigin;
            scaleCompensation.set(key, existing);
          }

          allKeyframes.push({
            targetId: keyframe.targetId,
            property: keyframe.property,
            time: keyframe.time,
            value: keyframe.value,
            easing: keyframe.easing ?? 'linear',
          });
          stats.keyframes++;
        }

        for (const scaleKeyframe of scaleCompensation.values()) {
          const [originX, originY] = ORIGIN_MAP[scaleKeyframe.origin] ?? [0.5, 0.5];
          const element = state.scene.elements.find(
            (entry: any) => entry.id === scaleKeyframe.targetId,
          );
          if (!element) continue;
          const bounds = getElementBounds(element);
          const width = bounds.maxX - bounds.minX;
          const height = bounds.maxY - bounds.minY;
          allKeyframes.push(
            {
              targetId: scaleKeyframe.targetId,
              property: 'translateX',
              time: scaleKeyframe.time,
              value: -width * (scaleKeyframe.scaleX - 1) * originX,
              easing: scaleKeyframe.easing,
            },
            {
              targetId: scaleKeyframe.targetId,
              property: 'translateY',
              time: scaleKeyframe.time,
              value: -height * (scaleKeyframe.scaleY - 1) * originY,
              easing: scaleKeyframe.easing,
            },
          );
          stats.keyframes += 2;
        }
      }

      // 4c. Sequence reveals → expand into keyframes
      if (sequences) {
        const parsed = parseLegacyArray(sequences, sequencesSchema, 'sequences', ctx.limits);
        sequencesLegacy = parsed.legacy;
        let expandedKeyframeCount = 0;
        for (const sequence of parsed.value) {
          const itemCount = sequence.elementIds.length;
          const startTime = sequence.startTime ?? 0;
          const delay = sequence.delay ?? 300;
          const sequenceDuration = sequence.duration ?? 500;
          const finalTime = startTime + Math.max(0, itemCount - 1) * delay + sequenceDuration;
          if (!Number.isFinite(finalTime) || finalTime > ctx.limits.maxTimeMs) {
            invalidInput(`Sequence times must not exceed ${ctx.limits.maxTimeMs}ms`);
          }

          const countAfter = (threshold: number): number => {
            if (delay === 0) return startTime > threshold ? itemCount : 0;
            const firstIndex = Math.max(0, Math.floor((threshold - startTime) / delay) + 1);
            return Math.max(0, itemCount - firstIndex);
          };
          expandedKeyframeCount +=
            itemCount +
            countAfter(0) +
            countAfter(10);
        }
        assertAdditionalKeyframes(
          state,
          allKeyframes.length + expandedKeyframeCount,
          ctx.limits,
        );

        for (const sequence of parsed.value) {
          const property: AnimatableProperty =
            sequence.property === 'drawProgress' ? 'drawProgress' : 'opacity';
          const startTime = sequence.startTime ?? 0;
          const delay = sequence.delay ?? 300;
          const sequenceDuration = sequence.duration ?? 500;

          for (let index = 0; index < sequence.elementIds.length; index++) {
            const revealStart = startTime + index * delay;
            const revealEnd = revealStart + sequenceDuration;
            const targetId = sequence.elementIds[index];
            if (revealStart > 0) {
              allKeyframes.push({ targetId, property, time: 0, value: 0 });
            }
            if (revealStart > 10) {
              allKeyframes.push({ targetId, property, time: revealStart, value: 0 });
            }
            allKeyframes.push({
              targetId,
              property,
              time: revealEnd,
              value: 1,
              easing: 'easeOut',
            });
            stats.keyframes += (revealStart > 0 ? 1 : 0) + (revealStart > 10 ? 1 : 0) + 1;
          }
          stats.sequences++;
        }
      } else {
        assertAdditionalKeyframes(state, allKeyframes.length, ctx.limits);
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

      const msg = `${parts}${legacyDeprecation('keyframes', keyframesLegacy)}${legacyDeprecation('sequences', sequencesLegacy)}`;

      return { content: [{ type: 'text' as const, text: msg }] };
    },
    // Mark all areas dirty — this tool touches everything
    ['scene', 'timeline', 'clip', 'cameraFrame'],
  );
}
