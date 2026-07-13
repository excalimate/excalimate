/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addKeyframeToState, addKeyframesBatchToState } from '../state.js';
import type { AnimatableProperty, EasingType } from '../types.js';
import { ANIMATABLE_PROPERTIES, EASING_TYPES } from '../types.js';
import { ORIGIN_MAP } from './geometry.js';
import type { StateContext } from './stateContext.js';
import {
  assertAdditionalKeyframes,
  boundedAnimationValue,
  boundedString,
  boundedTime,
  invalidInput,
  legacyDeprecation,
  parseLegacyArray,
} from './limits.js';

export function registerAnimationTools(
  server: McpServer,
  ctx: StateContext,
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
    value: boundedAnimationValue(),
    easing: easingSchema.optional(),
    scaleOrigin: scaleOriginSchema.optional(),
  }).strict();
  const keyframesSchema = z.array(keyframeSchema).max(ctx.limits.maxBatchItems);
  const scaleKeyframeSchema = z.object({
    time: boundedTime(ctx.limits),
    scaleX: boundedAnimationValue().optional(),
    scaleY: boundedAnimationValue().optional(),
    easing: easingSchema.optional(),
  }).strict().refine(
    (keyframe) => keyframe.scaleX !== undefined || keyframe.scaleY !== undefined,
    'scaleX or scaleY is required',
  );
  const scaleKeyframesSchema = z.array(scaleKeyframeSchema).max(ctx.limits.maxBatchItems);
  const cameraPropertySchema = z.enum([
    'translateX', 'translateY', 'scaleX', 'scaleY',
    'x', 'y', 'panX', 'panY', 'zoom', 'scale',
  ]);
  const cameraKeyframeSchema = z.object({
    property: cameraPropertySchema,
    time: boundedTime(ctx.limits),
    value: boundedAnimationValue(),
    easing: easingSchema.optional(),
  }).strict();
  const cameraKeyframesSchema = z.array(cameraKeyframeSchema).max(ctx.limits.maxBatchItems);

  ctx.mutatingTool(
    'add_keyframe',
    'Add a keyframe to an animation track. Auto-creates the track if it doesn\'t exist.',
    {
      targetId: boundedString(ctx.limits).describe('Element or group ID'),
      property: propertySchema.describe('Animatable property'),
      time: boundedTime(ctx.limits).describe('Time in milliseconds'),
      value: boundedAnimationValue().describe('Property value at this time'),
      easing: easingSchema.optional().describe('Easing to next keyframe'),
    },
    async ({ targetId, property, time, value, easing }) => {
      const state = ctx.getState();
      assertAdditionalKeyframes(state, 1, ctx.limits);
      ctx.updateState(addKeyframeToState(state, targetId, property as AnimatableProperty, time, value, (easing as EasingType) ?? 'linear'));
      return { content: [{ type: 'text', text: `Keyframe added: ${property} = ${value} at ${time}ms for ${targetId}` }] };
    },
  );

  ctx.mutatingTool(
    'add_keyframes_batch',
    'Add multiple keyframes at once. For scaleX/scaleY keyframes, include a "scaleOrigin" field per keyframe to control where scaling anchors from (auto-adds translate compensation). Origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right.',
    {
      keyframes: z.union([
        keyframesSchema,
        z.string().max(ctx.limits.maxStateBytes),
      ]).describe('Array of {targetId, property, time, value, easing?, scaleOrigin?}; legacy JSON strings are deprecated'),
    },
    async ({ keyframes }) => {
      const parsed = parseLegacyArray(
        keyframes,
        keyframesSchema,
        'keyframes',
        ctx.limits,
      );
      const batch: {
        targetId: string;
        property: AnimatableProperty;
        time: number;
        value: number;
        easing?: EasingType;
      }[] = [];

      const scaleCompensation = new Map<string, {
        targetId: string;
        time: number;
        sx: number;
        sy: number;
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
            sx: 1,
            sy: 1,
            origin: keyframe.scaleOrigin,
            easing: keyframe.easing ?? 'linear',
          };
          if (keyframe.property === 'scaleX') existing.sx = keyframe.value;
          if (keyframe.property === 'scaleY') existing.sy = keyframe.value;
          existing.origin = keyframe.scaleOrigin;
          scaleCompensation.set(key, existing);
        }
        batch.push({
          targetId: keyframe.targetId,
          property: keyframe.property,
          time: keyframe.time,
          value: keyframe.value,
          easing: keyframe.easing ?? 'linear',
        });
      }

      const state = ctx.getState();
      for (const scaleKeyframe of scaleCompensation.values()) {
        const [originX, originY] = ORIGIN_MAP[scaleKeyframe.origin] ?? [0.5, 0.5];
        const element = state.scene.elements.find((entry: any) => entry.id === scaleKeyframe.targetId);
        if (!element) continue;
        const bounds = getElementBounds(element);
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        batch.push(
          {
            targetId: scaleKeyframe.targetId,
            property: 'translateX',
            time: scaleKeyframe.time,
            value: -width * (scaleKeyframe.sx - 1) * originX,
            easing: scaleKeyframe.easing,
          },
          {
            targetId: scaleKeyframe.targetId,
            property: 'translateY',
            time: scaleKeyframe.time,
            value: -height * (scaleKeyframe.sy - 1) * originY,
            easing: scaleKeyframe.easing,
          },
        );
      }

      assertAdditionalKeyframes(state, batch.length, ctx.limits);
      ctx.updateState(addKeyframesBatchToState(state, batch));
      return {
        content: [{
          type: 'text',
          text: `Added ${batch.length} keyframes.${legacyDeprecation('keyframes', parsed.legacy)}`,
        }],
      };
    },
  );

  ctx.mutatingTool(
    'remove_keyframe',
    'Remove a keyframe by track and keyframe ID.',
    {
      trackId: boundedString(ctx.limits).describe('Track ID'),
      keyframeId: boundedString(ctx.limits).describe('Keyframe ID'),
    },
    async ({ trackId, keyframeId }) => {
      const state = ctx.getState();
      const track = state.timeline.tracks.find(t => t.id === trackId);
      if (!track) return { content: [{ type: 'text', text: 'Track not found.' }] };
      const before = track.keyframes.length;
      track.keyframes = track.keyframes.filter(kf => kf.id !== keyframeId);
      return { content: [{ type: 'text', text: `Removed ${before - track.keyframes.length} keyframe(s).` }] };
    },
  );

  ctx.mutatingTool(
    'create_sequence',
    'Create a reveal sequence — elements appear one after another with configurable timing.',
    {
      elementIds: z.array(boundedString(ctx.limits))
        .min(1)
        .max(ctx.limits.maxBatchItems)
        .describe('Element IDs in reveal order'),
      property: z.enum(['opacity', 'drawProgress']).default('opacity').describe('Property to animate'),
      startTime: boundedTime(ctx.limits).default(0).describe('When sequence starts (ms)'),
      delay: boundedTime(ctx.limits).default(300).describe('Delay between each reveal (ms)'),
      duration: boundedTime(ctx.limits).min(50).default(500).describe('Duration of each reveal (ms)'),
    },
    async ({ elementIds, property, startTime, delay, duration }) => {
      const prop = property as AnimatableProperty;
      const batch: { targetId: string; property: AnimatableProperty; time: number; value: number; easing?: EasingType }[] = [];

      for (let i = 0; i < elementIds.length; i++) {
        const revealStart = startTime + i * delay;
        const revealEnd = revealStart + duration;
        const targetId = elementIds[i];

        if (revealStart > 0) batch.push({ targetId, property: prop, time: 0, value: 0 });
        if (revealStart > 10) batch.push({ targetId, property: prop, time: revealStart, value: 0 });
        batch.push({ targetId, property: prop, time: revealEnd, value: 1, easing: 'easeOut' });
      }

      const state = ctx.getState();
      assertAdditionalKeyframes(state, batch.length, ctx.limits);
      ctx.updateState(addKeyframesBatchToState(state, batch));

      const totalDuration = startTime + (elementIds.length - 1) * delay + duration;
      return { content: [{ type: 'text', text: `Sequence created: ${elementIds.length} elements, total ${totalDuration}ms.` }] };
    },
  );

  ctx.mutatingTool(
    'set_clip_range',
    'Set the export clip start and end times.',
    {
      start: boundedTime(ctx.limits).describe('Clip start time (ms)'),
      end: boundedTime(ctx.limits).min(100).describe('Clip end time (ms)'),
    },
    async ({ start, end }) => {
      const state = ctx.getState();
      state.playback.clipStart = start;
      state.playback.clipEnd = Math.max(start + 100, end);
      return { content: [{ type: 'text', text: `Clip range: ${start}ms – ${end}ms (${(end - start) / 1000}s)` }] };
    },
  );

  ctx.tool(
    'get_timeline',
    'Return the current animation timeline as JSON.',
    {},
    async () => ({
      content: [{ type: 'text' as const, text: ctx.getTimelineJSON() }],
    }),
  );

  ctx.mutatingTool(
    'clear_animation',
    'Clear all animation tracks.',
    {},
    async () => {
      const state = ctx.getState();
      state.timeline.tracks = [];
      return { content: [{ type: 'text', text: 'All animation tracks cleared.' }] };
    },
  );

  ctx.mutatingTool(
    'add_scale_animation',
    'Add scale keyframes with a specific origin (edge/corner/center). Auto-computes translate compensation to keep the origin point fixed during scaling.',
    {
      targetId: boundedString(ctx.limits).describe('Element ID'),
      origin: scaleOriginSchema.describe('Scale origin point'),
      keyframes: z.union([
        scaleKeyframesSchema,
        z.string().max(ctx.limits.maxStateBytes),
      ]).describe('Array of {time, scaleX, scaleY, easing?}; legacy JSON strings are deprecated'),
    },
    async ({ targetId, origin, keyframes }) => {
      const parsed = parseLegacyArray(
        keyframes,
        scaleKeyframesSchema,
        'scale keyframes',
        ctx.limits,
      );
      const state = ctx.getState();
      const element = state.scene.elements.find((entry: any) => entry.id === targetId);
      if (!element) invalidInput(`Element "${targetId}" not found`);

      const bounds = getElementBounds(element);
      const width = bounds.maxX - bounds.minX;
      const height = bounds.maxY - bounds.minY;
      const [originX, originY] = ORIGIN_MAP[origin] ?? [0.5, 0.5];
      const batch: {
        targetId: string;
        property: AnimatableProperty;
        time: number;
        value: number;
        easing?: EasingType;
      }[] = [];

      for (const keyframe of parsed.value) {
        const scaleX = keyframe.scaleX ?? 1;
        const scaleY = keyframe.scaleY ?? 1;
        const easing = keyframe.easing ?? 'linear';
        batch.push(
          { targetId, property: 'scaleX', time: keyframe.time, value: scaleX, easing },
          { targetId, property: 'scaleY', time: keyframe.time, value: scaleY, easing },
        );

        const translateX = -width * (scaleX - 1) * originX;
        const translateY = -height * (scaleY - 1) * originY;
        if (
          Math.abs(translateX) > 0.1 ||
          Math.abs(translateY) > 0.1 ||
          originX !== 0 ||
          originY !== 0
        ) {
          batch.push(
            {
              targetId,
              property: 'translateX',
              time: keyframe.time,
              value: translateX,
              easing,
            },
            {
              targetId,
              property: 'translateY',
              time: keyframe.time,
              value: translateY,
              easing,
            },
          );
        }
      }

      assertAdditionalKeyframes(state, batch.length, ctx.limits);
      ctx.updateState(addKeyframesBatchToState(state, batch));
      return {
        content: [{
          type: 'text',
          text: `Added ${parsed.value.length} scale keyframes with origin "${origin}" for "${targetId}".${legacyDeprecation('keyframes', parsed.legacy)}`,
        }],
      };
    },
  );

  ctx.mutatingTool(
    'set_camera_frame',
    'Set the camera frame position, size, and aspect ratio. Also creates initial keyframes at time 0 for translateX, translateY, scaleX, scaleY so the camera starts at this position.',
    {
      x: z.number().finite().optional().describe('Camera center X (scene coords)'),
      y: z.number().finite().optional().describe('Camera center Y (scene coords)'),
      width: z.number().finite().positive().optional().describe('Camera width (scene units)'),
      aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:2']).optional().describe('Aspect ratio'),
    },
    async ({ x, y, width, aspectRatio }) => {
      const state = ctx.getState();
      if (x !== undefined) state.playback.cameraFrame.x = x;
      if (y !== undefined) state.playback.cameraFrame.y = y;
      if (width !== undefined) state.playback.cameraFrame.width = width;
      if (aspectRatio !== undefined) {
        state.playback.cameraFrame.aspectRatio = aspectRatio;
      }

      const CAMERA_ID = '__camera_frame__';
      assertAdditionalKeyframes(state, 4, ctx.limits);
      ctx.updateState(addKeyframesBatchToState(state, [
        { targetId: CAMERA_ID, property: 'translateX', time: 0, value: 0 },
        { targetId: CAMERA_ID, property: 'translateY', time: 0, value: 0 },
        { targetId: CAMERA_ID, property: 'scaleX', time: 0, value: 1 },
        { targetId: CAMERA_ID, property: 'scaleY', time: 0, value: 1 },
      ]));

      const updated = ctx.getState();
      const cameraFrame = updated.playback.cameraFrame;
      return { content: [{ type: 'text', text: `Camera: ${cameraFrame.aspectRatio} at (${cameraFrame.x}, ${cameraFrame.y}), width ${cameraFrame.width}. Initial keyframes created at t=0.` }] };
    },
  );

  ctx.mutatingTool(
    'add_camera_keyframe',
    'Add a keyframe for camera pan/zoom animation.',
    {
      property: z.enum(['translateX', 'translateY', 'scaleX', 'scaleY']).describe('Camera property'),
      time: boundedTime(ctx.limits).describe('Time in ms'),
      value: boundedAnimationValue().describe('Value'),
      easing: easingSchema.optional(),
    },
    async ({ property, time, value, easing }) => {
      const CAMERA_ID = '__camera_frame__';
      const state = ctx.getState();
      assertAdditionalKeyframes(state, 1, ctx.limits);
      ctx.updateState(addKeyframeToState(state, CAMERA_ID, property as AnimatableProperty, time, value, (easing as EasingType) ?? 'linear'));
      return { content: [{ type: 'text', text: `Camera keyframe: ${property} = ${value} at ${time}ms` }] };
    },
  );

  ctx.mutatingTool(
    'add_camera_keyframes_batch',
    'Add multiple camera keyframes at once. Properties: translateX, translateY, scaleX, scaleY.',
    {
      keyframes: z.union([
        cameraKeyframesSchema,
        z.string().max(ctx.limits.maxStateBytes),
      ]).describe('Array of camera keyframes; legacy JSON strings are deprecated'),
    },
    async ({ keyframes }) => {
      const parsed = parseLegacyArray(
        keyframes,
        cameraKeyframesSchema,
        'camera keyframes',
        ctx.limits,
      );
      const cameraId = '__camera_frame__';
      const propertyMap: Record<string, AnimatableProperty> = {
        translateX: 'translateX',
        translateY: 'translateY',
        scaleX: 'scaleX',
        scaleY: 'scaleY',
        x: 'translateX',
        y: 'translateY',
        panX: 'translateX',
        panY: 'translateY',
        zoom: 'scaleX',
        scale: 'scaleX',
      };
      const batch = parsed.value.map((keyframe) => ({
        targetId: cameraId,
        property: propertyMap[keyframe.property],
        time: keyframe.time,
        value: keyframe.value,
        easing: keyframe.easing ?? 'linear' as EasingType,
      }));

      const state = ctx.getState();
      assertAdditionalKeyframes(state, batch.length, ctx.limits);
      ctx.updateState(addKeyframesBatchToState(state, batch));
      return {
        content: [{
          type: 'text',
          text: `Added ${batch.length} camera keyframes.${legacyDeprecation('keyframes', parsed.legacy)}`,
        }],
      };
    },
  );
}
