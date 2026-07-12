import { describe, expect, it } from 'vitest';
import type { PlayerPackageV1 } from '@excalimate/player-runtime';
import { compileAnimatedSvg, estimateLegacySampledSvgKeyframes } from './animatedSvg.js';
import { createCrossSurfaceParityPackage } from '../../../src/test-fixtures/crossSurfaceParity.js';

function playerPackage(): PlayerPackageV1 {
  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60" onload="alert(1)">',
        '<script>alert(1)</script><foreignObject><div>unsafe</div></foreignObject>',
        '<image href="https://example.com/tracker.png"/>',
        '<g data-excalimate-scene="true">',
        '<g data-excalimate-id="element" data-excalimate-origin="10 10" data-excalimate-center="20 20">',
        '<path d="M0 0 L20 20" stroke="black"/>',
        '</g>',
        '<g data-excalimate-id="label" data-excalimate-origin="12 12" data-excalimate-center="18 18" data-excalimate-bound-to="element">',
        '<text>Label</text></g></g></svg>',
      ].join(''),
    },
    animation: {
      timeline: {
        id: 'timeline',
        name: 'SVG contract',
        duration: 10_000,
        fps: 60,
        tracks: [
          {
            id: 'group-x',
            targetId: 'group',
            targetType: 'group',
            property: 'translateX',
            enabled: true,
            keyframes: [
              { id: 'gx0', time: 0, value: 0, easing: 'easeIn' },
              { id: 'gx1', time: 10_000, value: 100, easing: 'linear' },
            ],
          },
          {
            id: 'opacity',
            targetId: 'element',
            targetType: 'element',
            property: 'opacity',
            enabled: true,
            keyframes: [
              { id: 'o0', time: 0, value: 0, easing: 'linear' },
              { id: 'o1', time: 10_000, value: 1, easing: 'linear' },
            ],
          },
          {
            id: 'draw',
            targetId: 'element',
            targetType: 'element',
            property: 'drawProgress',
            enabled: true,
            keyframes: [
              { id: 'd0', time: 0, value: 0, easing: 'linear' },
              { id: 'd1', time: 10_000, value: 1, easing: 'linear' },
            ],
          },
          {
            id: 'camera',
            targetId: '__camera_frame__',
            targetType: 'element',
            property: 'scaleX',
            enabled: true,
            keyframes: [
              { id: 'c0', time: 0, value: 1, easing: 'linear' },
              { id: 'c1', time: 10_000, value: 1.5, easing: 'linear' },
            ],
          },
        ],
      },
      hierarchy: { group: ['element'] },
    },
    playback: {
      clipStart: 0,
      clipEnd: 10_000,
      camera: {
        aspectRatio: '16:9',
        width: 100,
        height: 56.25,
        x: 50,
        y: 30,
        sceneOffsetX: 0,
        sceneOffsetY: 0,
      },
    },
    dimensions: { width: 1920, height: 1080, aspectRatio: '16:9' },
    poster: { kind: 'frame', timeMs: 0 },
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  };
}

