/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { addKeyframeToState } from '../state.js';
import type { AnimatableProperty, EasingType } from '../types.js';
import { ANIMATABLE_PROPERTIES, EASING_TYPES } from '../types.js';
import { ORIGIN_MAP } from './geometry.js';
import type { StateContext } from './stateContext.js';

export function registerAnimationTools(
  server: McpServer,
  ctx: StateContext,
  getElementBounds: (el: any) => { minX: number; minY: number; maxX: number; maxY: number },
): void {
  ctx.mutatingTool(
    'add_keyframe',
    'Add a keyframe to an animation track. Auto-creates the track if it doesn\'t exist.',
    {
      targetId: z.string().describe('Element or group ID'),
      property: z.enum(ANIMATABLE_PROPERTIES as unknown as [string, ...string[]]).describe('Animatable property'),
      time: z.number().min(0).describe('Time in milliseconds'),
      value: z.number().describe('Property value at this time'),
      easing: z.enum(EASING_TYPES as unknown as [string, ...string[]]).optional().describe('Easing to next keyframe'),
    },
    async ({ targetId, property, time, value, easing }) => {
      const state = ctx.getState();
      ctx.updateState(addKeyframeToState(state, targetId, property as AnimatableProperty, time, value, (easing as EasingType) ?? 'linear'));
      return { content: [{ type: 'text', text: `Keyframe added: ${property} = ${value} at ${time}ms for ${targetId}` }] };
    },
  );

  ctx.mutatingTool(
    'add_keyframes_batch',
    'Add multiple keyframes at once. For scaleX/scaleY keyframes, include a "scaleOrigin" field per keyframe to control where scaling anchors from (auto-adds translate compensation). Origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right.',
    {
      keyframes: z.string().describe('JSON array of {targetId, property, time, value, easing?, scaleOrigin?}'),
    },
    async ({ keyframes }) => {
      try {
        const parsed = JSON.parse(keyframes);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: must be array' }] };

        const scaleCompensation = new Map<string, { targetId: string; time: number; sx: number; sy: number; origin: string; easing: string }>();
        for (const kf of parsed) {
          if ((kf.property === 'scaleX' || kf.property === 'scaleY') && kf.scaleOrigin && kf.scaleOrigin !== 'top-left') {
            const key = `${kf.targetId}@${kf.time}`;
            const existing = scaleCompensation.get(key) ?? { targetId: kf.targetId, time: kf.time, sx: 1, sy: 1, origin: kf.scaleOrigin, easing: kf.easing ?? 'linear' };
            if (kf.property === 'scaleX') existing.sx = kf.value;
            if (kf.property === 'scaleY') existing.sy = kf.value;
            existing.origin = kf.scaleOrigin;
            scaleCompensation.set(key, existing);
          }
        }

        const validProperties = new Set(ANIMATABLE_PROPERTIES);
        let count = 0;
        let skipped = 0;
        for (const kf of parsed) {
          if (!validProperties.has(kf.property)) { skipped++; continue; }
          const state = ctx.getState();
          ctx.updateState(addKeyframeToState(state, kf.targetId, kf.property, kf.time, kf.value, kf.easing ?? 'linear'));
          count++;
        }

        for (const skf of scaleCompensation.values()) {
          const [ox, oy] = ORIGIN_MAP[skf.origin] ?? [0.5, 0.5];
          const state = ctx.getState();
          const el = state.scene.elements.find((e: any) => e.id === skf.targetId);
          if (!el) continue;
          const bounds = getElementBounds(el);
          const w = bounds.maxX - bounds.minX;
          const h = bounds.maxY - bounds.minY;
          const tx = -w * (skf.sx - 1) * ox;
          const ty = -h * (skf.sy - 1) * oy;
          ctx.updateState(addKeyframeToState(state, skf.targetId, 'translateX', skf.time, tx, skf.easing as EasingType));
          const updated = ctx.getState();
          ctx.updateState(addKeyframeToState(updated, skf.targetId, 'translateY', skf.time, ty, skf.easing as EasingType));
          count += 2;
        }

        return { content: [{ type: 'text', text: `Added ${count} keyframes.${skipped ? ` Skipped ${skipped} with invalid properties.` : ''}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  ctx.mutatingTool(
    'remove_keyframe',
    'Remove a keyframe by track and keyframe ID.',
    {
      trackId: z.string().describe('Track ID'),
      keyframeId: z.string().describe('Keyframe ID'),
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
      elementIds: z.array(z.string()).describe('Element IDs in reveal order'),
      property: z.enum(['opacity', 'drawProgress']).default('opacity').describe('Property to animate'),
      startTime: z.number().min(0).default(0).describe('When sequence starts (ms)'),
      delay: z.number().min(0).default(300).describe('Delay between each reveal (ms)'),
      duration: z.number().min(50).default(500).describe('Duration of each reveal (ms)'),
    },
    async ({ elementIds, property, startTime, delay, duration }) => {
      for (let i = 0; i < elementIds.length; i++) {
        const revealStart = startTime + i * delay;
        const revealEnd = revealStart + duration;
        const targetId = elementIds[i];

        if (revealStart > 0) {
          const state = ctx.getState();
          ctx.updateState(addKeyframeToState(state, targetId, property as AnimatableProperty, 0, 0));
        }
        if (revealStart > 10) {
          const state = ctx.getState();
          ctx.updateState(addKeyframeToState(state, targetId, property as AnimatableProperty, revealStart, 0));
        }
        const state = ctx.getState();
        ctx.updateState(addKeyframeToState(state, targetId, property as AnimatableProperty, revealEnd, 1, 'easeOut'));
      }
      const totalDuration = startTime + (elementIds.length - 1) * delay + duration;
      return { content: [{ type: 'text', text: `Sequence created: ${elementIds.length} elements, total ${totalDuration}ms.` }] };
    },
  );

  ctx.mutatingTool(
    'set_clip_range',
    'Set the export clip start and end times.',
    {
      start: z.number().min(0).describe('Clip start time (ms)'),
      end: z.number().min(100).describe('Clip end time (ms)'),
    },
    async ({ start, end }) => {
      const state = ctx.getState();
      state.clipStart = start;
      state.clipEnd = Math.max(start + 100, end);
      return { content: [{ type: 'text', text: `Clip range: ${start}ms – ${end}ms (${(end - start) / 1000}s)` }] };
    },
  );

  server.tool(
    'get_timeline',
    'Return the current animation timeline as JSON.',
    {},
    async () => {
      const state = ctx.getState();
      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            timeline: state.timeline,
            clipStart: state.clipStart,
            clipEnd: state.clipEnd,
            cameraFrame: state.cameraFrame,
          }, null, 2),
        }],
      };
    },
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
      targetId: z.string().describe('Element ID'),
      origin: z.enum(['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom', 'left', 'right']).describe('Scale origin point'),
      keyframes: z.string().describe('JSON array of {time, scaleX, scaleY, easing?}'),
    },
    async ({ targetId, origin, keyframes }) => {
      try {
        const parsed = JSON.parse(keyframes);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: must be array' }] };

        const state = ctx.getState();
        const el = state.scene.elements.find((e: any) => e.id === targetId);
        if (!el) return { content: [{ type: 'text', text: `Element "${targetId}" not found.` }] };

        const bounds = getElementBounds(el);
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;
        const [ox, oy] = ORIGIN_MAP[origin] ?? [0.5, 0.5];

        let count = 0;
        for (const kf of parsed) {
          const sx = kf.scaleX ?? 1;
          const sy = kf.scaleY ?? 1;
          const easing = kf.easing ?? 'linear';

          let currentState = ctx.getState();
          ctx.updateState(addKeyframeToState(currentState, targetId, 'scaleX', kf.time, sx, easing as EasingType));
          currentState = ctx.getState();
          ctx.updateState(addKeyframeToState(currentState, targetId, 'scaleY', kf.time, sy, easing as EasingType));

          const tx = -w * (sx - 1) * ox;
          const ty = -h * (sy - 1) * oy;

          if (Math.abs(tx) > 0.1 || Math.abs(ty) > 0.1 || ox !== 0 || oy !== 0) {
            currentState = ctx.getState();
            ctx.updateState(addKeyframeToState(currentState, targetId, 'translateX', kf.time, tx, easing as EasingType));
            currentState = ctx.getState();
            ctx.updateState(addKeyframeToState(currentState, targetId, 'translateY', kf.time, ty, easing as EasingType));
          }

          count++;
        }

        return { content: [{ type: 'text', text: `Added ${count} scale keyframes with origin "${origin}" for "${targetId}".` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  ctx.mutatingTool(
    'set_camera_frame',
    'Set the camera frame position, size, and aspect ratio. Also creates initial keyframes at time 0 for translateX, translateY, scaleX, scaleY so the camera starts at this position.',
    {
      x: z.number().optional().describe('Camera center X (scene coords)'),
      y: z.number().optional().describe('Camera center Y (scene coords)'),
      width: z.number().optional().describe('Camera width (scene units)'),
      aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:2']).optional().describe('Aspect ratio'),
    },
    async ({ x, y, width, aspectRatio }) => {
      const state = ctx.getState();
      if (x !== undefined) state.cameraFrame.x = x;
      if (y !== undefined) state.cameraFrame.y = y;
      if (width !== undefined) state.cameraFrame.width = width;
      if (aspectRatio !== undefined) state.cameraFrame.aspectRatio = aspectRatio;

      const CAMERA_ID = '__camera_frame__';
      let currentState = ctx.getState();
      ctx.updateState(addKeyframeToState(currentState, CAMERA_ID, 'translateX', 0, 0));
      currentState = ctx.getState();
      ctx.updateState(addKeyframeToState(currentState, CAMERA_ID, 'translateY', 0, 0));
      currentState = ctx.getState();
      ctx.updateState(addKeyframeToState(currentState, CAMERA_ID, 'scaleX', 0, 1));
      currentState = ctx.getState();
      ctx.updateState(addKeyframeToState(currentState, CAMERA_ID, 'scaleY', 0, 1));

      const updated = ctx.getState();
      return { content: [{ type: 'text', text: `Camera: ${updated.cameraFrame.aspectRatio} at (${updated.cameraFrame.x}, ${updated.cameraFrame.y}), width ${updated.cameraFrame.width}. Initial keyframes created at t=0.` }] };
    },
  );

  ctx.mutatingTool(
    'add_camera_keyframe',
    'Add a keyframe for camera pan/zoom animation.',
    {
      property: z.enum(['translateX', 'translateY', 'scaleX', 'scaleY']).describe('Camera property'),
      time: z.number().min(0).describe('Time in ms'),
      value: z.number().describe('Value'),
      easing: z.enum(EASING_TYPES as unknown as [string, ...string[]]).optional(),
    },
    async ({ property, time, value, easing }) => {
      const CAMERA_ID = '__camera_frame__';
      const state = ctx.getState();
      ctx.updateState(addKeyframeToState(state, CAMERA_ID, property as AnimatableProperty, time, value, (easing as EasingType) ?? 'linear'));
      return { content: [{ type: 'text', text: `Camera keyframe: ${property} = ${value} at ${time}ms` }] };
    },
  );

  ctx.mutatingTool(
    'add_camera_keyframes_batch',
    'Add multiple camera keyframes at once. Properties: translateX, translateY, scaleX, scaleY.',
    {
      keyframes: z.string().describe('JSON array of {property: "translateX"|"translateY"|"scaleX"|"scaleY", time, value, easing?}'),
    },
    async ({ keyframes }) => {
      try {
        const parsed = JSON.parse(keyframes);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: must be array' }] };
        const CAMERA_ID = '__camera_frame__';
        const validCameraProps = new Set(['translateX', 'translateY', 'scaleX', 'scaleY']);
        const propMap: Record<string, string> = {
          x: 'translateX',
          y: 'translateY',
          panX: 'translateX',
          panY: 'translateY',
          zoom: 'scaleX',
          scale: 'scaleX',
        };
        let count = 0;
        let skipped = 0;
        for (const kf of parsed) {
          let prop = kf.property;
          if (propMap[prop]) prop = propMap[prop];
          if (!validCameraProps.has(prop)) { skipped++; continue; }
          const state = ctx.getState();
          ctx.updateState(addKeyframeToState(state, CAMERA_ID, prop as AnimatableProperty, kf.time, kf.value, (kf.easing as EasingType) ?? 'linear'));
          count++;
        }
        return { content: [{ type: 'text', text: `Added ${count} camera keyframes.${skipped ? ` Skipped ${skipped} with invalid properties (use translateX, translateY, scaleX, scaleY).` : ''}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );
}
