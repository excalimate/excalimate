import type { PlayerPackageV1 } from '@excalimate/player-runtime';

export function createPlayerTestPackage(): PlayerPackageV1 {
  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 56.25"><g data-excalimate-scene="true"><g data-excalimate-id="element"><rect width="20" height="20"/></g></g></svg>',
    },
    animation: {
      timeline: {
        id: 'timeline',
        name: 'Hosted player test',
        duration: 1_000,
        fps: 60,
        tracks: [
          {
            id: 'opacity',
            targetId: 'element',
            targetType: 'element',
            property: 'opacity',
            enabled: true,
            keyframes: [
              { id: 'start', time: 0, value: 0, easing: 'linear' },
              { id: 'end', time: 1_000, value: 1, easing: 'linear' },
            ],
          },
        ],
      },
      hierarchy: {},
    },
    playback: {
      clipStart: 0,
      clipEnd: 1_000,
      camera: {
        aspectRatio: '16:9',
        width: 100,
        height: 56.25,
        x: 50,
        y: 28.125,
        sceneOffsetX: 0,
        sceneOffsetY: 0,
      },
    },
    dimensions: { width: 1920, height: 1080, aspectRatio: '16:9' },
    poster: { kind: 'frame', timeMs: 0 },
    title: 'Hosted animation',
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  };
}