describe('compact animated SVG compiler', () => {
  it('preserves the shared parity fixture and reduced-motion poster', () => {
    const result = compileAnimatedSvg(createCrossSurfaceParityPackage(), {
      profile: 'css-keyframes',
    });
    const document = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
    const style = document.querySelector('style')?.textContent ?? '';
    const target = (id: string) => document.querySelector(`[data-excalimate-id="${id}"]`);

    expect(target('removed')?.getAttribute('opacity')).toBe('1');
    expect(target('returning')?.getAttribute('opacity')).toBe('0');
    expect(target('zero-opacity')?.getAttribute('opacity')).toBe('0');
    expect(target('grouped')?.getAttribute('transform')).toBe('matrix(1 0 0 1 0 0)');
    expect(target('label')?.getAttribute('transform')).toBe('matrix(1 0 0 1 0 0)');
    expect(style).toContain('0%{opacity:0;animation-timing-function:linear;}100%{opacity:1;}');
    expect(style).toContain(
      '0%{transform:matrix(1 0 0 1 0 0);animation-timing-function:linear;}100%{transform:matrix(1 0 0 1 20 0);}',
    );
    expect(style).toContain(
      '0%{stroke-dashoffset:1;animation-timing-function:linear;}100%{stroke-dashoffset:0;}',
    );
    expect(style).toContain('@keyframes xmt-camera');
    expect(style).toContain('@media (prefers-reduced-motion:reduce)');
  });

  it('emits source-keyframe CSS with poster fallback, groups, labels, draw, and camera', () => {
    const fixture = playerPackage();
    const result = compileAnimatedSvg(fixture, {
      profile: 'css-keyframes',
    });
    const document = new DOMParser().parseFromString(result.svg, 'image/svg+xml');
    const style = document.querySelector('style')?.textContent ?? '';
    const targets = document.querySelectorAll('[data-excalimate-id]');

    expect(result.adaptiveSampleCount).toBeGreaterThan(0);
    expect(result.emittedKeyframeCount).toBeLessThan(
      estimateLegacySampledSvgKeyframes(fixture, 60),
    );
    expect(result.svg.length).toBeLessThan(estimateLegacySampledSvgKeyframes(fixture, 60) * 100);
    expect(style).not.toContain('cubic-bezier(');
    expect(style).toContain('animation-timing-function:linear');
    expect(style).toContain('@keyframes xmt-camera');
    expect(style).toContain('stroke-dashoffset');
    expect(style).toContain('@media (prefers-reduced-motion:reduce)');
    expect(style).toContain('animation:none!important');
    expect(targets).toHaveLength(2);
    expect(targets[0]?.getAttribute('transform')).toContain('matrix(');
    expect(targets[1]?.getAttribute('transform')).toContain('matrix(');
  });

  it('moves independently bound arrow endpoints with their targets', () => {
    const fixture = playerPackage();
    fixture.scene.svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 60">',
      '<g data-excalimate-scene="true">',
      '<g data-excalimate-id="start" data-excalimate-origin="0 0" data-excalimate-center="5 5"><rect width="10" height="10"/></g>',
      '<g data-excalimate-id="end" data-excalimate-origin="20 0" data-excalimate-center="25 5"><rect width="10" height="10"/></g>',
      '<g data-excalimate-id="arrow" data-excalimate-origin="0 0" data-excalimate-center="5 0" data-excalimate-start-bound-to="start" data-excalimate-end-bound-to="end" data-excalimate-binding-points="0 0 10 0"><path d="M0 0 L10 0"/></g>',
      '</g></svg>',
    ].join('');
    fixture.animation.timeline.tracks = [
      {
        id: 'start-x',
        targetId: 'start',
        targetType: 'element',
        property: 'translateX',
        enabled: true,
        keyframes: [
          { id: 's0', time: 0, value: 0, easing: 'linear' },
          { id: 's1', time: 10_000, value: 10, easing: 'linear' },
        ],
      },
      {
        id: 'end-x',
        targetId: 'end',
        targetType: 'element',
        property: 'translateX',
        enabled: true,
        keyframes: [
          { id: 'e0', time: 0, value: 0, easing: 'linear' },
          { id: 'e1', time: 10_000, value: 20, easing: 'linear' },
        ],
      },
    ];
    fixture.animation.hierarchy = {};

    const result = compileAnimatedSvg(fixture);
    const style =
      new DOMParser()
        .parseFromString(result.svg, 'image/svg+xml')
        .querySelector('style')?.textContent ?? '';

    expect(style).toContain('100%{transform:matrix(2 0 0 1 10 0);}');
  });

  it('uses bounded adaptive samples for non-representable curves', () => {
    const fixture = playerPackage();
    fixture.animation.timeline.tracks[1]!.keyframes[0]!.easing = 'easeOutElastic';
    const result = compileAnimatedSvg(fixture, {
      maxAdaptiveSamplesPerSegment: 12,
      adaptiveTolerance: 0.001,
    });

    expect(result.adaptiveSampleCount).toBeGreaterThan(0);
    expect(result.adaptiveSampleCount).toBeLessThanOrEqual(20);
    expect(result.svg).not.toContain('easeOutElastic');
  });

  it.each([
    'easeInOutQuad',
    'easeInOutCubic',
    'easeIn',
    'easeOut',
    'easeInOut',
    'easeInBack',
    'easeOutBack',
    'easeInOutBack',
    'easeInElastic',
    'easeOutElastic',
    'easeInBounce',
    'easeOutBounce',
    'step',
  ] as const)('bounds adaptive output for %s', (easing) => {
    const fixture = playerPackage();
    fixture.animation.timeline.tracks[1]!.keyframes[0]!.easing = easing;
    const result = compileAnimatedSvg(fixture, {
      maxAdaptiveSamplesPerSegment: 16,
    });
    expect(result.adaptiveSampleCount).toBeGreaterThan(0);
    expect(result.adaptiveSampleCount).toBeLessThanOrEqual(28);
  });

  it('emits an explicit SMIL profile without scripts, events, external refs, or foreignObject', () => {
    const result = compileAnimatedSvg(playerPackage(), {
      profile: 'smil',
      theme: 'dark',
    });

    expect(result.svg).toContain('data-excalimate-animation-profile="smil"');
    expect(result.svg).toContain('fill="#121212"');
    expect(result.svg).not.toMatch(
      /<script|foreignObject|onload|https:\/\/example\.com|javascript:/i,
    );
    expect(result.svg).not.toContain('url(');
  });

  it('keeps output size independent of FPS for long clips', () => {
    const fixture = playerPackage();
    const first = compileAnimatedSvg(fixture);
    fixture.animation.timeline.fps = 15;
    const second = compileAnimatedSvg(fixture);
    expect(second.svg).toBe(first.svg);
    expect(second.emittedKeyframeCount).toBe(first.emittedKeyframeCount);
  });

  it('preserves sanitizer-controlled local resources and rewritten IDs', () => {
    const fixture = playerPackage();
    fixture.scene.svg = fixture.scene.svg
      .replace(
        '<g data-excalimate-scene="true">',
        '<defs><linearGradient id="gradient"><stop offset="0" stop-color="#fff"/></linearGradient></defs><g data-excalimate-scene="true">',
      )
      .replace('stroke="black"', 'stroke="url(#gradient)"');
    const result = compileAnimatedSvg(fixture);
    expect(result.svg).toMatch(/stroke="url\(#xmt-\d+\)"/);
    expect(result.svg).not.toContain('id="gradient"');
  });
});
