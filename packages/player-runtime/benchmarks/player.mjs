import { performance } from 'node:perf_hooks';
import { CompiledTimelineAdapter } from '../dist/index.js';

function createPackage(elementCount, keyframeCount) {
  const tracks = [];
  let remaining = keyframeCount;
  const markers = [];
  for (let index = 0; index < elementCount; index += 1) {
    const count = Math.max(
      2,
      Math.floor(remaining / Math.max(1, elementCount - index)),
    );
    remaining -= count;
    markers.push(`<g data-excalimate-id="element-${index}"><rect width="10" height="10"/></g>`);
    tracks.push({
      id: `track-${index}`,
      targetId: `element-${index}`,
      targetType: 'element',
      property: index % 2 === 0 ? 'opacity' : 'translateX',
      enabled: true,
      keyframes: Array.from({ length: count }, (_, keyframeIndex) => ({
        id: `keyframe-${index}-${keyframeIndex}`,
        time: keyframeIndex * 100,
        value: (index + keyframeIndex) % 100,
        easing: 'easeInOut',
      })),
    });
  }
  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g data-excalimate-scene="true">${markers.join('')}</g></svg>`,
    },
    animation: {
      timeline: {
        id: 'benchmark',
        name: 'Benchmark',
        duration: 60_000,
        fps: 60,
        tracks,
      },
      hierarchy: {},
    },
    playback: {
      clipStart: 0,
      clipEnd: 60_000,
      camera: {
        aspectRatio: '16:9',
        width: 1920,
        height: 1080,
        x: 960,
        y: 540,
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

const fixture = createPackage(200, 1000);
const createStart = performance.now();
const timeline = new CompiledTimelineAdapter(fixture);
let checksum = timeline.frameAt(0).size;
const firstFrameMs = performance.now() - createStart;
const frameStart = performance.now();
for (let frame = 0; frame < 600; frame += 1) {
  checksum += timeline.frameAt(frame * (1000 / 60)).size;
}
const frameTotalMs = performance.now() - frameStart;
const averageFrameMs = frameTotalMs / 600;
const report = {
  fixture: { elements: 200, keyframes: 1000, measuredFrames: 600 },
  firstFrameMs: Number(firstFrameMs.toFixed(3)),
  averageFrameMs: Number(averageFrameMs.toFixed(3)),
  desktopFps: Number((1000 / averageFrameMs).toFixed(1)),
  simulatedMobileFpsAt4xCpu: Number((1000 / (averageFrameMs * 4)).toFixed(1)),
  targets: {
    firstFrameUnder1500Ms: firstFrameMs <= 1500,
    desktopAtLeast55Fps: 1000 / averageFrameMs >= 55,
    mobileAtLeast28Fps: 1000 / (averageFrameMs * 4) >= 28,
  },
  checksum,
};
console.log(JSON.stringify(report, null, 2));
