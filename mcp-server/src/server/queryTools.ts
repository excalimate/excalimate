/* eslint-disable @typescript-eslint/no-explicit-any */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { StateContext } from './stateContext.js';

interface Geometry {
  getElementBounds: (el: any) => { minX: number; minY: number; maxX: number; maxY: number };
  getAnimatedBoundsAt: (
    state: any,
    elId: string,
    time: number,
  ) => { minX: number; minY: number; maxX: number; maxY: number } | null;
  getCameraRectAt: (
    state: any,
    time: number,
  ) => { left: number; top: number; right: number; bottom: number; cx: number; cy: number };
  interpolateTrackAt: (track: any, time: number) => number;
}

export function registerQueryTools(
  server: McpServer,
  ctx: StateContext,
  geometry: Geometry,
): void {
  server.tool(
    'are_items_in_line',
    'Check if the given items are aligned horizontally or vertically (within a tolerance).',
    {
      ids: z.array(z.string()).describe('Element IDs to check'),
      axis: z.enum(['horizontal', 'vertical']).describe('Alignment axis'),
      tolerance: z.number().optional().describe('Max deviation in scene units (default 10)'),
    },
    async ({ ids, axis, tolerance = 10 }) => {
      const state = ctx.getState();
      const centers: { id: string; cx: number; cy: number }[] = [];
      for (const id of ids) {
        const el = state.scene.elements.find((e: any) => e.id === id);
        if (!el) return { content: [{ type: 'text', text: `Element "${id}" not found.` }] };
        const b = geometry.getElementBounds(el);
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
      const state = ctx.getState();
      let sMinX = Infinity; let sMinY = Infinity; let sMaxX = -Infinity; let sMaxY = -Infinity;
      for (const el of state.scene.elements) {
        const b = geometry.getElementBounds(el);
        if (b.minX < sMinX) sMinX = b.minX; if (b.minY < sMinY) sMinY = b.minY;
        if (b.maxX > sMaxX) sMaxX = b.maxX; if (b.maxY > sMaxY) sMaxY = b.maxY;
      }
      const sceneCX = (sMinX + sMaxX) / 2;
      const sceneCY = (sMinY + sMaxY) / 2;
      const cam = geometry.getCameraRectAt(state, time);
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
      const state = ctx.getState();
      const cam = geometry.getCameraRectAt(state, time);
      const elements = state.scene.elements.filter((e: any) => !e.isDeleted && e.id !== '__camera_frame__');
      let visible = 0;
      const details: string[] = [];
      for (const el of elements) {
        const b = geometry.getAnimatedBoundsAt(state, el.id, time);
        if (!b) continue;
        const opTrack = state.timeline.tracks.find((t: any) => t.targetId === el.id && t.property === 'opacity');
        const opacity = opTrack ? geometry.interpolateTrackAt(opTrack, time) : 1;
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
      const state = ctx.getState();
      const tracks = state.timeline.tracks.filter((t: any) => t.targetId === targetId);
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
}
