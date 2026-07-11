import { describe, expect, it } from 'vitest';
import {
  estimateExportResources,
  preflightExport,
} from './resources.js';
import type {
  ExportCapabilityReport,
  ExportRequest,
} from './types.js';

const capabilities: ExportCapabilityReport = {
  worker: true,
  offscreenCanvas: true,
  videoEncoder: true,
  h264: true,
  vp8: true,
  vp9: true,
  deviceMemoryBytes: 8 * 1024 * 1024 * 1024,
  executionMode: 'worker-assisted',
};
const request: ExportRequest = {
  format: 'mp4',
  width: 1920,
  height: 1080,
  fps: 30,
  clipStart: 0,
  clipEnd: 10_000,
  bitrate: 8_000_000,
  sourceBytes: 10_000,
  sourceKeyframes: 20,
};

describe('export preflight and estimates', () => {
  it('estimates frames, raw bytes, output, and bounded codec queue memory', () => {
    const estimate = estimateExportResources(request);
    expect(estimate.frameCount).toBe(300);
    expect(estimate.sampleCount).toBe(301);
    expect(estimate.rawFrameBytes).toBe(1920 * 1080 * 4);
    expect(estimate.estimatedPeakMemoryBytes).toBe(
      estimate.rawFrameBytes * 4,
    );
    expect(estimate.estimatedOutputBytes).toBe(10_000_000);
  });

  it('reports honest unsupported codec errors', () => {
    const result = preflightExport(request, {
      ...capabilities,
      h264: false,
    });
    expect(result.supported).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'h264-unavailable',
        severity: 'error',
      }),
    );
  });

  it('accounts for retained GIF frame copies and device pressure', () => {
    const result = preflightExport(
      { ...request, format: 'gif', clipEnd: 60_000 },
      {
        ...capabilities,
        deviceMemoryBytes: 2 * 1024 * 1024 * 1024,
      },
    );
    expect(result.estimate.estimatedPeakMemoryBytes).toBeGreaterThan(
      2 * 1024 * 1024 * 1024,
    );
    expect(result.issues.map((issue) => issue.code)).toContain(
      'memory-budget-exceeded',
    );
  });

  it('rejects dimensions, FPS, and duration outside client budgets', () => {
    const result = preflightExport(
      {
        ...request,
        width: 9000,
        fps: 120,
        clipEnd: 700_000,
      },
      capabilities,
    );
    expect(result.supported).toBe(false);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'dimensions-out-of-range',
        'fps-out-of-range',
        'duration-out-of-range',
      ]),
    );
  });
});
