import { describe, expect, it } from 'vitest';
import {
  createFrameSampler,
} from '@excalimate/export-runtime';
import {
  EASING_TYPES,
  type AnimatableProperty,
  type AnimationTimeline,
} from '@excalimate/project-schema';
import { AnimationEngine } from '../../core/engine/AnimationEngine';

const properties: readonly AnimatableProperty[] = [
  'opacity',
  'translateX',
  'translateY',
  'scaleX',
  'scaleY',
  'rotation',
  'drawProgress',
];

describe('cross-surface frame contract', () => {
  it('keeps editor and export sampling identical for every easing/property pair', () => {
    for (const easing of EASING_TYPES) {
      for (const property of properties) {
        const timeline: AnimationTimeline = {
          id: `${easing}-${property}`,
          name: 'Cross-surface golden',
          duration: 1000,
          fps: 60,
          tracks: [
            {
              id: 'track',
              targetId: 'element',
              targetType: 'element',
              property,
              enabled: true,
              keyframes: [
                { id: 'start', time: 0, value: 0, easing },
                { id: 'end', time: 1000, value: 1, easing: 'linear' },
              ],
            },
          ],
        };
        const editor = new AnimationEngine().computeFrame(
          timeline,
          437.5,
        );
        const exported = createFrameSampler({
          timeline,
          clipStart: 0,
          clipEnd: 1000,
          fps: 24,
        }).sampleAt(437.5);
        expect(exported.get('element')?.[property]).toBeCloseTo(
          editor.get('element')?.[property] ?? Number.NaN,
          10,
        );
      }
    }
  });

  it('keeps group, disabled-track, and clip semantics identical', () => {
    const timeline: AnimationTimeline = {
      id: 'groups',
      name: 'Groups',
      duration: 10_000,
      fps: 60,
      tracks: [
        {
          id: 'group',
          targetId: 'group',
          targetType: 'group',
          property: 'translateX',
          enabled: true,
          keyframes: [
            { id: 'g0', time: 0, value: 0, easing: 'linear' },
            { id: 'g1', time: 10_000, value: 100, easing: 'linear' },
          ],
        },
        {
          id: 'disabled',
          targetId: 'element',
          targetType: 'element',
          property: 'opacity',
          enabled: false,
          keyframes: [
            { id: 'd0', time: 0, value: 0, easing: 'linear' },
          ],
        },
      ],
    };
    const hierarchy = { group: ['element'] };
    const editor = new AnimationEngine().computeFrame(
      timeline,
      5000,
      hierarchy,
    );
    const exported = createFrameSampler({
      timeline,
      hierarchy,
      clipStart: 2000,
      clipEnd: 8000,
      fps: 30,
    }).sampleAt(5000);
    expect(exported).toEqual(editor);
    expect(exported.get('element')?.opacity).toBe(1);
  });
});
