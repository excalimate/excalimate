import { describe, expect, it } from 'vitest';
import {
  createExportJob,
  ExportCancelledError,
  ExportPreflightError,
} from './controller.js';
import type {
  ExportCapabilityReport,
  ExportPhase,
  ExportPreflightResult,
} from './types.js';

const capabilities: ExportCapabilityReport = {
  worker: true,
  offscreenCanvas: true,
  videoEncoder: true,
  h264: true,
  vp8: true,
  vp9: true,
  executionMode: 'worker-assisted',
};
const preflight: ExportPreflightResult = {
  estimate: {
    width: 100,
    height: 100,
    fps: 10,
    durationMs: 1000,
    frameCount: 10,
    sampleCount: 11,
    rawFrameBytes: 40_000,
    estimatedPeakMemoryBytes: 160_000,
    estimatedOutputBytes: 20_000,
  },
  capabilities,
  issues: [],
  supported: true,
};

describe('export job controller', () => {
  it('keeps progress monotonic across meaningful phases', async () => {
    const observed: number[] = [];
    const job = createExportJob({
      preflight,
      async run(task) {
        task.report('prepare', 0.5);
        task.report('render', 0.2);
        task.report('render', 0.1);
        task.report('encode', 0.75);
        task.report('package', 1);
        return 'done';
      },
    });
    job.subscribe((state) => observed.push(state.progress.progress));
    await expect(job.start()).resolves.toBe('done');
    expect(observed.every((value, index) => index === 0 || value >= observed[index - 1]!)).toBe(true);
    expect(job.state.status).toBe('completed');
    expect(job.state.progress.progress).toBe(1);
  });

  it.each<Exclude<ExportPhase, 'complete'>>([
    'preflight',
    'prepare',
    'render',
    'encode',
    'package',
    'download',
  ])('acknowledges cancellation during %s and runs cleanup', async (phase) => {
    let cleaned = false;
    const job = createExportJob({
      preflight,
      async run(task) {
        task.defer(() => {
          cleaned = true;
        });
        if (phase !== 'preflight') {
          task.report(phase, 0.5);
        }
        await task.yield();
        task.throwIfCancelled();
      },
    });
    job.subscribe((state) => {
      if (
        state.status === 'running' &&
        state.progress.phase === phase
      ) {
        job.cancel(`cancel-${phase}`);
      }
    });

    await expect(job.start()).rejects.toBeInstanceOf(ExportCancelledError);
    expect(job.state.status).toBe('cancelled');
    expect(cleaned).toBe(phase !== 'preflight');
  });

  it('rejects unsupported jobs before executing format work', async () => {
    let ran = false;
    const job = createExportJob({
      preflight: {
        ...preflight,
        supported: false,
        issues: [
          {
            code: 'unsupported',
            severity: 'error',
            message: 'Unsupported codec',
          },
        ],
      },
      async run() {
        ran = true;
      },
    });

    await expect(job.start()).rejects.toBeInstanceOf(ExportPreflightError);
    expect(ran).toBe(false);
    expect(job.state.status).toBe('error');
  });
});
