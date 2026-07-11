import { describe, expect, it } from 'vitest';
import type {
  AnimationAction,
  AnimationTrack,
  CameraFrame,
} from '@excalimate/project-schema';
import type { AnimatableTarget } from '../../types/excalidraw';
import {
  SEQUENCE_VIRTUALIZATION_THRESHOLD,
  buildSequenceRows,
  calculateCameraFit,
  formatFriendlyDuration,
  getFriendlySpeed,
  getVirtualActionWindow,
  moveActionId,
  moveActionIdToIndex,
  resolveActionTimings,
  shouldPreviewAction,
} from './sequenceModel';

function action(
  id: string,
  startMode: AnimationAction['timing']['startMode'],
  startMs: number,
): AnimationAction {
  return {
    id,
    type: 'fade',
    preset: 'fade',
    targetIds: ['element-1'],
    timing: { startMs, durationMs: 500, staggerMs: 0, startMode },
    easing: 'easeOut',
    parameters: {},
    ownership: [],
    generatedHash: 'empty',
    status: 'managed',
  };
}

const target: AnimatableTarget = {
  id: 'element-1',
  type: 'element',
  label: 'Title',
  elementIds: ['element-1'],
  originalBounds: {
    x: 100,
    y: 200,
    width: 300,
    height: 100,
    centerX: 250,
    centerY: 250,
  },
  originalAngle: 0,
  zIndex: 0,
};

describe('sequence action model', () => {
  it('resolves after, with, and absolute timing without a second timing source', () => {
    const resolved = resolveActionTimings([
      action('a', 'absolute', 100),
      action('b', 'withPrevious', 50),
      action('c', 'afterPrevious', 25),
      action('d', 'absolute', 2000),
    ]);

    expect(resolved).toEqual([
      { actionId: 'a', startMs: 100, endMs: 600, group: 0 },
      { actionId: 'b', startMs: 150, endMs: 650, group: 0 },
      { actionId: 'c', startMs: 675, endMs: 1175, group: 1 },
      { actionId: 'd', startMs: 2000, endMs: 2500, group: 2 },
    ]);
  });

  it('builds managed, customized, invalid, and unmanaged rows without hiding data', () => {
    const managed = {
      ...action('managed', 'absolute', 0),
      ownership: [
        {
          trackId: 'owned',
          targetId: 'element-1',
          property: 'opacity' as const,
          keyframeIds: ['owned-kf'],
          startMs: 0,
          endMs: 500,
        },
      ],
    };
    const invalid = {
      ...action('invalid', 'afterPrevious', 0),
      status: 'customized' as const,
      targetIds: ['missing'],
    };
    const tracks: AnimationTrack[] = [
      {
        id: 'owned',
        targetId: 'element-1',
        targetType: 'element',
        property: 'opacity',
        enabled: true,
        keyframes: [
          { id: 'owned-kf', time: 0, value: 0, easing: 'linear' },
        ],
      },
      {
        id: 'custom',
        targetId: 'element-1',
        targetType: 'element',
        property: 'rotation',
        enabled: true,
        keyframes: [
          { id: 'custom-kf', time: 900, value: 1, easing: 'linear' },
        ],
      },
    ];

    const rows = buildSequenceRows([managed, invalid], tracks, [target]);

    expect(rows.map((row) => [row.kind, row.id])).toEqual([
      ['action', 'managed'],
      ['action', 'invalid'],
      ['custom', 'track:custom'],
    ]);
    expect(rows[1]?.invalidTargetIds).toEqual(['missing']);
    expect(rows[2]).toMatchObject({
      kind: 'custom',
      targetSummary: 'Title',
      startMs: 900,
      endMs: 900,
    });
  });

  it('shows customized action timing from canonical owned keyframes', () => {
    const customized = {
      ...action('customized', 'absolute', 100),
      status: 'customized' as const,
      ownership: [
        {
          trackId: 'customized-track',
          targetId: 'element-1',
          property: 'opacity' as const,
          keyframeIds: ['customized-start', 'customized-end'],
          startMs: 100,
          endMs: 600,
        },
      ],
    };
    const rows = buildSequenceRows(
      [customized],
      [
        {
          id: 'customized-track',
          targetId: 'element-1',
          targetType: 'element',
          property: 'opacity',
          enabled: true,
          keyframes: [
            {
              id: 'customized-start',
              time: 350,
              value: 0.2,
              easing: 'easeIn',
            },
            {
              id: 'customized-end',
              time: 1_100,
              value: 1,
              easing: 'easeOut',
            },
          ],
        },
      ],
      [target],
    );

    expect(rows[0]).toMatchObject({
      kind: 'action',
      resolved: { startMs: 350, endMs: 1_100 },
      canonicalEasing: ['easeIn', 'easeOut'],
      hasCanonicalTiming: true,
    });
  });

  it('maps friendly speeds while retaining exact custom values', () => {
    expect(getFriendlySpeed(300)).toBe('fast');
    expect(getFriendlySpeed(650)).toBe('custom');
    expect(formatFriendlyDuration(500)).toBe('Normal (500 ms)');
    expect(formatFriendlyDuration(650)).toBe('Custom (650 ms)');
  });

  it('uses the same order transform for drag destinations and keyboard moves', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(moveActionId(ids, 'c', 'up')).toEqual(
      moveActionIdToIndex(ids, 'c', 1),
    );
    expect(moveActionId(ids, 'c', 'top')).toEqual(['c', 'a', 'b', 'd']);
    expect(moveActionId(ids, 'b', 'bottom')).toEqual(['a', 'c', 'd', 'b']);
  });

  it('virtualizes only beyond the measured action-list threshold', () => {
    expect(
      getVirtualActionWindow(
        SEQUENCE_VIRTUALIZATION_THRESHOLD,
        0,
        600,
      ).virtualized,
    ).toBe(false);
    const window = getVirtualActionWindow(
      SEQUENCE_VIRTUALIZATION_THRESHOLD + 1,
      2000,
      600,
    );
    expect(window.virtualized).toBe(true);
    expect(window.start).toBeGreaterThan(0);
    expect(window.end).toBeLessThanOrEqual(
      SEQUENCE_VIRTUALIZATION_THRESHOLD + 1,
    );
  });

  it('suppresses hover and focus previews for reduced motion', () => {
    expect(shouldPreviewAction(true, 'hover')).toBe(false);
    expect(shouldPreviewAction(true, 'focus')).toBe(false);
    expect(shouldPreviewAction(true, 'explicit')).toBe(true);
    expect(shouldPreviewAction(false, 'hover')).toBe(true);
  });

  it('calculates camera fit values from selection bounds', () => {
    const frame: CameraFrame = {
      aspectRatio: '16:9',
      width: 1280,
      x: 640,
      y: 360,
    };
    expect(calculateCameraFit([target], frame, 0)).toEqual({
      x: -390,
      y: -110,
      scale: 300 / 1280,
    });
  });
});
