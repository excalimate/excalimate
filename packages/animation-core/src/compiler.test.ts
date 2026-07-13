import { describe, expect, it } from 'vitest';
import type {
  AnimationAction,
  AnimationTimeline,
  AnimationTrack,
} from '@excalimate/project-schema';
import {
  compileManagedActions,
  createAnimationAction,
} from './compiler.js';
import { compileTimeline, computeCompiledFrame } from './runtime.js';

function timeline(tracks: AnimationTrack[] = []): AnimationTimeline {
  return {
    id: 'timeline',
    name: 'Test',
    duration: 10_000,
    fps: 60,
    tracks,
  };
}

function action(
  overrides: Partial<AnimationAction> = {},
): AnimationAction {
  return {
    id: 'action-1',
    type: 'fade',
    preset: 'fade',
    targetIds: ['element-1'],
    timing: {
      startMs: 100,
      durationMs: 500,
      staggerMs: 0,
      startMode: 'absolute',
    },
    easing: 'easeOut',
    parameters: {},
    ownership: [],
    generatedHash: 'empty',
    status: 'managed',
    ...overrides,
  };
}

describe('managed action compiler', () => {
  it('produces deterministic tracks, keyframes, ownership, and hashes', () => {
    const first = compileManagedActions(timeline(), [], [action()]);
    const second = compileManagedActions(timeline(), [], [action()]);

    expect(first).toEqual(second);
    expect(first.actions[0]?.ownership[0]?.trackId).toBe(
      first.timeline.tracks[0]?.id,
    );
    expect(first.actions[0]?.ownership[0]?.keyframeIds).toEqual(
      first.timeline.tracks[0]?.keyframes.map((keyframe) => keyframe.id),
    );
  });

  it.each([
    ['fade', 'opacity'],
    ['draw', 'drawProgress'],
    ['pop', 'scaleX'],
    ['sequence', 'opacity'],
    ['cameraMove', 'translateX'],
  ] as const)('compiles %s recipes', (type, expectedProperty) => {
    const parameters =
      type === 'sequence'
        ? { property: 'opacity' as const }
        : type === 'cameraMove'
          ? { x: 200 }
          : {};
    const compiled = compileManagedActions(
      timeline(),
      [],
      [
        action({
          type,
          targetIds:
            type === 'cameraMove' ? ['__camera_frame__'] : ['element-1'],
          parameters,
        }),
      ],
    );
    expect(
      compiled.timeline.tracks.some(
        (track) => track.property === expectedProperty,
      ),
    ).toBe(true);
  });

  it('holds canonical draw progress before, during, and after a managed draw', () => {
    const compiled = compileManagedActions(timeline(), [], [
      action({
        type: 'draw',
        targetIds: ['arrow'],
        timing: {
          startMs: 500,
          durationMs: 1_000,
          staggerMs: 0,
          startMode: 'absolute',
        },
        easing: 'linear',
      }),
    ]);
    const runtime = compileTimeline(compiled.timeline);

    expect(computeCompiledFrame(runtime, 0).get('arrow')?.drawProgress).toBe(0);
    expect(computeCompiledFrame(runtime, 1_000).get('arrow')?.drawProgress).toBe(
      0.5,
    );
    expect(computeCompiledFrame(runtime, 1_500).get('arrow')?.drawProgress).toBe(
      1,
    );
    expect(computeCompiledFrame(runtime, 8_000).get('arrow')?.drawProgress).toBe(
      1,
    );
  });

  it.each([
    ['left', 'translateX', -120],
    ['right', 'translateX', 120],
    ['up', 'translateY', -120],
    ['down', 'translateY', 120],
  ] as const)(
    'compiles slide-%s with the expected offset',
    (direction, property, offset) => {
      const compiled = compileManagedActions(
        timeline(),
        [],
        [
          action({
            type: 'slide',
            parameters: { direction, distance: 120 },
          }),
        ],
      );
      expect(compiled.timeline.tracks[0]).toMatchObject({
        property,
        keyframes: [{ value: offset }, { value: 0 }],
      });
    },
  );

  it('stagger-compiles multiple targets', () => {
    const compiled = compileManagedActions(
      timeline(),
      [],
      [
        action({
          type: 'sequence',
          targetIds: ['element-1', 'element-2', 'element-3'],
          timing: {
            startMs: 100,
            durationMs: 400,
            staggerMs: 250,
            startMode: 'absolute',
          },
          parameters: { property: 'drawProgress' },
        }),
      ],
    );
    expect(
      compiled.timeline.tracks.map((track) => track.keyframes[0]?.time),
    ).toEqual([100, 350, 600]);
  });

  it('compiles camera holds as constant values without synthesizing a move', () => {
    const compiled = compileManagedActions(
      timeline(),
      [],
      [
        action({
          type: 'cameraMove',
          targetIds: ['__camera_frame__'],
          parameters: {
            x: 120,
            y: -40,
            scale: 1.4,
            cameraMode: 'hold',
          },
        }),
      ],
    );

    expect(
      compiled.timeline.tracks.map((track) =>
        track.keyframes.map((keyframe) => keyframe.value),
      ),
    ).toEqual([
      [120, 120],
      [-40, -40],
      [1.4, 1.4],
      [1.4, 1.4],
    ]);
  });

  it('never removes unrelated target/property keyframes', () => {
    const customTrack: AnimationTrack = {
      id: 'custom-opacity',
      targetId: 'element-1',
      targetType: 'element',
      property: 'opacity',
      enabled: true,
      keyframes: [
        { id: 'custom-keyframe', time: 3000, value: 0.4, easing: 'linear' },
      ],
    };
    const first = compileManagedActions(timeline([customTrack]), [], [action()]);
    const retimed = action({
      ...first.actions[0],
      timing: {
        ...first.actions[0]!.timing,
        startMs: 1000,
      },
    });
    const second = compileManagedActions(
      first.timeline,
      first.actions,
      [retimed],
    );

    expect(second.timeline.tracks.find((track) => track.id === customTrack.id))
      .toEqual(customTrack);
    expect(second.timeline.tracks).toHaveLength(2);
    expect(second.timeline.tracks[1]?.keyframes[0]?.time).toBe(1000);
  });

  it('does not regenerate customized actions during reorder', () => {
    const generated = compileManagedActions(timeline(), [], [action()]);
    const customizedAction = {
      ...generated.actions[0]!,
      status: 'customized' as const,
    };
    const customizedTimeline: AnimationTimeline = {
      ...generated.timeline,
      tracks: generated.timeline.tracks.map((track) => ({
        ...track,
        keyframes: track.keyframes.map((keyframe) => ({
          ...keyframe,
          value: 0.25,
        })),
      })),
    };
    const reordered = compileManagedActions(
      customizedTimeline,
      [customizedAction],
      [customizedAction],
    );
    expect(reordered.timeline).toEqual(customizedTimeline);
  });

  it('plays sequential managed actions for the same target property', () => {
    const first = action({
      id: 'action-1',
      timing: {
        startMs: 0,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute',
      },
    });

    const second = action({
      id: 'action-2',
      timing: {
        startMs: 100,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'afterPrevious',
      },
    });
    const result = compileManagedActions(timeline(), [], [first, second]);
    const compiled = compileTimeline(result.timeline);

    expect(computeCompiledFrame(compiled, 550).get('element-1')?.opacity).toBe(1);
    expect(computeCompiledFrame(compiled, 600).get('element-1')?.opacity).toBe(0);
    expect(
      computeCompiledFrame(compiled, 850).get('element-1')?.opacity,
    ).toBeGreaterThan(0.5);
  });

  it('chains camera moves from the rendered camera state without snapping', () => {
    const hold = action({
      id: 'camera-hold',
      type: 'cameraMove',
      targetIds: ['__camera_frame__'],
      timing: {
        startMs: 0,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute',
      },
      parameters: { x: 50, cameraMode: 'hold' },
    });
    const move = action({
      id: 'camera-move',
      type: 'cameraMove',
      targetIds: ['__camera_frame__'],
      timing: {
        startMs: 100,
        durationMs: 400,
        staggerMs: 0,
        startMode: 'afterPrevious',
      },
      parameters: { x: 200, fromX: 50, cameraMode: 'move' },
    });
    const result = compileManagedActions(timeline(), [], [hold, move]);
    const compiled = compileTimeline(result.timeline);

    expect(
      computeCompiledFrame(compiled, 599).get('__camera_frame__')?.translateX,
    ).toBe(50);
    expect(
      computeCompiledFrame(compiled, 600).get('__camera_frame__')?.translateX,
    ).toBe(50);
    expect(
      computeCompiledFrame(compiled, 800).get('__camera_frame__')?.translateX,
    ).toBeGreaterThan(50);
  });

  it('creates stable action IDs for equal drafts', () => {
    const draft = {
      type: 'draw' as const,
      targetIds: ['element-1'],
      timing: {
        startMs: 0,
        durationMs: 500,
        staggerMs: 0,
        startMode: 'absolute' as const,
      },
    };
    expect(createAnimationAction(draft)).toEqual(createAnimationAction(draft));
  });
});
