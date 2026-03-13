/**
 * Animate-Excalidraw MCP Server
 *
 * Provides tools for creating Excalidraw scenes, animating them with keyframes,
 * and exporting the results. Designed for AI agent integration via MCP.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import type { CheckpointStore } from './checkpoint-store.js';
import { createDefaultState, addKeyframeToState, ensureTrack, createKeyframe, addKeyframeToTrack } from './state.js';
import type { ServerState, AnimatableProperty, EasingType, AnimationTrack } from './types.js';
import { ANIMATABLE_PROPERTIES, EASING_TYPES, PROPERTY_DEFAULTS, ASPECT_RATIOS } from './types.js';

export type StateChangeListener = (state: ServerState) => void;

// Module-level shared state — persists across all server instances (HTTP requests)
let _sharedState: ServerState = createDefaultState();

export function getSharedState(): ServerState { return _sharedState; }

export function createServer(
  store: CheckpointStore,
  onStateChange?: StateChangeListener,
): McpServer {
  const server = new McpServer({
    name: 'animate-excalidraw',
    version: '0.1.0',
  });

  /** Notify listeners after state mutation */
  function emitChange() {
    onStateChange?.(_sharedState);
  }

  /** Get current state (for SSE endpoint) */
  (server as any).__getState = () => _sharedState;

  // Convenience: local alias that all tool handlers use.
  // For mutations that reassign state (e.g., state = addKeyframeToState(...)),
  // use updateState() instead.
  function getS(): ServerState { return _sharedState; }
  function updateState(newState: ServerState) { _sharedState = newState; }

  // Read-only tools use server.tool directly.
  // Mutating tools use this wrapper that auto-emits state changes.
  function mutatingTool(
    name: string,
    description: string,
    schema: any,
    handler: (args: any) => Promise<{ content: { type: 'text'; text: string }[] }>,
  ) {
    server.tool(name, description, schema, async (args: any) => {
      const result = await handler(args);
      emitChange();
      return result;
    });
  }

  // ── REFERENCE TOOL ──────────────────────────────────────────────

  server.tool(
    'read_me',
    'Returns the Excalidraw element format reference, animation property docs, easing types, and usage examples. Call this FIRST before creating scenes or animations.',
    {},
    async () => ({
      content: [{
        type: 'text',
        text: REFERENCE_TEXT,
      }],
    }),
  );

  server.tool(
    'get_examples',
    'Returns few-shot examples showing how to create elements and animate them. Call this to learn common patterns.',
    {},
    async () => ({
      content: [{
        type: 'text' as const,
        text: EXAMPLES_TEXT,
      }],
    }),
  );

  // ── Element Normalizer ────────────────────────────────────────────

  /** Fill in default Excalidraw properties so elements render correctly */
  function normalizeElement(el: any): any {
    return {
      // Required base properties with defaults
      strokeColor: '#1e1e1e',
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      roughness: 1,
      groupIds: [],
      roundness: null,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      isDeleted: false,
      // Text-specific defaults
      ...(el.type === 'text' ? {
        fontSize: 20,
        fontFamily: 5,
        textAlign: 'left',
        verticalAlign: 'top',
        lineHeight: 1.25,
        baseline: 0,
        containerId: null,
        originalText: el.text ?? '',
        autoResize: true,
      } : {}),
      // Arrow/line defaults
      ...(el.type === 'arrow' || el.type === 'line' ? {
        points: el.points ?? [[0, 0], [el.width ?? 100, el.height ?? 0]],
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: el.type === 'arrow' ? 'arrow' : null,
        lastCommittedPoint: null,
      } : {}),
      // Override with user-provided values
      ...el,
      // Always force opacity to 100 — animation keyframes control visibility via multiplier.
      opacity: 100,
      // Text elements: force autoResize so Excalidraw computes proper width
      ...(el.type === 'text' && !el.containerId ? { autoResize: true } : {}),
      // Always generate seed/version if missing
      seed: el.seed ?? (Math.random() * 2147483647 | 0),
      version: el.version ?? 1,
      versionNonce: el.versionNonce ?? (Math.random() * 2147483647 | 0),
    };
  }

  function normalizeElements(elements: any[]): any[] {
    return elements.map(normalizeElement);
  }

  // ── SCENE TOOLS ─────────────────────────────────────────────────

  mutatingTool(
    'create_scene',
    'Create or replace the Excalidraw scene with the given elements.',
    { elements: z.string().describe('JSON string of Excalidraw elements array') },
    async ({ elements }) => {
      try {
        const parsed = JSON.parse(elements);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: elements must be a JSON array' }] };
        _sharedState.scene.elements = normalizeElements(parsed);
        return { content: [{ type: 'text', text: `Scene created with ${parsed.length} elements.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error parsing elements: ${e}` }] };
      }
    },
  );

  mutatingTool(
    'add_elements',
    'Add elements to the existing scene.',
    { elements: z.string().describe('JSON string of elements to add') },
    async ({ elements }) => {
      try {
        const parsed = JSON.parse(elements);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: must be array' }] };
        _sharedState.scene.elements.push(...normalizeElements(parsed));
        return { content: [{ type: 'text', text: `Added ${parsed.length} elements. Total: ${_sharedState.scene.elements.length}.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  mutatingTool(
    'remove_elements',
    'Remove elements by their IDs.',
    { ids: z.array(z.string()).describe('Array of element IDs to remove') },
    async ({ ids }) => {
      const before = _sharedState.scene.elements.length;
      _sharedState.scene.elements = _sharedState.scene.elements.filter((el: any) => !ids.includes(el.id));
      const removed = before - _sharedState.scene.elements.length;
      return { content: [{ type: 'text', text: `Removed ${removed} elements. Total: ${_sharedState.scene.elements.length}.` }] };
    },
  );

  mutatingTool(
    'update_elements',
    'Update properties of existing elements.',
    { updates: z.string().describe('JSON string of array [{id, ...properties}]') },
    async ({ updates }) => {
      try {
        const parsed = JSON.parse(updates);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: must be array' }] };
        let updated = 0;
        for (const upd of parsed) {
          const idx = _sharedState.scene.elements.findIndex((el: any) => el.id === upd.id);
          if (idx >= 0) {
            _sharedState.scene.elements[idx] = { ..._sharedState.scene.elements[idx], ...upd };
            updated++;
          }
        }
        return { content: [{ type: 'text', text: `Updated ${updated} elements.` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  server.tool(
    'get_scene',
    'Return the current scene elements as JSON.',
    {},
    async () => ({
      content: [{ type: 'text', text: JSON.stringify(_sharedState.scene.elements, null, 2) }],
    }),
  );

  // ── ANIMATION TOOLS ─────────────────────────────────────────────

  mutatingTool(
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
      updateState(addKeyframeToState(_sharedState, targetId, property as AnimatableProperty, time, value, (easing as EasingType) ?? 'linear'));
      return { content: [{ type: 'text', text: `Keyframe added: ${property} = ${value} at ${time}ms for ${targetId}` }] };
    },
  );

  mutatingTool(
    'add_keyframes_batch',
    'Add multiple keyframes at once. For scaleX/scaleY keyframes, include a "scaleOrigin" field per keyframe to control where scaling anchors from (auto-adds translate compensation). Origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right.',
    {
      keyframes: z.string().describe('JSON array of {targetId, property, time, value, easing?, scaleOrigin?}'),
    },
    async ({ keyframes }) => {
      try {
        const parsed = JSON.parse(keyframes);
        if (!Array.isArray(parsed)) return { content: [{ type: 'text', text: 'Error: must be array' }] };

        const originMap: Record<string, [number, number]> = {
          'top-left': [0, 0], 'top': [0.5, 0], 'top-right': [1, 0],
          'left': [0, 0.5], 'center': [0.5, 0.5], 'right': [1, 0.5],
          'bottom-left': [0, 1], 'bottom': [0.5, 1], 'bottom-right': [1, 1],
        };

        // First pass: collect scale keyframes that have scaleOrigin, grouped by targetId+time
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

        // Second pass: add all keyframes
        const validProperties = new Set(ANIMATABLE_PROPERTIES);
        let count = 0;
        let skipped = 0;
        for (const kf of parsed) {
          if (!validProperties.has(kf.property)) { skipped++; continue; }
          updateState(addKeyframeToState(_sharedState, kf.targetId, kf.property, kf.time, kf.value, kf.easing ?? 'linear'));
          count++;
        }

        // Third pass: add translate compensation for scale keyframes with origins
        for (const skf of scaleCompensation.values()) {
          const [ox, oy] = originMap[skf.origin] ?? [0.5, 0.5];
          const el = _sharedState.scene.elements.find((e: any) => e.id === skf.targetId);
          if (!el) continue;
          const bounds = getElementBounds(el);
          const w = bounds.maxX - bounds.minX;
          const h = bounds.maxY - bounds.minY;
          const tx = -w * (skf.sx - 1) * ox;
          const ty = -h * (skf.sy - 1) * oy;
          updateState(addKeyframeToState(_sharedState, skf.targetId, 'translateX', skf.time, tx, skf.easing as EasingType));
          updateState(addKeyframeToState(_sharedState, skf.targetId, 'translateY', skf.time, ty, skf.easing as EasingType));
          count += 2;
        }

        return { content: [{ type: 'text', text: `Added ${count} keyframes.${skipped ? ` Skipped ${skipped} with invalid properties.` : ''}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  mutatingTool(
    'remove_keyframe',
    'Remove a keyframe by track and keyframe ID.',
    {
      trackId: z.string().describe('Track ID'),
      keyframeId: z.string().describe('Keyframe ID'),
    },
    async ({ trackId, keyframeId }) => {
      const track = _sharedState.timeline.tracks.find(t => t.id === trackId);
      if (!track) return { content: [{ type: 'text', text: 'Track not found.' }] };
      const before = track.keyframes.length;
      track.keyframes = track.keyframes.filter(kf => kf.id !== keyframeId);
      return { content: [{ type: 'text', text: `Removed ${before - track.keyframes.length} keyframe(s).` }] };
    },
  );

  mutatingTool(
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
          updateState(addKeyframeToState(_sharedState, targetId, property as AnimatableProperty, 0, 0));
        }
        if (revealStart > 10) {
          updateState(addKeyframeToState(_sharedState, targetId, property as AnimatableProperty, revealStart, 0));
        }
        updateState(addKeyframeToState(_sharedState, targetId, property as AnimatableProperty, revealEnd, 1, 'easeOut'));
      }
      const totalDuration = startTime + (elementIds.length - 1) * delay + duration;
      return { content: [{ type: 'text', text: `Sequence created: ${elementIds.length} elements, total ${totalDuration}ms.` }] };
    },
  );

  mutatingTool(
    'set_clip_range',
    'Set the export clip start and end times.',
    {
      start: z.number().min(0).describe('Clip start time (ms)'),
      end: z.number().min(100).describe('Clip end time (ms)'),
    },
    async ({ start, end }) => {
      _sharedState.clipStart = start;
      _sharedState.clipEnd = Math.max(start + 100, end);
      return { content: [{ type: 'text', text: `Clip range: ${start}ms – ${end}ms (${(end - start) / 1000}s)` }] };
    },
  );

  server.tool(
    'get_timeline',
    'Return the current animation timeline as JSON.',
    {},
    async () => ({
      content: [{
        type: 'text',
        text: JSON.stringify({
          timeline: _sharedState.timeline,
          clipStart: _sharedState.clipStart,
          clipEnd: _sharedState.clipEnd,
          cameraFrame: _sharedState.cameraFrame,
        }, null, 2),
      }],
    }),
  );

  mutatingTool(
    'clear_animation',
    'Clear all animation tracks.',
    {},
    async () => {
      _sharedState.timeline.tracks = [];
      return { content: [{ type: 'text', text: 'All animation tracks cleared.' }] };
    },
  );

  mutatingTool(
    'clear_scene',
    'Clear all elements and all animation tracks. Resets the scene to a blank canvas.',
    {},
    async () => {
      _sharedState.scene.elements = [];
      _sharedState.scene.files = {};
      _sharedState.timeline.tracks = [];
      return { content: [{ type: 'text', text: 'Scene and all animations cleared.' }] };
    },
  );

  mutatingTool(
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

        const el = _sharedState.scene.elements.find((e: any) => e.id === targetId);
        if (!el) return { content: [{ type: 'text', text: `Element "${targetId}" not found.` }] };

        const bounds = getElementBounds(el);
        const w = bounds.maxX - bounds.minX;
        const h = bounds.maxY - bounds.minY;

        // Origin multipliers: how much of the size change to compensate via translate
        // top-left: (0, 0) — no compensation needed (native behavior)
        // center: (0.5, 0.5) — compensate half in both directions
        // bottom-right: (1, 1) — compensate full width/height change
        const originMap: Record<string, [number, number]> = {
          'top-left': [0, 0],
          'top': [0.5, 0],
          'top-right': [1, 0],
          'left': [0, 0.5],
          'center': [0.5, 0.5],
          'right': [1, 0.5],
          'bottom-left': [0, 1],
          'bottom': [0.5, 1],
          'bottom-right': [1, 1],
        };
        const [ox, oy] = originMap[origin] ?? [0.5, 0.5];

        let count = 0;
        for (const kf of parsed) {
          const sx = kf.scaleX ?? 1;
          const sy = kf.scaleY ?? 1;
          const easing = kf.easing ?? 'linear';

          // Add scale keyframes
          updateState(addKeyframeToState(_sharedState, targetId, 'scaleX', kf.time, sx, easing as EasingType));
          updateState(addKeyframeToState(_sharedState, targetId, 'scaleY', kf.time, sy, easing as EasingType));

          // Compute translate compensation to keep origin fixed
          // When scaling from top-left (ox=0): no translate needed
          // When scaling from center (ox=0.5): tx = -w * (sx - 1) * 0.5
          // When scaling from right (ox=1): tx = -w * (sx - 1)
          const tx = -w * (sx - 1) * ox;
          const ty = -h * (sy - 1) * oy;

          if (Math.abs(tx) > 0.1 || Math.abs(ty) > 0.1 || ox !== 0 || oy !== 0) {
            updateState(addKeyframeToState(_sharedState, targetId, 'translateX', kf.time, tx, easing as EasingType));
            updateState(addKeyframeToState(_sharedState, targetId, 'translateY', kf.time, ty, easing as EasingType));
          }

          count++;
        }

        return { content: [{ type: 'text', text: `Added ${count} scale keyframes with origin "${origin}" for "${targetId}".` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  // ── CAMERA TOOLS ────────────────────────────────────────────────

  mutatingTool(
    'set_camera_frame',
    'Set the camera frame position, size, and aspect ratio. Also creates initial keyframes at time 0 for translateX, translateY, scaleX, scaleY so the camera starts at this position.',
    {
      x: z.number().optional().describe('Camera center X (scene coords)'),
      y: z.number().optional().describe('Camera center Y (scene coords)'),
      width: z.number().optional().describe('Camera width (scene units)'),
      aspectRatio: z.enum(['16:9', '4:3', '1:1', '3:2']).optional().describe('Aspect ratio'),
    },
    async ({ x, y, width, aspectRatio }) => {
      if (x !== undefined) _sharedState.cameraFrame.x = x;
      if (y !== undefined) _sharedState.cameraFrame.y = y;
      if (width !== undefined) _sharedState.cameraFrame.width = width;
      if (aspectRatio !== undefined) _sharedState.cameraFrame.aspectRatio = aspectRatio;

      // Create initial camera keyframes at t=0 so camera starts at the defined position
      const CAMERA_ID = '__camera_frame__';
      updateState(addKeyframeToState(_sharedState, CAMERA_ID, 'translateX', 0, 0));
      updateState(addKeyframeToState(_sharedState, CAMERA_ID, 'translateY', 0, 0));
      updateState(addKeyframeToState(_sharedState, CAMERA_ID, 'scaleX', 0, 1));
      updateState(addKeyframeToState(_sharedState, CAMERA_ID, 'scaleY', 0, 1));

      return { content: [{ type: 'text', text: `Camera: ${_sharedState.cameraFrame.aspectRatio} at (${_sharedState.cameraFrame.x}, ${_sharedState.cameraFrame.y}), width ${_sharedState.cameraFrame.width}. Initial keyframes created at t=0.` }] };
    },
  );

  mutatingTool(
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
      updateState(addKeyframeToState(_sharedState, CAMERA_ID, property as AnimatableProperty, time, value, (easing as EasingType) ?? 'linear'));
      return { content: [{ type: 'text', text: `Camera keyframe: ${property} = ${value} at ${time}ms` }] };
    },
  );

  mutatingTool(
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
        // Map common mistakes: x→translateX, y→translateY, zoom→scaleX
        const propMap: Record<string, string> = {
          x: 'translateX', y: 'translateY',
          panX: 'translateX', panY: 'translateY',
          zoom: 'scaleX', scale: 'scaleX',
        };
        let count = 0;
        let skipped = 0;
        for (const kf of parsed) {
          let prop = kf.property;
          if (propMap[prop]) prop = propMap[prop];
          if (!validCameraProps.has(prop)) { skipped++; continue; }
          updateState(addKeyframeToState(_sharedState, CAMERA_ID, prop as AnimatableProperty, kf.time, kf.value, (kf.easing as EasingType) ?? 'linear'));
          count++;
        }
        return { content: [{ type: 'text', text: `Added ${count} camera keyframes.${skipped ? ` Skipped ${skipped} with invalid properties (use translateX, translateY, scaleX, scaleY).` : ''}` }] };
      } catch (e) {
        return { content: [{ type: 'text', text: `Error: ${e}` }] };
      }
    },
  );

  // ── INSPECTION & VALIDATION TOOLS ────────────────────────────────

  /**
   * Interpolate a track's value at a given time (simplified linear interpolation).
   */
  function interpolateTrackAt(track: AnimationTrack, time: number): number {
    const kfs = track.keyframes;
    if (kfs.length === 0) return PROPERTY_DEFAULTS[track.property];
    if (time <= kfs[0].time) return kfs[0].value;
    if (time >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].value;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (time >= kfs[i].time && time <= kfs[i + 1].time) {
        const t = (time - kfs[i].time) / (kfs[i + 1].time - kfs[i].time);
        return kfs[i].value + (kfs[i + 1].value - kfs[i].value) * t;
      }
    }
    return kfs[kfs.length - 1].value;
  }

  /** Get element bounds (handles negative width/height and points). */
  function getElementBounds(el: any): { minX: number; minY: number; maxX: number; maxY: number } {
    if (el.points?.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const [px, py] of el.points) {
        const ax = el.x + px, ay = el.y + py;
        if (ax < minX) minX = ax; if (ay < minY) minY = ay;
        if (ax > maxX) maxX = ax; if (ay > maxY) maxY = ay;
      }
      return { minX, minY, maxX, maxY };
    }
    const x1 = Math.min(el.x, el.x + el.width);
    const y1 = Math.min(el.y, el.y + el.height);
    return { minX: x1, minY: y1, maxX: x1 + Math.abs(el.width), maxY: y1 + Math.abs(el.height) };
  }

  /** Get animated position of an element at a given time. */
  function getAnimatedBoundsAt(elId: string, time: number): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const el = _sharedState.scene.elements.find((e: any) => e.id === elId);
    if (!el) return null;
    const base = getElementBounds(el);
    const tracks = _sharedState.timeline.tracks.filter((t: any) => t.targetId === elId);
    let tx = 0, ty = 0, sx = 1, sy = 1;
    for (const track of tracks) {
      const v = interpolateTrackAt(track, time);
      if (track.property === 'translateX') tx = v;
      if (track.property === 'translateY') ty = v;
      if (track.property === 'scaleX') sx = v;
      if (track.property === 'scaleY') sy = v;
    }
    const w = (base.maxX - base.minX) * sx;
    const h = (base.maxY - base.minY) * sy;
    return { minX: base.minX + tx, minY: base.minY + ty, maxX: base.minX + tx + w, maxY: base.minY + ty + h };
  }

  /** Get camera rect at a given time. */
  function getCameraRectAt(time: number): { left: number; top: number; right: number; bottom: number; cx: number; cy: number } {
    const cf = _sharedState.cameraFrame;
    const camTracks = _sharedState.timeline.tracks.filter((t: any) => t.targetId === '__camera_frame__');
    let tx = 0, ty = 0, sx = 1, sy = 1;
    for (const track of camTracks) {
      const v = interpolateTrackAt(track, time);
      if (track.property === 'translateX') tx = v;
      if (track.property === 'translateY') ty = v;
      if (track.property === 'scaleX') sx = v;
      if (track.property === 'scaleY') sy = v;
    }
    const w = cf.width * sx;
    const h = (cf.width / (ASPECT_RATIOS[cf.aspectRatio] ?? 16 / 9)) * sy;
    const cx = cf.x + tx;
    const cy = cf.y + ty;
    return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2, cx, cy };
  }

  server.tool(
    'are_items_in_line',
    'Check if the given items are aligned horizontally or vertically (within a tolerance).',
    {
      ids: z.array(z.string()).describe('Element IDs to check'),
      axis: z.enum(['horizontal', 'vertical']).describe('Alignment axis'),
      tolerance: z.number().optional().describe('Max deviation in scene units (default 10)'),
    },
    async ({ ids, axis, tolerance = 10 }) => {
      const centers: { id: string; cx: number; cy: number }[] = [];
      for (const id of ids) {
        const el = _sharedState.scene.elements.find((e: any) => e.id === id);
        if (!el) return { content: [{ type: 'text', text: `Element "${id}" not found.` }] };
        const b = getElementBounds(el);
        centers.push({ id, cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 });
      }
      const values = centers.map(c => axis === 'horizontal' ? c.cy : c.cx);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const maxDev = Math.max(...values.map(v => Math.abs(v - avg)));
      const aligned = maxDev <= tolerance;
      const details = centers.map(c => `${c.id}: (${Math.round(c.cx)}, ${Math.round(c.cy)})`).join(', ');
      return { content: [{ type: 'text', text: `${aligned ? '✅ Aligned' : '❌ Not aligned'} (max deviation: ${Math.round(maxDev)}px, tolerance: ${tolerance}px). Centers: ${details}` }] };
    },
  );

  server.tool(
    'is_camera_centered',
    'Check if the camera is centered on the scene content (horizontally, vertically, or both).',
    {
      axis: z.enum(['horizontal', 'vertical', 'both']).describe('Which axis to check'),
      time: z.number().min(0).default(0).describe('Time in ms to check at'),
      tolerance: z.number().optional().describe('Max deviation (default 20)'),
    },
    async ({ axis, time, tolerance = 20 }) => {
      // Scene content center
      let sMinX = Infinity, sMinY = Infinity, sMaxX = -Infinity, sMaxY = -Infinity;
      for (const el of _sharedState.scene.elements) {
        const b = getElementBounds(el);
        if (b.minX < sMinX) sMinX = b.minX; if (b.minY < sMinY) sMinY = b.minY;
        if (b.maxX > sMaxX) sMaxX = b.maxX; if (b.maxY > sMaxY) sMaxY = b.maxY;
      }
      const sceneCX = (sMinX + sMaxX) / 2;
      const sceneCY = (sMinY + sMaxY) / 2;
      const cam = getCameraRectAt(time);
      const dxOk = Math.abs(cam.cx - sceneCX) <= tolerance;
      const dyOk = Math.abs(cam.cy - sceneCY) <= tolerance;
      const ok = axis === 'horizontal' ? dxOk : axis === 'vertical' ? dyOk : dxOk && dyOk;
      return { content: [{ type: 'text', text: `${ok ? '✅ Centered' : '❌ Not centered'} (scene center: ${Math.round(sceneCX)},${Math.round(sceneCY)}, camera center: ${Math.round(cam.cx)},${Math.round(cam.cy)}, offsets: dx=${Math.round(cam.cx - sceneCX)} dy=${Math.round(cam.cy - sceneCY)})` }] };
    },
  );

  server.tool(
    'items_visible_in_camera',
    'Check what percentage of items are visible in the camera frame at a given time.',
    {
      time: z.number().min(0).default(0).describe('Time in ms'),
    },
    async ({ time }) => {
      const cam = getCameraRectAt(time);
      const elements = _sharedState.scene.elements.filter((e: any) => !e.isDeleted && e.id !== '__camera_frame__');
      let visible = 0;
      const details: string[] = [];
      for (const el of elements) {
        const b = getAnimatedBoundsAt(el.id, time);
        if (!b) continue;
        // Check opacity
        const opTrack = _sharedState.timeline.tracks.find((t: any) => t.targetId === el.id && t.property === 'opacity');
        const opacity = opTrack ? interpolateTrackAt(opTrack, time) : 1;
        // Check if bounds overlap camera
        const inView = b.maxX > cam.left && b.minX < cam.right && b.maxY > cam.top && b.minY < cam.bottom;
        const isVisible = inView && opacity > 0.01;
        if (isVisible) visible++;
        details.push(`${el.id}: ${isVisible ? '✅' : '❌'} (opacity=${(opacity * 100).toFixed(0)}%, inView=${inView})`);
      }
      const pct = elements.length > 0 ? Math.round(visible / elements.length * 100) : 0;
      return { content: [{ type: 'text', text: `${visible}/${elements.length} items visible (${pct}%) at ${time}ms.\n${details.join('\n')}` }] };
    },
  );

  server.tool(
    'animations_of_item',
    'Returns a timeline description of all animations an item goes through.',
    {
      targetId: z.string().describe('Element ID'),
    },
    async ({ targetId }) => {
      const tracks = _sharedState.timeline.tracks.filter((t: any) => t.targetId === targetId);
      if (tracks.length === 0) {
        return { content: [{ type: 'text', text: `No animations for "${targetId}".` }] };
      }
      const lines: string[] = [`Animations for "${targetId}":`];
      for (const track of tracks) {
        if (track.keyframes.length === 0) continue;
        lines.push(`  ${track.property}:`);
        for (let i = 0; i < track.keyframes.length; i++) {
          const kf = track.keyframes[i];
          const next = track.keyframes[i + 1];
          if (next) {
            const fromLabel = track.property === 'opacity' ? `${(kf.value * 100).toFixed(0)}%` : String(kf.value);
            const toLabel = track.property === 'opacity' ? `${(next.value * 100).toFixed(0)}%` : String(next.value);
            const direction = next.value > kf.value ? '↑' : next.value < kf.value ? '↓' : '→';
            lines.push(`    ${kf.time}ms ${fromLabel} ${direction} ${toLabel} ${next.time}ms (${kf.easing})`);
          } else {
            const label = track.property === 'opacity' ? `${(kf.value * 100).toFixed(0)}%` : String(kf.value);
            lines.push(`    ${kf.time}ms ${label} (hold)`);
          }
        }
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    },
  );

  // ── BATCH DELETE TOOL ──────────────────────────────────────────

  mutatingTool(
    'delete_items',
    'Delete specific elements and all their animation tracks. Batch operation.',
    {
      ids: z.array(z.string()).describe('Element IDs to delete'),
    },
    async ({ ids }) => {
      const idSet = new Set(ids);
      const beforeEl = _sharedState.scene.elements.length;
      const beforeTr = _sharedState.timeline.tracks.length;
      _sharedState.scene.elements = _sharedState.scene.elements.filter((el: any) => !idSet.has(el.id));
      _sharedState.timeline.tracks = _sharedState.timeline.tracks.filter((t: any) => !idSet.has(t.targetId));
      const removedEl = beforeEl - _sharedState.scene.elements.length;
      const removedTr = beforeTr - _sharedState.timeline.tracks.length;
      return { content: [{ type: 'text', text: `Deleted ${removedEl} elements and ${removedTr} animation tracks.` }] };
    },
  );

  // ── CHECKPOINT TOOLS ────────────────────────────────────────────

  mutatingTool(
    'save_checkpoint',
    'Save current scene + animation state to a checkpoint.',
    { id: z.string().optional().describe('Checkpoint ID (auto-generated if omitted)') },
    async ({ id }) => {
      const checkpointId = id ?? nanoid(12);
      await store.save(checkpointId, _sharedState);
      return { content: [{ type: 'text', text: `Saved checkpoint: ${checkpointId}` }] };
    },
  );

  mutatingTool(
    'load_checkpoint',
    'Load scene + animation state from a checkpoint.',
    { id: z.string().describe('Checkpoint ID') },
    async ({ id }) => {
      const loaded = await store.load(id);
      if (!loaded) return { content: [{ type: 'text', text: `Checkpoint "${id}" not found.` }] };
      updateState(loaded);
      return { content: [{ type: 'text', text: `Loaded checkpoint "${id}": ${_sharedState.scene.elements.length} elements, ${_sharedState.timeline.tracks.length} tracks.` }] };
    },
  );

  server.tool(
    'list_checkpoints',
    'List all saved checkpoints.',
    {},
    async () => {
      const ids = await store.list();
      return { content: [{ type: 'text', text: ids.length > 0 ? `Checkpoints:\n${ids.join('\n')}` : 'No checkpoints saved.' }] };
    },
  );

  return server;
}

