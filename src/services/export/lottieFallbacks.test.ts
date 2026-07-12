import { describe, expect, it } from 'vitest';
import type { AnimationTimeline } from '@excalimate/project-schema';
import { getLottieFallbackIssues } from './lottieFallbacks';

const timeline: AnimationTimeline = {
  id: 'timeline',
  name: 'Fallback test',
  duration: 1_000,
  fps: 60,
  tracks: [
    {
      id: 'draw',
      targetId: 'freehand',
      targetType: 'element',
      property: 'drawProgress',
      enabled: true,
      keyframes: [
        { id: 'start', time: 0, value: 0, easing: 'linear' },
        { id: 'end', time: 1_000, value: 1, easing: 'linear' },
      ],
    },
  ],
};

describe('Lottie fallback reporting', () => {
  it('warns instead of silently omitting raster-only elements and draw progress', () => {
    expect(
      getLottieFallbackIssues(
        'lottie',
        [
          { id: 'freehand', type: 'freedraw', width: 100, height: 100 },
          { id: 'shape', type: 'rectangle', width: 100, height: 100 },
        ],
        timeline,
      ),
    ).toEqual([
      expect.objectContaining({ code: 'lottie-raster-fallback' }),
      expect.objectContaining({ code: 'lottie-raster-draw-fallback' }),
    ]);
  });

  it('does not report Lottie-specific fallbacks for raster and SVG exports', () => {
    expect(
      getLottieFallbackIssues(
        'gif',
        [{ id: 'freehand', type: 'freedraw', width: 100, height: 100 }],
        timeline,
      ),
    ).toEqual([]);
  });

  it('rejects raster fallback canvases above the per-asset budget', () => {
    const issues = getLottieFallbackIssues(
      'lottie',
      [{ id: 'image', type: 'image', width: 5_000, height: 5_000 }],
      timeline,
    );
    expect(issues).toContainEqual(
      expect.objectContaining({
        code: 'lottie-raster-budget-exceeded',
        severity: 'error',
      }),
    );
  });
});
