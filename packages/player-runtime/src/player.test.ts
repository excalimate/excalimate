import { describe, expect, it, vi } from 'vitest';
import { compileTimeline, computeCompiledFrame } from '@excalimate/animation-core';
import type { FrameState } from '@excalimate/animation-core';
import { createTestPlayerPackage } from './package.test.js';
import { CompiledTimelineAdapter, PlayerRuntime } from './player.js';
import { SvgSceneAdapter } from './svgAdapter.js';
import { createCrossSurfaceParityPackage } from '../../../src/test-fixtures/crossSurfaceParity.js';
import type { PlayerSceneAdapter, PlayerTimingDriver } from './types.js';

class TestTiming implements PlayerTimingDriver {
  current = 0;
  callback: ((timestamp: number) => void) | null = null;

  now(): number {
    return this.current;
  }

  request(callback: (timestamp: number) => void): number {
    this.callback = callback;
    return 1;
  }

  cancel(): void {
    this.callback = null;
  }

  advance(milliseconds: number): void {
    this.current += milliseconds;
    const callback = this.callback;
    this.callback = null;
    callback?.(this.current);
  }
}

function testScene(): PlayerSceneAdapter & {
  frames: FrameState[];
  destroyed: boolean;
} {
  return {
    frames: [],
    destroyed: false,
    applyFrame(frame) {
      this.frames.push(frame);
    },
    destroy() {
      this.destroyed = true;
    },
  };
}