// ── Reference text ────────────────────────────────────────────────

const REFERENCE_TEXT = `# Animate-Excalidraw MCP Reference

## Excalidraw Element Format

Every element has these base properties:
\`\`\`json
{
  "id": "unique-id",
  "type": "rectangle|ellipse|diamond|arrow|line|text|freedraw|image",
  "x": 100, "y": 200,
  "width": 300, "height": 150,
  "angle": 0,
  "strokeColor": "#1e1e1e",
  "backgroundColor": "transparent",
  "fillStyle": "solid",
  "strokeWidth": 2,
  "roughness": 1,
  "opacity": 100,
  "groupIds": [],
  "isDeleted": false
}
\`\`\`

### Text Elements
\`\`\`json
{
  "type": "text",
  "text": "Hello World",
  "fontSize": 20,
  "fontFamily": 5,
  "textAlign": "center",
  "verticalAlign": "middle"
}
\`\`\`

### Arrow/Line Elements
\`\`\`json
{
  "type": "arrow",
  "points": [[0, 0], [200, 100]],
  "startArrowhead": null,
  "endArrowhead": "arrow",
  "startBinding": null,
  "endBinding": null
}
\`\`\`

### Bound Text (Label on Shape)
Create a text element with \`containerId\` pointing to the shape:
\`\`\`json
{ "type": "text", "containerId": "shape-id", ... }
\`\`\`
And add to the shape: \`"boundElements": [{"id": "text-id", "type": "text"}]\`

## Color Palettes

**Stroke**: #1e1e1e, #e03131, #2f9e44, #1971c2, #f08c00, #6741d9, #0c8599, #e8590c
**Background**: transparent, #ffc9c9, #b2f2bb, #a5d8ff, #ffec99, #d0bfff, #99e9f2, #ffd8a8

## Animatable Properties

| Property | Range | Description |
|----------|-------|-------------|
| opacity | 0–1 | Element visibility (0=hidden, 1=visible) |
| translateX | px | Horizontal position offset |
| translateY | px | Vertical position offset |
| scaleX | 0.1+ | Horizontal scale (1=normal) |
| scaleY | 0.1+ | Vertical scale (1=normal) |
| rotation | degrees | Rotation angle |
| drawProgress | 0–1 | Stroke draw-on progress (for lines/arrows) |

## Easing Types

linear, easeIn, easeOut, easeInOut, easeInQuad, easeOutQuad, easeInOutQuad,
easeInCubic, easeOutCubic, easeInOutCubic, easeInBack, easeOutBack, easeInOutBack,
easeInElastic, easeOutElastic, easeInBounce, easeOutBounce, step

## Workflow

1. Call \`read_me\` (this tool) to get the reference
2. Call \`create_scene\` with Excalidraw elements JSON (or \`clear_scene\` to start fresh)
3. Call \`add_keyframe\` or \`add_keyframes_batch\` to animate elements
4. Use \`create_sequence\` for reveal animations
5. Call \`set_clip_range\` to set export bounds
6. Call \`save_checkpoint\` to persist
7. User opens the checkpoint in the animate-excalidraw web app for preview/export

Use \`clear_scene\` to reset everything (elements + animations) or \`clear_animation\` to keep elements but remove all keyframes.

## Example: Fade-in Rectangle

\`\`\`
1. create_scene: [{"id":"rect1","type":"rectangle","x":100,"y":100,"width":200,"height":100,...}]
2. add_keyframe: {targetId:"rect1", property:"opacity", time:0, value:0}
3. add_keyframe: {targetId:"rect1", property:"opacity", time:1000, value:1, easing:"easeOut"}
\`\`\`
`;

