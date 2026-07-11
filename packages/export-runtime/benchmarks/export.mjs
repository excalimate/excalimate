import { cpus } from 'node:os';
import { performance } from 'node:perf_hooks';
import { Window } from 'happy-dom';
import {
  compileAnimatedSvg,
  createExportJob,
  createFrameSampler,
  estimateExportResources,
  estimateLegacySampledSvgKeyframes,
} from '../dist/index.js';

installDom();
const playerPackage = createBenchmarkPackage();
const sampler = createFrameSampler({
  timeline: playerPackage.animation.timeline,
  hierarchy: playerPackage.animation.hierarchy,
  clipStart: playerPackage.playback.clipStart,
  clipEnd: playerPackage.playback.clipEnd,
  fps: 30,
});
const playbackStart = performance.now();
let checksum = 0;
for (let index = 0; index < sampler.sampleCount; index += 1) {
  const frame = sampler.sampleFrame(index);
  checksum += frame.get('element-a')?.translateX ?? 0;
}
const playbackMs = performance.now() - playbackStart;

const svgStart = performance.now();
const compiledSvg = compileAnimatedSvg(playerPackage, {
  profile: 'css-keyframes',
});
const svgCompileMs = performance.now() - svgStart;
const svgBytes = new TextEncoder().encode(compiledSvg.svg).byteLength;
const legacyKeyframes = estimateLegacySampledSvgKeyframes(playerPackage, 60);
const legacyApproxBytes = legacyKeyframes * 110;

const cancellationStart = performance.now();
const cancellation = createExportJob({
  preflight: supportedPreflight(),
  async run(task) {
    task.defer(() => undefined);
    await task.yield();
    task.throwIfCancelled();
  },
});
const cancellationPromise = cancellation.start();
cancellation.cancel('benchmark cancellation');
const cancellationAcknowledgedMs = performance.now() - cancellationStart;
await cancellationPromise.catch(() => undefined);

const referenceEstimate = estimateExportResources({
  format: 'mp4',
  width: 1920,
  height: 1080,
  fps: 30,
  clipStart: 0,
  clipEnd: 10_000,
  bitrate: 20_000_000,
  sourceBytes: 50_000,
  sourceKeyframes: 40,
});
const report = {
  referenceDevice: {
    platform: process.platform,
    architecture: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCpus: cpus().length,
    node: process.version,
  },
  fixture: {
    durationMs: sampler.durationMs,
    samples: sampler.sampleCount,
    sourceKeyframes: compiledSvg.sourceKeyframeCount,
  },
  timelineSampling: {
    totalMs: round(playbackMs),
    framesPerSecond: round((sampler.sampleCount / playbackMs) * 1000),
    checksum: round(checksum),
  },
  animatedSvg: {
    compileMs: round(svgCompileMs),
    bytes: svgBytes,
    emittedKeyframes: compiledSvg.emittedKeyframeCount,
    adaptiveSamples: compiledSvg.adaptiveSampleCount,
    legacySampledKeyframes: legacyKeyframes,
    legacyApproxBytes,
    sizeRatio: round(svgBytes / legacyApproxBytes),
  },
  cancellation: {
    acknowledgedMs: round(cancellationAcknowledgedMs),
    targetMs: 250,
    withinTarget: cancellationAcknowledgedMs < 250,
  },
  referenceEstimate: {
    peakMemoryBytes: referenceEstimate.estimatedPeakMemoryBytes,
    outputBytes: referenceEstimate.estimatedOutputBytes,
  },
};
console.log(JSON.stringify(report, null, 2));
if (svgBytes >= legacyApproxBytes * 0.25) {
  throw new Error('Compact SVG did not materially beat the sampled baseline');
}
if (cancellationAcknowledgedMs >= 250) {
  throw new Error('Cancellation acknowledgement exceeded 250ms');
}

function installDom() {
  const window = new Window();
  globalThis.DOMParser = window.DOMParser;
  globalThis.XMLSerializer = window.XMLSerializer;
  globalThis.SVGElement = window.SVGElement;
  globalThis.SVGSVGElement = window.SVGSVGElement;
  globalThis.SVGGraphicsElement = window.SVGGraphicsElement;
}

function createBenchmarkPackage() {
  const tracks = [];
  for (const targetId of ['element-a', 'element-b', 'element-c']) {
    tracks.push({
      id: `${targetId}-translate`,
      targetId,
      targetType: 'element',
      property: 'translateX',
      enabled: true,
      keyframes: [
        { id: `${targetId}-start`, time: 0, value: 0, easing: 'easeInOut' },
        {
          id: `${targetId}-middle`,
          time: 60_000,
          value: 500,
          easing: 'easeOut',
        },
        {
          id: `${targetId}-end`,
          time: 120_000,
          value: 0,
          easing: 'linear',
        },
      ],
    });
  }
  return {
    version: '1.0.0',
    runtimeVersion: '1.0.0',
    schemaVersion: '2.0.0',
    scene: {
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080"><g data-excalimate-scene="true">${[
        'element-a',
        'element-b',
        'element-c',
      ]
        .map(
          (id, index) =>
            `<g data-excalimate-id="${id}" data-excalimate-origin="${index * 100} 100" data-excalimate-center="${index * 100 + 50} 150"><rect x="${index * 100}" y="100" width="100" height="100"/></g>`,
        )
        .join('')}</g></svg>`,
    },
    animation: {
      timeline: {
        id: 'benchmark',
        name: 'Long standard fixture',
        duration: 120_000,
        fps: 60,
        tracks,
      },
      hierarchy: {},
    },
    playback: {
      clipStart: 0,
      clipEnd: 120_000,
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

function supportedPreflight() {
  return {
    estimate: {
      width: 100,
      height: 100,
      fps: 1,
      durationMs: 1000,
      frameCount: 1,
      sampleCount: 2,
      rawFrameBytes: 40_000,
      estimatedPeakMemoryBytes: 160_000,
      estimatedOutputBytes: 10_000,
    },
    capabilities: {
      worker: true,
      offscreenCanvas: true,
      videoEncoder: true,
      h264: true,
      vp8: true,
      vp9: true,
      executionMode: 'worker-assisted',
    },
    issues: [],
    supported: true,
  };
}

function round(value) {
  return Number(value.toFixed(3));
}
