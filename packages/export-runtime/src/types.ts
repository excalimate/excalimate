export type ExportFormat = 'mp4' | 'webm' | 'gif' | 'svg' | 'lottie' | 'dotlottie';

export type ExportPhase =
  | 'preflight'
  | 'prepare'
  | 'render'
  | 'encode'
  | 'package'
  | 'download'
  | 'complete';

export type ExportJobStatus = 'idle' | 'running' | 'completed' | 'cancelled' | 'error';

export type ExportExecutionMode = 'worker-assisted' | 'cooperative-main';

export interface ExportProgress {
  phase: ExportPhase;
  phaseProgress: number;
  progress: number;
  message?: string;
}

export interface ExportResourceEstimate {
  width: number;
  height: number;
  fps: number;
  durationMs: number;
  frameCount: number;
  sampleCount: number;
  rawFrameBytes: number;
  estimatedPeakMemoryBytes: number;
  estimatedOutputBytes: number;
}

export interface ExportCapabilityReport {
  worker: boolean;
  offscreenCanvas: boolean;
  videoEncoder: boolean;
  h264: boolean;
  vp8: boolean;
  vp9: boolean;
  deviceMemoryBytes?: number;
  executionMode: ExportExecutionMode;
}

export type ExportIssueSeverity = 'warning' | 'error';

export interface ExportPreflightIssue {
  code: string;
  severity: ExportIssueSeverity;
  message: string;
}

export interface ExportPreflightResult {
  estimate: ExportResourceEstimate;
  capabilities: ExportCapabilityReport;
  issues: readonly ExportPreflightIssue[];
  supported: boolean;
}

export interface ExportRequest {
  format: ExportFormat;
  width: number;
  height: number;
  fps: number;
  clipStart: number;
  clipEnd: number;
  bitrate?: number;
  sourceBytes?: number;
  sourceKeyframes?: number;
  nonlinearSegments?: number;
  animatedTargets?: number;
  groupedTargets?: number;
}

export interface ExportJobState<T> {
  status: ExportJobStatus;
  progress: ExportProgress;
  preflight: ExportPreflightResult;
  result?: T;
  error?: Error;
}

export type ExportJobListener<T> = (state: Readonly<ExportJobState<T>>) => void;

export interface ExportJob<T> {
  readonly state: Readonly<ExportJobState<T>>;
  start(): Promise<T>;
  cancel(reason?: string): void;
  subscribe(listener: ExportJobListener<T>): () => void;
}

export interface ExportTaskContext {
  readonly signal: AbortSignal;
  report(phase: Exclude<ExportPhase, 'complete'>, phaseProgress: number, message?: string): void;
  throwIfCancelled(): void;
  yield(): Promise<void>;
  defer(cleanup: () => void | Promise<void>): void;
}
