import type { PlayerPackageV1 } from '@excalimate/player-runtime';

export function createCrossSurfaceParityPackage(): PlayerPackageV1 {
  const linearTrack = (
    id: string,
    targetId: string,
    property: 'translateX' | 'opacity' | 'drawProgress' | 'scaleX',
    from: number,
    to: number,
    targetType: 'element' | 'group' = 'element',
  ) => ({
    id,
    targetId,
    targetType,
    property,
    enabled: true,
    keyframes: [
      { id: `${id}-start`, time: 0, value: from, easing: 'linear' as const },
      { id: `${id}-end`, time: 1_000, value: to, easing: 'linear' as const },
    ],
  });

  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80">',
        '<g data-excalimate-scene="true">',
        '<g data-excalimate-id="removed" data-excalimate-origin="0 0" data-excalimate-center="5 5"><rect width="10" height="10"/></g>',
        '<g data-excalimate-id="returning" data-excalimate-origin="15 0" data-excalimate-center="20 5"><rect width="10" height="10"/></g>',
        '<g data-excalimate-id="zero-opacity" data-excalimate-origin="30 0" data-excalimate-center="35 5"><rect width="10" height="10"/></g>',
        '<g data-excalimate-id="grouped" data-excalimate-origin="45 0" data-excalimate-center="50 5"><path d="M0 0 L10 10"/></g>',
        '<g data-excalimate-id="label" data-excalimate-origin="45 15" data-excalimate-center="50 20" data-excalimate-bound-to="grouped"><text>Label</text></g>',
        '</g></svg>',
      ].join(''),
      absoluteOpacityTargetIds: ['zero-opacity'],
    },
    animation: {
      timeline: {
        id: 'cross-surface-parity',
        name: 'Cross-surface parity',
        duration: 1_000,
        fps: 60,
        tracks: [
          linearTrack('removed-opacity', 'removed', 'opacity', 1, 0),
          linearTrack('returning-opacity', 'returning', 'opacity', 0, 1),
          linearTrack('zero-opacity-track', 'zero-opacity', 'opacity', 0, 1),
          linearTrack('group-translate', 'group', 'translateX', 0, 20, 'group'),
          linearTrack('grouped-draw', 'grouped', 'drawProgress', 0, 1),
          linearTrack('camera-translate', '__camera_frame__', 'translateX', 0, 20),
          linearTrack('camera-scale', '__camera_frame__', 'scaleX', 1, 1.5),
        ],
      },
      hierarchy: { group: ['grouped'] },
    },
    playback: {
      clipStart: 0,
      clipEnd: 1_000,
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
    dimensions: { width: 1_920, height: 1_080, aspectRatio: '16:9' },
    poster: { kind: 'frame', timeMs: 0 },
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  };
}
