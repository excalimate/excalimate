import type {
  ExportCapabilityReport,
  ExportPreflightIssue,
  ExportPreflightResult,
  ExportRequest,
  ExportResourceEstimate,
} from './types.js';

export const EXPORT_RESOURCE_BUDGETS = Object.freeze({
  maxDimension: 8_192,
  maxPixels: 33_177_600,
  maxFps: 60,
  maxDurationMs: 10 * 60 * 1000,
  maxSamples: 36_001,
  warningPeakMemoryBytes: 512 * 1024 * 1024,
  maxPeakMemoryBytes: 2 * 1024 * 1024 * 1024,
  maxEstimatedOutputBytes: 2 * 1024 * 1024 * 1024,
});

export const ANIMATED_SVG_LIMITS = Object.freeze({
  maxSamples: 4_096,
  maxDeclarations: 200_000,
  maxOutputBytes: 8 * 1024 * 1024,
  maxAdaptiveSamplesPerSegment: 64,
});

export const LOTTIE_LIMITS = Object.freeze({
  maxFlattenedPropertySamples: 200_000,
});

export function estimateExportResources(request: ExportRequest): ExportResourceEstimate {
  const durationMs = request.clipEnd - request.clipStart;
  const frameCount = Math.max(1, Math.ceil((Math.max(0, durationMs) / 1000) * request.fps));
  const sampleCount = frameCount + 1;
  const rawFrameBytes = request.width * request.height * 4;
  const estimatedPeakMemoryBytes = estimatePeakMemory(request.format, rawFrameBytes, sampleCount);
  const estimatedOutputBytes = estimateOutputBytes(request, durationMs, rawFrameBytes, sampleCount);
  return {
    width: request.width,
    height: request.height,
    fps: request.fps,
    durationMs,
    frameCount,
    sampleCount,
    rawFrameBytes,
    estimatedPeakMemoryBytes,
    estimatedOutputBytes,
  };
}

