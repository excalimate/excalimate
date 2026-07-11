import { performance } from 'node:perf_hooks';
import {
  compileTimeline,
  computeCompiledFrame,
} from '../dist/index.js';

function createFixture(elementCount, keyframeCount) {
  const tracks = [];
  let remaining = keyframeCount;
  for (let index = 0; index < elementCount; index += 1) {
    const count = Math.max(
      2,
      Math.floor(remaining / Math.max(1, elementCount - index)),
    );
    remaining -= count;
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
    id: `fixture-${elementCount}-${keyframeCount}`,
    name: 'Benchmark',
    duration: 60_000,
    fps: 60,
    tracks,
  };
}

function benchmark(elementCount, keyframeCount, frameCount) {
  const timeline = createFixture(elementCount, keyframeCount);
  const compileStart = performance.now();
  const compiled = compileTimeline(timeline, 1);
  const compileMs = performance.now() - compileStart;
  const frameStart = performance.now();
  let checksum = 0;
  for (let frame = 0; frame < frameCount; frame += 1) {
    const state = computeCompiledFrame(compiled, frame * (1000 / 60));
    checksum += state.size;
  }
  const frameMs = performance.now() - frameStart;
  return {
    elements: elementCount,
    keyframes: keyframeCount,
    frames: frameCount,
    compileMs: Number(compileMs.toFixed(3)),
    totalFrameMs: Number(frameMs.toFixed(3)),
    averageFrameMs: Number((frameMs / frameCount).toFixed(3)),
    checksum,
  };
}

console.log(
  JSON.stringify(
    [
      benchmark(200, 1000, 240),
      benchmark(1000, 5000, 120),
    ],
    null,
    2,
  ),
);
