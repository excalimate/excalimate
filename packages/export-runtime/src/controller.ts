import type {
  ExportJob,
  ExportJobListener,
  ExportJobState,
  ExportPhase,
  ExportPreflightResult,
  ExportProgress,
  ExportTaskContext,
} from './types.js';

const PHASE_WEIGHTS: Readonly<Record<Exclude<ExportPhase, 'complete'>, number>> =
  Object.freeze({
    preflight: 0.03,
    prepare: 0.12,
    render: 0.55,
    encode: 0.2,
    package: 0.06,
    download: 0.04,
  });
const PHASES = Object.keys(PHASE_WEIGHTS) as readonly Exclude<
  ExportPhase,
  'complete'
>[];

export class ExportCancelledError extends Error {
  constructor(message = 'Export cancelled', options?: ErrorOptions) {
    super(message, options);
    this.name = 'ExportCancelledError';
  }
}

export class ExportPreflightError extends Error {
  readonly preflight: ExportPreflightResult;

  constructor(preflight: ExportPreflightResult) {
    super(
      preflight.issues.find((issue) => issue.severity === 'error')?.message ??
        'Export is not supported',
    );
    this.name = 'ExportPreflightError';
    this.preflight = preflight;
  }
}

export interface ExportJobDefinition<T> {
  preflight: ExportPreflightResult;
  run(context: ExportTaskContext): Promise<T>;
}

export function createExportJob<T>(
  definition: ExportJobDefinition<T>,
): ExportJob<T> {
  const controller = new AbortController();
  const listeners = new Set<ExportJobListener<T>>();
  const cleanups: Array<() => void | Promise<void>> = [];
  let promise: Promise<T> | null = null;
  let phaseIndex = 0;
  let monotonicProgress = 0;
  let state: ExportJobState<T> = {
    status: 'idle',
    progress: {
      phase: 'preflight',
      phaseProgress: 0,
      progress: 0,
    },
    preflight: definition.preflight,
  };

  const emit = (): void => {
    for (const listener of listeners) listener(state);
  };
  const update = (next: ExportJobState<T>): void => {
    state = next;
    emit();
  };
  const report = (
    phase: Exclude<ExportPhase, 'complete'>,
    phaseProgress: number,
    message?: string,
  ): void => {
    const nextPhaseIndex = PHASES.indexOf(phase);
    if (nextPhaseIndex < phaseIndex) return;
    phaseIndex = nextPhaseIndex;
    const boundedPhaseProgress = Math.min(1, Math.max(0, phaseProgress));
    const progressBefore = PHASES.slice(0, nextPhaseIndex).reduce(
      (total, item) => total + PHASE_WEIGHTS[item],
      0,
    );
    const computed =
      progressBefore + PHASE_WEIGHTS[phase] * boundedPhaseProgress;
    monotonicProgress = Math.min(
      1,
      Math.max(monotonicProgress, computed),
    );
    const progress: ExportProgress = {
      phase,
      phaseProgress: boundedPhaseProgress,
      progress: monotonicProgress,
      ...(message ? { message } : {}),
    };
    update({ ...state, progress });
  };
  const throwIfCancelled = (): void => {
    if (controller.signal.aborted) {
      throw new ExportCancelledError(abortReason(controller.signal));
    }
  };
  const context: ExportTaskContext = {
    signal: controller.signal,
    report,
    throwIfCancelled,
    async yield(): Promise<void> {
      throwIfCancelled();
      await cooperativeYield();
      throwIfCancelled();
    },
    defer(cleanup): void {
      cleanups.push(cleanup);
    },
  };

  const job: ExportJob<T> = {
    get state(): Readonly<ExportJobState<T>> {
      return state;
    },
    start(): Promise<T> {
      if (promise) return promise;
      promise = (async () => {
        update({ ...state, status: 'running' });
        let result: T | undefined;
        let failure: unknown;
        try {
          report('preflight', 1, 'Preflight complete');
          if (!definition.preflight.supported) {
            throw new ExportPreflightError(definition.preflight);
          }
          throwIfCancelled();
          result = await definition.run(context);
          throwIfCancelled();
        } catch (error) {
          failure = error;
        }
        const cleanupErrors = await runCleanups(cleanups);
        if (controller.signal.aborted) {
          const causes = [
            ...(failure === undefined ? [] : [failure]),
            ...cleanupErrors,
          ];
          failure = new ExportCancelledError(abortReason(controller.signal), {
            ...(causes.length > 0
              ? { cause: new AggregateError(causes, 'Export cancellation cleanup failed') }
              : {}),
          });
        } else if (failure === undefined && cleanupErrors.length > 0) {
          failure = new AggregateError(
            cleanupErrors,
            'Export resource cleanup failed',
          );
        }
        if (failure !== undefined) {
          const error = normalizeError(failure);
          if (
            controller.signal.aborted ||
            error instanceof ExportCancelledError
          ) {
            update({ ...state, status: 'cancelled', error });
          } else {
            update({ ...state, status: 'error', error });
          }
          throw error;
        }
        report('download', 1);
        const completedProgress: ExportProgress = {
          phase: 'complete',
          phaseProgress: 1,
          progress: 1,
          message: 'Export complete',
        };
        update({
          ...state,
          status: 'completed',
          progress: completedProgress,
          result: result as T,
        });
        return result as T;
      })();
      return promise;
    },
    cancel(reason = 'Export cancelled by user'): void {
      if (
        state.status === 'completed' ||
        state.status === 'cancelled' ||
        state.status === 'error'
      ) {
        return;
      }
      controller.abort(reason);
      update({
        ...state,
        status: 'cancelled',
        error: new ExportCancelledError(reason),
      });
    },
    subscribe(listener): () => void {
      listeners.add(listener);
      listener(state);
      return () => listeners.delete(listener);
    },
  };
  return job;
}

async function runCleanups(
  cleanups: Array<() => void | Promise<void>>,
): Promise<unknown[]> {
  const errors: unknown[] = [];
  for (const cleanup of cleanups.reverse()) {
    try {
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  return errors;
}

function normalizeError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

function abortReason(signal: AbortSignal): string {
  return typeof signal.reason === 'string' ? signal.reason : 'Export cancelled';
}

function cooperativeYield(): Promise<void> {
  const scheduling = globalThis as typeof globalThis & {
    scheduler?: { yield?: () => Promise<void> };
  };
  if (typeof scheduling.scheduler?.yield === 'function') {
    return scheduling.scheduler.yield();
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}