export function preflightExport(
  request: ExportRequest,
  capabilities: ExportCapabilityReport,
): ExportPreflightResult {
  const estimate = estimateExportResources(request);
  const issues: ExportPreflightIssue[] = [];
  const add = (code: string, severity: ExportPreflightIssue['severity'], message: string): void => {
    issues.push({ code, severity, message });
  };

  if (
    !Number.isInteger(request.width) ||
    !Number.isInteger(request.height) ||
    request.width < 1 ||
    request.height < 1 ||
    request.width > EXPORT_RESOURCE_BUDGETS.maxDimension ||
    request.height > EXPORT_RESOURCE_BUDGETS.maxDimension ||
    request.width * request.height > EXPORT_RESOURCE_BUDGETS.maxPixels
  ) {
    add(
      'dimensions-out-of-range',
      'error',
      `Export dimensions exceed the ${EXPORT_RESOURCE_BUDGETS.maxDimension}px / ${EXPORT_RESOURCE_BUDGETS.maxPixels.toLocaleString()} pixel client-side budget.`,
    );
  }
  if (request.format === 'svg') {
    const sourceKeyframes = Math.max(0, request.sourceKeyframes ?? 0);
    const nonlinearSegments = Math.max(0, request.nonlinearSegments ?? 0);
    const estimatedSamples =
      sourceKeyframes + nonlinearSegments * (ANIMATED_SVG_LIMITS.maxAdaptiveSamplesPerSegment - 2);
    const estimatedDeclarations = estimatedSamples * Math.max(1, request.animatedTargets ?? 0) * 4;
    if (
      estimatedSamples > ANIMATED_SVG_LIMITS.maxSamples ||
      estimatedDeclarations > ANIMATED_SVG_LIMITS.maxDeclarations ||
      estimate.estimatedOutputBytes > ANIMATED_SVG_LIMITS.maxOutputBytes
    ) {
      add(
        'svg-complexity-budget-exceeded',
        'error',
        'Animated SVG complexity exceeds the bounded sample, declaration, or serialized output budget.',
      );
    }
  }
  if (
    (request.format === 'lottie' || request.format === 'dotlottie') &&
    estimate.sampleCount * Math.max(0, request.groupedTargets ?? 0) * 6 >
      LOTTIE_LIMITS.maxFlattenedPropertySamples
  ) {
    add(
      'lottie-group-sample-budget-exceeded',
      'error',
      'Grouped Lottie animation exceeds the bounded canonical transform sample budget.',
    );
  }
  if (
    !Number.isFinite(request.fps) ||
    request.fps < 1 ||
    request.fps > EXPORT_RESOURCE_BUDGETS.maxFps
  ) {
    add(
      'fps-out-of-range',
      'error',
      `Export FPS must be between 1 and ${EXPORT_RESOURCE_BUDGETS.maxFps}.`,
    );
  }
  if (
    !Number.isFinite(estimate.durationMs) ||
    estimate.durationMs <= 0 ||
    estimate.durationMs > EXPORT_RESOURCE_BUDGETS.maxDurationMs ||
    estimate.sampleCount > EXPORT_RESOURCE_BUDGETS.maxSamples
  ) {
    add(
      'duration-out-of-range',
      'error',
      'The selected clip exceeds the client-side duration or frame budget.',
    );
  }
  if (estimate.estimatedPeakMemoryBytes > EXPORT_RESOURCE_BUDGETS.maxPeakMemoryBytes) {
    add(
      'memory-budget-exceeded',
      'error',
      'Estimated peak memory exceeds the 2 GiB client-side export budget.',
    );
  } else if (estimate.estimatedPeakMemoryBytes > EXPORT_RESOURCE_BUDGETS.warningPeakMemoryBytes) {
    add(
      'high-memory',
      'warning',
      'This export may use more than 512 MiB of memory. Reduce dimensions, FPS, or clip duration if the browser becomes unstable.',
    );
  }
  if (
    capabilities.deviceMemoryBytes !== undefined &&
    estimate.estimatedPeakMemoryBytes > capabilities.deviceMemoryBytes * 0.25
  ) {
    add(
      'device-memory-pressure',
      'warning',
      'Estimated peak export memory exceeds 25% of reported device memory.',
    );
  }
  if (estimate.estimatedOutputBytes > EXPORT_RESOURCE_BUDGETS.maxEstimatedOutputBytes) {
    add(
      'output-budget-exceeded',
      'error',
      'Estimated output exceeds the 2 GiB browser Blob budget.',
    );
  }
  if ((request.format === 'mp4' || request.format === 'webm') && !capabilities.videoEncoder) {
    add(
      'webcodecs-unavailable',
      'error',
      'This browser does not expose WebCodecs VideoEncoder. Use GIF, SVG, or Lottie instead.',
    );
  }
  if (request.format === 'mp4' && !capabilities.h264) {
    add(
      'h264-unavailable',
      'error',
      'H.264 encoding is not available for these dimensions. Try WebM or a smaller export.',
    );
  }
  if (request.format === 'webm' && !capabilities.vp8 && !capabilities.vp9) {
    add(
      'webm-codec-unavailable',
      'error',
      'Neither VP8 nor VP9 encoding is available for these dimensions.',
    );
  }
  if (
    (request.format === 'mp4' || request.format === 'webm' || request.format === 'gif') &&
    capabilities.executionMode === 'cooperative-main'
  ) {
    add(
      'cooperative-main-thread',
      'warning',
      'Frame state generation will cooperatively yield on the main thread because the worker-assisted path is unavailable.',
    );
  }

  return {
    estimate,
    capabilities,
    issues,
    supported: !issues.some((issue) => issue.severity === 'error'),
  };
}

function estimatePeakMemory(
  format: ExportRequest['format'],
  rawFrameBytes: number,
  sampleCount: number,
): number {
  if (format === 'gif') {
    return rawFrameBytes * sampleCount + rawFrameBytes * 2;
  }
  if (format === 'mp4' || format === 'webm') {
    return rawFrameBytes * 4;
  }
  return rawFrameBytes * 2;
}

function estimateOutputBytes(
  request: ExportRequest,
  durationMs: number,
  rawFrameBytes: number,
  sampleCount: number,
): number {
  if (request.format === 'mp4' || request.format === 'webm') {
    return Math.ceil(((request.bitrate ?? 8_000_000) * Math.max(0, durationMs)) / 8_000);
  }
  if (request.format === 'gif') {
    return Math.ceil(rawFrameBytes * sampleCount * 0.12);
  }
  const sourceBytes = Math.max(0, request.sourceBytes ?? 0);
  const sourceKeyframes = Math.max(0, request.sourceKeyframes ?? 0);
  if (request.format === 'svg') {
    return Math.ceil(sourceBytes + sourceKeyframes * 420 + 2_048);
  }
  if (request.format === 'dotlottie') {
    return Math.ceil((sourceBytes * 0.45 + sourceKeyframes * 180 + 4_096) * 0.7);
  }
  return Math.ceil(sourceBytes * 0.45 + sourceKeyframes * 180 + 4_096);
}
