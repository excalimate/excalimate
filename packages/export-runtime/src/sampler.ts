import {
  compileHierarchyOrder,
  compileTimeline,
  computeCompiledFrame,
} from '@excalimate/animation-core';
import type {
  AnimationTimeline,
  CompiledTimeline,
  ElementAnimationState,
  FrameState,
  GroupHierarchy,
} from '@excalimate/animation-core';

export interface FrameSamplerSpec {
  timeline: AnimationTimeline;
  hierarchy?: GroupHierarchy;
  clipStart: number;
  clipEnd: number;
  fps: number;
}

export type SerializedFrameState = readonly [
  targetId: string,
  state: ElementAnimationState,
][];

export interface ExportFrameSampler {
  readonly spec: Readonly<FrameSamplerSpec>;
  readonly compiledTimeline: CompiledTimeline;
  readonly durationMs: number;
  readonly frameCount: number;
  readonly sampleCount: number;
  timeForFrame(index: number): number;
  sampleFrame(index: number): FrameState;
  sampleAt(timeMs: number): FrameState;
}

export function createFrameSampler(spec: FrameSamplerSpec): ExportFrameSampler {
  validateSpec(spec);
  const normalizedSpec = Object.freeze({
    ...spec,
    hierarchy: spec.hierarchy ?? {},
  });
  const compiledTimeline = compileTimeline(normalizedSpec.timeline);
  const hierarchyOrder = compileHierarchyOrder(normalizedSpec.hierarchy);
  const durationMs = normalizedSpec.clipEnd - normalizedSpec.clipStart;
  const frameCount = Math.max(1, Math.ceil((durationMs / 1000) * spec.fps));
  const sampleCount = frameCount + 1;

  const sampleAt = (timeMs: number): FrameState => {
    if (!Number.isFinite(timeMs)) throw new Error('Frame time must be finite');
    const clampedTime = Math.min(
      normalizedSpec.clipEnd,
      Math.max(normalizedSpec.clipStart, timeMs),
    );
    return computeCompiledFrame(
      compiledTimeline,
      clampedTime,
      normalizedSpec.hierarchy,
      hierarchyOrder,
    );
  };

  return Object.freeze({
    spec: normalizedSpec,
    compiledTimeline,
    durationMs,
    frameCount,
    sampleCount,
    timeForFrame(index: number): number {
      assertFrameIndex(index, frameCount);
      return (
        normalizedSpec.clipStart + (index / frameCount) * durationMs
      );
    },
    sampleFrame(index: number): FrameState {
      assertFrameIndex(index, frameCount);
      return sampleAt(
        normalizedSpec.clipStart + (index / frameCount) * durationMs,
      );
    },
    sampleAt,
  });
}

export function serializeFrameState(frame: FrameState): SerializedFrameState {
  return [...frame.entries()].map(([targetId, state]) => [
    targetId,
    { ...state },
  ]);
}

export function deserializeFrameState(
  serialized: SerializedFrameState,
): FrameState {
  return new Map(
    serialized.map(([targetId, state]) => [targetId, { ...state }]),
  );
}

function validateSpec(spec: FrameSamplerSpec): void {
  if (
    !Number.isFinite(spec.clipStart) ||
    !Number.isFinite(spec.clipEnd) ||
    spec.clipStart < 0 ||
    spec.clipEnd <= spec.clipStart
  ) {
    throw new Error('Export clip range is invalid');
  }
  if (!Number.isFinite(spec.fps) || spec.fps <= 0) {
    throw new Error('Export FPS must be positive');
  }
}

function assertFrameIndex(index: number, frameCount: number): void {
  if (!Number.isInteger(index) || index < 0 || index > frameCount) {
    throw new RangeError(`Frame index must be between 0 and ${frameCount}`);
  }
}