const EXAMPLES_TEXT = `# Animate-Excalidraw — Few-Shot Examples

## Example 1: Single Rectangle
\`\`\`
create_scene({ elements: '[{"id":"box1","type":"rectangle","x":200,"y":150,"width":250,"height":120,"strokeColor":"#1971c2","backgroundColor":"#a5d8ff","fillStyle":"solid"}]' })
\`\`\`

## Example 2: Rectangle with Bound Text Label
\`\`\`
create_scene({ elements: '[{"id":"server","type":"rectangle","x":100,"y":100,"width":200,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#a5d8ff","fillStyle":"solid","boundElements":[{"id":"server-label","type":"text"}]},{"id":"server-label","type":"text","x":140,"y":125,"width":120,"height":30,"text":"API Server","fontSize":20,"fontFamily":5,"textAlign":"center","verticalAlign":"middle","containerId":"server"}]' })
\`\`\`

## Example 3: Two Shapes Connected by Arrow
\`\`\`
create_scene({ elements: '[{"id":"A","type":"rectangle","x":100,"y":200,"width":150,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#b2f2bb","fillStyle":"solid"},{"id":"B","type":"rectangle","x":500,"y":200,"width":150,"height":80,"strokeColor":"#1e1e1e","backgroundColor":"#a5d8ff","fillStyle":"solid"},{"id":"arrow1","type":"arrow","x":250,"y":240,"width":250,"height":0,"points":[[0,0],[250,0]],"endArrowhead":"arrow","startBinding":{"elementId":"A","focus":0,"gap":1},"endBinding":{"elementId":"B","focus":0,"gap":1}}]' })
\`\`\`

## Example 4: Ellipse and Diamond
\`\`\`
add_elements({ elements: '[{"id":"circle1","type":"ellipse","x":300,"y":100,"width":120,"height":120,"strokeColor":"#e03131","backgroundColor":"#ffc9c9","fillStyle":"solid"},{"id":"diamond1","type":"diamond","x":500,"y":90,"width":140,"height":140,"strokeColor":"#6741d9","backgroundColor":"#d0bfff","fillStyle":"solid"}]' })
\`\`\`

## Example 5: Multi-Point Line
\`\`\`
add_elements({ elements: '[{"id":"line1","type":"line","x":100,"y":300,"width":400,"height":80,"points":[[0,0],[200,-80],[400,0]],"strokeColor":"#e03131","strokeWidth":3}]' })
\`\`\`

## Example 6: Standalone Text
\`\`\`
add_elements({ elements: '[{"id":"title","type":"text","x":200,"y":50,"width":300,"height":50,"text":"Architecture Overview","fontSize":36,"fontFamily":5,"textAlign":"center","strokeColor":"#1e1e1e"}]' })
\`\`\`

---

# Animation Examples

## Example 7: Fade In
\`\`\`
add_keyframe({ targetId: "box1", property: "opacity", time: 0, value: 0 })
add_keyframe({ targetId: "box1", property: "opacity", time: 800, value: 1, easing: "easeOut" })
\`\`\`

## Example 8: Slide In from Left
\`\`\`
add_keyframes_batch({ keyframes: '[{"targetId":"box1","property":"translateX","time":0,"value":-300},{"targetId":"box1","property":"translateX","time":1000,"value":0,"easing":"easeOutCubic"},{"targetId":"box1","property":"opacity","time":0,"value":0},{"targetId":"box1","property":"opacity","time":500,"value":1,"easing":"easeOut"}]' })
\`\`\`

## Example 9: Pop In from Center (Scale Up with Bounce)
\`\`\`
add_keyframes_batch({ keyframes: '[{"targetId":"box1","property":"scaleX","time":0,"value":0.3,"scaleOrigin":"center"},{"targetId":"box1","property":"scaleY","time":0,"value":0.3,"scaleOrigin":"center"},{"targetId":"box1","property":"scaleX","time":600,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},{"targetId":"box1","property":"scaleY","time":600,"value":1,"easing":"easeOutBack","scaleOrigin":"center"},{"targetId":"box1","property":"opacity","time":0,"value":0},{"targetId":"box1","property":"opacity","time":300,"value":1}]' })
\`\`\`

## Example 9b: Scale from Bottom Edge
\`\`\`
add_scale_animation({ targetId: "box1", origin: "bottom", keyframes: '[{"time":0,"scaleX":1,"scaleY":0},{"time":800,"scaleX":1,"scaleY":1,"easing":"easeOutCubic"}]' })
\`\`\`
Scale origins: center, top-left, top-right, bottom-left, bottom-right, top, bottom, left, right.
Add "scaleOrigin" per scaleX/scaleY keyframe in add_keyframes_batch, or use add_scale_animation for a single element.

## Example 10: Draw In an Arrow (Stroke Animation)
\`\`\`
add_keyframe({ targetId: "arrow1", property: "drawProgress", time: 0, value: 0 })
add_keyframe({ targetId: "arrow1", property: "drawProgress", time: 1200, value: 1, easing: "easeInOut" })
\`\`\`

## Example 11: Sequential Reveal — A → Arrow → B (Most Common Pattern)
\`\`\`
add_keyframes_batch({ keyframes: '[
  {"targetId":"A","property":"opacity","time":0,"value":0},
  {"targetId":"A","property":"opacity","time":600,"value":1,"easing":"easeOut"},
  {"targetId":"arrow1","property":"opacity","time":0,"value":0},
  {"targetId":"arrow1","property":"opacity","time":600,"value":0},
  {"targetId":"arrow1","property":"opacity","time":700,"value":1},
  {"targetId":"arrow1","property":"drawProgress","time":600,"value":0},
  {"targetId":"arrow1","property":"drawProgress","time":1800,"value":1,"easing":"easeInOut"},
  {"targetId":"B","property":"opacity","time":0,"value":0},
  {"targetId":"B","property":"opacity","time":1800,"value":0},
  {"targetId":"B","property":"opacity","time":2400,"value":1,"easing":"easeOut"}
]' })
\`\`\`

## Example 12: Bidirectional Flow — A ↔ B
\`\`\`
add_keyframes_batch({ keyframes: '[
  {"targetId":"A","property":"opacity","time":0,"value":0},
  {"targetId":"A","property":"opacity","time":500,"value":1,"easing":"easeOut"},
  {"targetId":"arrowAB","property":"opacity","time":0,"value":0},
  {"targetId":"arrowAB","property":"opacity","time":500,"value":1},
  {"targetId":"arrowAB","property":"drawProgress","time":500,"value":0},
  {"targetId":"arrowAB","property":"drawProgress","time":1500,"value":1,"easing":"easeInOut"},
  {"targetId":"B","property":"opacity","time":0,"value":0},
  {"targetId":"B","property":"opacity","time":1500,"value":0},
  {"targetId":"B","property":"opacity","time":2000,"value":1,"easing":"easeOut"},
  {"targetId":"arrowBA","property":"opacity","time":0,"value":0},
  {"targetId":"arrowBA","property":"opacity","time":2000,"value":1},
  {"targetId":"arrowBA","property":"drawProgress","time":2000,"value":0},
  {"targetId":"arrowBA","property":"drawProgress","time":3000,"value":1,"easing":"easeInOut"}
]' })
\`\`\`

## Example 13: Staggered Reveal via create_sequence
\`\`\`
create_sequence({ elementIds: ["title","box1","arrow1","box2","arrow2","box3"], property: "opacity", startTime: 0, delay: 400, duration: 600 })
\`\`\`
Result: title at 0ms, box1 at 400ms, arrow1 at 800ms, box2 at 1200ms, arrow2 at 1600ms, box3 at 2000ms.

## Example 14: Camera Pan
\`\`\`
set_camera_frame({ x: 300, y: 200, width: 800, aspectRatio: "16:9" })
add_camera_keyframe({ property: "translateX", time: 0, value: -200 })
add_camera_keyframe({ property: "translateX", time: 3000, value: 200, easing: "easeInOut" })
\`\`\`

## Example 15: Camera Zoom In
\`\`\`
add_camera_keyframe({ property: "scaleX", time: 0, value: 2 })
add_camera_keyframe({ property: "scaleY", time: 0, value: 2 })
add_camera_keyframe({ property: "scaleX", time: 2000, value: 1, easing: "easeInOutCubic" })
add_camera_keyframe({ property: "scaleY", time: 2000, value: 1, easing: "easeInOutCubic" })
\`\`\`

## Example 16: Clip Range + Save
\`\`\`
set_clip_range({ start: 0, end: 5000 })
save_checkpoint({ id: "my-animation" })
\`\`\`

---

# Tips

1. Always call create_scene first (or clear_scene to start fresh), then animate.
2. Use add_keyframes_batch for efficiency — one call for many keyframes.
3. Use create_sequence for simple staggered reveals.
4. Bound text inherits container animation — animating arrow opacity also hides its label.
5. drawProgress only works on arrows and lines.
6. easeOutBack gives a nice bounce for pop-in effects.
7. easeInOutCubic is the best general-purpose easing.
8. Set elements to opacity 0 at time 0 if they should appear later.
9. Set clip range before saving — it defines what gets exported.
10. Camera scale > 1 = zoomed out, < 1 = zoomed in.
11. Use delete_items to remove elements AND their animation tracks in one call.
12. Verify your work with animations_of_item, items_visible_in_camera, are_items_in_line, is_camera_centered.

## Example 17: Verify Animation
\`\`\`
animations_of_item({ targetId: "box1" })
// Returns:
//   opacity:
//     0ms 0% ↑ 100% 600ms (easeOut)

items_visible_in_camera({ time: 1000 })
// Returns: 5/8 items visible (62%) at 1000ms

are_items_in_line({ ids: ["box1","box2","box3"], axis: "horizontal" })
// Returns: ✅ Aligned (max deviation: 3px)

is_camera_centered({ axis: "both", time: 0 })
// Returns: ✅ Centered (offsets: dx=5 dy=2)
\`\`\`

## Example 18: Delete and Rebuild
\`\`\`
delete_items({ ids: ["old_box", "old_arrow"] })
// Removes elements + all their animation tracks

clear_scene()
// Nuclear option: removes everything
\`\`\`
`;
