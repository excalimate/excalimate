import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import {
  createFrameSampler,
  detectExportCapabilities,
  preflightExport,
  WorkerFrameSampler,
} from '@excalimate/export-runtime';
import type {
  ExportCapabilityReport,
  ExportFrameSampler,
  ExportPreflightResult,
  ExportTaskContext,
} from '@excalimate/export-runtime';
import type { FrameState } from '@excalimate/animation-core';
import type { PlayerPackageV1 } from '@excalimate/player-runtime';
import type { ProjectDocument } from '@excalimate/project-schema';
import { toProjectDocument } from '../../core/models/Project';
import { useAnimationStore } from '../../stores/animationStore';
import {
  getExportResolution,
  useProjectStore,
} from '../../stores/projectStore';
import type { AnimatableTarget } from '../../types/excalidraw';
import { generatePlayerPackage } from '../playerPackage';
import { QUALITY_SETTINGS } from './types';
import type { ExportOptions } from './types';

export interface ExportSnapshot {
  project: ProjectDocument;
  projectName: string;
  targets: readonly AnimatableTarget[];
  elements: readonly NonDeletedExcalidrawElement[];
  files: Record<string, unknown>;
  width: number;
  height: number;
  fps: number;
  options: ExportOptions;
}

export interface PreparedExportContext extends ExportSnapshot {
  playerPackage: PlayerPackageV1;
  sampler: ExportFrameSampler;
  capabilities: ExportCapabilityReport;
  sampleFrame(index: number, signal: AbortSignal): Promise<FrameState>;
}

export function captureExportSnapshot(options: ExportOptions): ExportSnapshot {
  const projectState = useProjectStore.getState();
  const animationState = useAnimationStore.getState();
  const project = projectState.project;
  if (!project?.scene) throw new Error('No scene loaded');
  const fps = options.fps ?? (options.format === 'gif' ? 15 : 30);
  const baseResolution = getExportResolution(
    projectState.cameraFrame.aspectRatio,
  );
  const quality = options.quality ?? 'high';
  const maxGifWidth =
    quality === 'low'
      ? 480
      : quality === 'medium'
        ? 640
        : quality === 'high'
          ? 800
          : 1280;
  const scale =
    options.format === 'gif'
      ? Math.min(1, maxGifWidth / baseResolution.width)
      : 1;
  const width = Math.round(baseResolution.width * scale);
  const height = Math.round(baseResolution.height * scale);
  const canonical = toProjectDocument(project);
  const exportProject: ProjectDocument = {
    ...canonical,
    timeline: animationState.timeline,
    playback: {
      clipStart: animationState.clipStart,
      clipEnd: animationState.clipEnd,
      cameraFrame: projectState.cameraFrame,
    },
  };
  const elements = getNonDeletedElements(
    project.scene.elements as ExcalidrawElement[],
  ) as NonDeletedExcalidrawElement[];

  return {
    project: exportProject,
    projectName: project.name || 'animation',
    targets: [...projectState.targets],
    elements,
    files: { ...(project.scene.files ?? {}) },
    width,
    height,
    fps,
    options,
  };
}

export async function preflightSnapshot(
  snapshot: ExportSnapshot,
): Promise<ExportPreflightResult> {
  const bitrate =
    QUALITY_SETTINGS[snapshot.options.quality ?? 'high'].bitrate;
  const capabilities = await detectExportCapabilities({
    width: snapshot.width,
    height: snapshot.height,
    bitrate,
  });
  return preflightExport(
    {
      format: snapshot.options.format,
      width: snapshot.width,
      height: snapshot.height,
      fps: snapshot.fps,
      clipStart: snapshot.project.playback.clipStart,
      clipEnd: snapshot.project.playback.clipEnd,
      bitrate,
      sourceBytes: new TextEncoder().encode(
        JSON.stringify(snapshot.project.scene),
      ).byteLength,
      sourceKeyframes: snapshot.project.timeline.tracks.reduce(
        (total, track) =>
          total + (track.enabled ? track.keyframes.length : 0),
        0,
      ),
    },
    capabilities,
  );
}

export async function prepareExportContext(
  snapshot: ExportSnapshot,
  preflight: ExportPreflightResult,
  task: ExportTaskContext,
): Promise<PreparedExportContext> {
  task.report('prepare', 0.1, 'Generating sanitized export package');
  const playerPackage = await generatePlayerPackage(
    snapshot.project,
    snapshot.targets,
    { theme: snapshot.options.theme },
  );
  task.throwIfCancelled();
  const sampler = createFrameSampler({
    timeline: playerPackage.animation.timeline,
    hierarchy: playerPackage.animation.hierarchy,
    clipStart: playerPackage.playback.clipStart,
    clipEnd: playerPackage.playback.clipEnd,
    fps: snapshot.fps,
  });
  let workerSampler: WorkerFrameSampler | null = null;

  if (preflight.capabilities.executionMode === 'worker-assisted') {
    task.report('prepare', 0.55, 'Starting worker-assisted frame sampler');
    try {
      workerSampler = await WorkerFrameSampler.create(
        new Worker(new URL('./frameSampler.worker.ts', import.meta.url), {
          type: 'module',
          name: 'excalimate-export-sampler',
        }),
        sampler.spec,
      );
      task.defer(() => workerSampler?.destroy());
    } catch (error) {
      task.report(
        'prepare',
        0.65,
        `Worker sampler unavailable (${errorMessage(error)}); using cooperative main-thread sampling`,
      );
    }
  }
  task.report('prepare', 1, 'Export package ready');

  return {
    ...snapshot,
    playerPackage,
    sampler,
    capabilities: preflight.capabilities,
    async sampleFrame(
      index: number,
      signal: AbortSignal,
    ): Promise<FrameState> {
      if (signal.aborted) {
        throw new DOMException('Export cancelled', 'AbortError');
      }
      return workerSampler
        ? workerSampler.sampleFrame(index, signal)
        : sampler.sampleFrame(index);
    },
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