describe('headless player runtime', () => {
  it('matches the cross-surface golden fixture at keyframes and midpoint', () => {
    const playerPackage = createCrossSurfaceParityPackage();
    const timeline = new CompiledTimelineAdapter(playerPackage);
    const container = document.createElement('div');
    const pathLength = vi
      .spyOn(SVGGeometryElement.prototype, 'getTotalLength')
      .mockReturnValue(100);
    const scene = new SvgSceneAdapter(container, playerPackage);

    const expected = [
      {
        time: 0,
        removed: 1,
        returning: 0,
        zeroOpacity: 0,
        groupedX: 0,
        drawOffset: '100',
        cameraViewBox: '0 1.875 100 56.25',
      },
      {
        time: 500,
        removed: 0.5,
        returning: 0.5,
        zeroOpacity: 0.5,
        groupedX: 10,
        drawOffset: '50',
        cameraViewBox: '-2.5 1.875 125 56.25',
      },
      {
        time: 1_000,
        removed: 0,
        returning: 1,
        zeroOpacity: 1,
        groupedX: 20,
        drawOffset: '',
        cameraViewBox: '-5 1.875 150 56.25',
      },
    ];

    for (const golden of expected) {
      const frame = timeline.frameAt(golden.time);
      scene.applyFrame(frame);
      const target = (id: string) =>
        scene.svg.querySelector<SVGGraphicsElement>(`[data-excalimate-id="${id}"]`);

      expect(frame.get('removed')?.opacity).toBe(golden.removed);
      expect(target('removed')?.style.opacity).toBe(String(golden.removed));
      expect(target('returning')?.style.opacity).toBe(String(golden.returning));
      expect(target('zero-opacity')?.style.opacity).toBe(String(golden.zeroOpacity));
      expect(target('grouped')?.getAttribute('transform')).toBe(
        `matrix(1 0 0 1 ${golden.groupedX} 0)`,
      );
      expect(target('label')?.getAttribute('transform')).toBe(
        `matrix(1 0 0 1 ${golden.groupedX} 0)`,
      );
      expect(target('grouped')?.querySelector('path')?.style.strokeDashoffset).toBe(
        golden.drawOffset,
      );
      expect(scene.svg.getAttribute('viewBox')).toBe(golden.cameraViewBox);
    }

    pathLength.mockRestore();
    scene.destroy();
  });

  it('keeps serialized arrow endpoints attached to independently moving shapes', () => {
    const playerPackage = createTestPlayerPackage();
    playerPackage.scene.svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <g data-excalimate-id="arrow"
           data-excalimate-origin="0 0"
           data-excalimate-center="5 0"
           data-excalimate-start-bound-to="start"
           data-excalimate-end-bound-to="end"
           data-excalimate-binding-points="0 0 10 0">
          <path d="M0 0 L10 0"/>
        </g>
        <g data-excalimate-id="start"><rect width="1" height="1"/></g>
        <g data-excalimate-id="end"><rect width="1" height="1"/></g>
      </svg>
    `;
    const scene = new SvgSceneAdapter(document.createElement('div'), playerPackage);
    const frame: FrameState = new Map([
      [
        'start',
        {
          targetId: 'start',
          opacity: 1,
          translateX: 5,
          translateY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          drawProgress: 1,
        },
      ],
      [
        'end',
        {
          targetId: 'end',
          opacity: 1,
          translateX: 15,
          translateY: 0,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
          drawProgress: 1,
        },
      ],
    ]);

    scene.applyFrame(frame);

    expect(scene.svg.querySelector('[data-excalimate-id="arrow"]')?.getAttribute('transform')).toBe(
      'matrix(2 0 0 1 5 0)',
    );
  });

  it('draws bound arrows without changing shaft, arrowhead, or binding metadata', () => {
    const playerPackage = createTestPlayerPackage();
    playerPackage.scene.svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50">
        <g data-excalimate-id="arrow"
           data-excalimate-start-bound-to="start"
           data-excalimate-end-bound-to="end"
           data-excalimate-binding-points="0 0 100 0">
          <path data-part="shaft" d="M0 0 L100 0"/>
          <path data-part="head" d="M90 -5 L100 0 L90 5"/>
        </g>
      </svg>
    `;
    const pathLength = vi
      .spyOn(SVGGeometryElement.prototype, 'getTotalLength')
      .mockReturnValue(100);
    const scene = new SvgSceneAdapter(document.createElement('div'), playerPackage);
    const group = scene.svg.querySelector<SVGGElement>('[data-excalimate-id="arrow"]')!;
    const [path, head] = group.querySelectorAll<SVGPathElement>('path');
    const state = (drawProgress: number): FrameState =>
      new Map([
        [
          'arrow',
          {
            targetId: 'arrow',
            opacity: 1,
            translateX: 0,
            translateY: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            drawProgress,
          },
        ],
      ]);

    scene.applyFrame(state(0));
    expect(path?.style.strokeDashoffset).toBe('100');
    scene.applyFrame(state(0.5));
    expect(path?.style.strokeDashoffset).toBe('50');
    scene.applyFrame(state(1));
    expect(path?.style.strokeDashoffset).toBe('');
    expect(path?.getAttribute('d')).toBe('M0 0 L100 0');
    expect(head?.getAttribute('d')).toBe('M90 -5 L100 0 L90 5');
    expect(group.getAttribute('data-excalimate-start-bound-to')).toBe('start');
    expect(group.getAttribute('data-excalimate-end-bound-to')).toBe('end');
    expect(group.getAttribute('data-excalimate-binding-points')).toBe('0 0 100 0');

    pathLength.mockRestore();
  });

  it('matches animation-core frames at absolute clip time', () => {
    const playerPackage = createTestPlayerPackage();
    const adapter = new CompiledTimelineAdapter(playerPackage);
    const expected = computeCompiledFrame(compileTimeline(playerPackage.animation.timeline), 600);

    expect(adapter.frameAt(600).get('element')).toEqual(expected.get('element'));
  });

  it('supports deterministic seek, play, pause, rate, and clip end', () => {
    const playerPackage = createTestPlayerPackage();
    const scene = testScene();
    const timing = new TestTiming();
    const player = new PlayerRuntime(playerPackage, {
      sceneAdapter: scene,
      timing,
    });

    player.seek(500);
    expect(scene.frames.at(-1)?.get('element')?.opacity).toBeCloseTo(0.5);
    player.setRate(2);
    player.play();
    timing.advance(100);
    expect(player.getState().currentTimeMs).toBe(700);
    player.pause();
    expect(player.getState().playing).toBe(false);
    player.seek(10_000);
    expect(player.getState()).toMatchObject({
      currentTimeMs: 1_000,
      ended: true,
      playing: false,
    });

    player.play();
    expect(player.getState().currentTimeMs).toBe(0);
  });

  it('rebases elapsed time when seeking or changing rate during playback', () => {
    const timing = new TestTiming();
    const player = new PlayerRuntime(createTestPlayerPackage(), {
      sceneAdapter: testScene(),
      timing,
    });

    player.play();
    timing.current = 5_000;
    player.seek(200);
    timing.advance(100);
    expect(player.getState().currentTimeMs).toBe(300);

    timing.current = 10_000;
    player.setRate(2);
    timing.advance(100);
    expect(player.getState().currentTimeMs).toBe(500);
  });

  it('scales targets from their Excalidraw origin and moves bound labels', () => {
    const playerPackage = createTestPlayerPackage();
    playerPackage.scene.svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><g data-excalimate-scene="true"><g data-excalimate-id="element" data-excalimate-origin="10 10" data-excalimate-center="15 15"><rect width="10" height="10"/></g><g data-excalimate-id="label" data-excalimate-origin="20 10" data-excalimate-center="25 15" data-excalimate-bound-to="element"><text>Label</text></g></g></svg>';
    playerPackage.animation.timeline.tracks.push(
      {
        id: 'translate',
        targetId: 'element',
        targetType: 'element',
        property: 'translateX',
        enabled: true,
        keyframes: [
          { id: 'translate-start', time: 100, value: 0, easing: 'linear' },
          { id: 'translate-end', time: 1_100, value: 20, easing: 'linear' },
        ],
      },
      {
        id: 'scale',
        targetId: 'element',
        targetType: 'element',
        property: 'scaleX',
        enabled: true,
        keyframes: [
          { id: 'scale-start', time: 100, value: 1, easing: 'linear' },
          { id: 'scale-end', time: 1_100, value: 2, easing: 'linear' },
        ],
      },
    );
    const container = document.createElement('div');
    const scene = new SvgSceneAdapter(container, playerPackage);
    const player = new PlayerRuntime(playerPackage, {
      sceneAdapter: scene,
      timing: new TestTiming(),
    });

    player.seek(500);

    expect(
      scene.svg.querySelector('[data-excalimate-id="element"]')?.getAttribute('transform'),
    ).toBe('matrix(1.5 0 0 1 5 0)');
    expect(scene.svg.querySelector('[data-excalimate-id="label"]')?.getAttribute('transform')).toBe(
      'matrix(1.5 0 0 1 0 0)',
    );
  });

  it('applies camera movement and tears down mounted SVG state', () => {
    const playerPackage = createTestPlayerPackage();
    playerPackage.animation.timeline.tracks.push({
      id: 'camera-x',
      targetId: '__camera_frame__',
      targetType: 'element',
      property: 'translateX',
      enabled: true,
      keyframes: [
        { id: 'camera-start', time: 100, value: 0, easing: 'linear' },
        { id: 'camera-end', time: 1_100, value: 20, easing: 'linear' },
      ],
    });
    const container = document.createElement('div');
    const scene = new SvgSceneAdapter(container, playerPackage);
    const player = new PlayerRuntime(playerPackage, {
      sceneAdapter: scene,
      timing: new TestTiming(),
    });

    player.seek(500);
    expect(scene.svg.getAttribute('viewBox')).toBe('10 -3.125 100 56.25');
    expect(container.querySelector('svg')).toBe(scene.svg);
    player.destroy();
    expect(container.children).toHaveLength(0);
    expect(() => player.play()).toThrow('destroyed');
  });

  it('cancels timing and notifies teardown once', () => {
    const scene = testScene();
    scene.destroy = vi.fn(scene.destroy);
    const timing = new TestTiming();
    const player = new PlayerRuntime(createTestPlayerPackage(), {
      sceneAdapter: scene,
      timing,
    });
    player.play();
    player.destroy();
    player.destroy();

    expect(timing.callback).toBeNull();
    expect(scene.destroy).toHaveBeenCalledTimes(1);
  });
});
