import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import type { ServerState } from '../types.js';

export interface ResourceLimits {
  maxElements: number;
  maxTracks: number;
  maxKeyframesPerTrack: number;
  maxTotalKeyframes: number;
  maxBatchItems: number;
  maxStringLength: number;
  maxTimeMs: number;
  maxStateBytes: number;
  maxObjectDepth: number;
  maxMutationsPerWindow: number;
  mutationWindowMs: number;
}

export const DEFAULT_RESOURCE_LIMITS: Readonly<ResourceLimits> = {
  maxElements: 2_000,
  maxTracks: 2_000,
  maxKeyframesPerTrack: 1_000,
  maxTotalKeyframes: 20_000,
  maxBatchItems: 2_000,
  maxStringLength: 100_000,
  maxTimeMs: 24 * 60 * 60 * 1_000,
  maxStateBytes: 10 * 1024 * 1024,
  maxObjectDepth: 32,
  maxMutationsPerWindow: 240,
  mutationWindowMs: 60_000,
};

export function mergeResourceLimits(overrides: Partial<ResourceLimits> = {}): ResourceLimits {
  const limits = { ...DEFAULT_RESOURCE_LIMITS, ...overrides };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new Error(`Invalid resource limit: ${name}`);
    }
  }
  return limits;
}

export function invalidInput(message: string): never {
  throw new McpError(ErrorCode.InvalidParams, message);
}

function assertNestedValue(
  value: unknown,
  limits: ResourceLimits,
  path: string,
  depth: number,
): void {
  if (depth > limits.maxObjectDepth) {
    invalidInput(`${path} exceeds the maximum nesting depth`);
  }
  if (typeof value === 'string' && value.length > limits.maxStringLength) {
    invalidInput(`${path} exceeds the maximum string length`);
  }
  if (Array.isArray(value)) {
    if (value.length > limits.maxBatchItems) {
      invalidInput(`${path} exceeds the maximum array length`);
    }
    value.forEach((entry, index) => assertNestedValue(entry, limits, `${path}[${index}]`, depth + 1));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      assertNestedValue(entry, limits, `${path}.${key}`, depth + 1);
    }
  }
}

export function assertInputWithinLimits(input: unknown, limits: ResourceLimits): void {
  assertNestedValue(input, limits, 'input', 0);
}

export function countTotalKeyframes(state: ServerState): number {
  return state.timeline.tracks.reduce(
    (total, track) => total + track.keyframes.length,
    0,
  );
}

export function assertAdditionalKeyframes(
  state: ServerState,
  additionalCount: number,
  limits: ResourceLimits,
): void {
  if (
    !Number.isSafeInteger(additionalCount) ||
    additionalCount < 0 ||
    countTotalKeyframes(state) + additionalCount > limits.maxTotalKeyframes
  ) {
    invalidInput(`Timeline exceeds the ${limits.maxTotalKeyframes} total keyframe limit`);
  }
}

export function assertStateWithinLimits(state: ServerState, limits: ResourceLimits): void {
  if (state.scene.elements.length > limits.maxElements) {
    invalidInput(`Scene exceeds the ${limits.maxElements} element limit`);
  }
  if (state.timeline.tracks.length > limits.maxTracks) {
    invalidInput(`Timeline exceeds the ${limits.maxTracks} track limit`);
  }

  let totalKeyframes = 0;
  for (const track of state.timeline.tracks) {
    if (track.keyframes.length > limits.maxKeyframesPerTrack) {
      invalidInput(`Track "${track.id}" exceeds the keyframe limit`);
    }
    totalKeyframes += track.keyframes.length;
    for (const keyframe of track.keyframes) {
      if (!Number.isFinite(keyframe.time) || keyframe.time < 0 || keyframe.time > limits.maxTimeMs) {
        invalidInput(`Keyframe time must be between 0 and ${limits.maxTimeMs}ms`);
      }
      if (!Number.isFinite(keyframe.value)) {
        invalidInput('Keyframe values must be finite numbers');
      }
    }
  }
  if (totalKeyframes > limits.maxTotalKeyframes) {
    invalidInput(`Timeline exceeds the ${limits.maxTotalKeyframes} total keyframe limit`);
  }

  const timeValues = [
    state.timeline.duration,
    state.clipStart,
    state.clipEnd,
  ];
  if (timeValues.some((value) => !Number.isFinite(value) || value < 0 || value > limits.maxTimeMs)) {
    invalidInput(`Timeline times must be between 0 and ${limits.maxTimeMs}ms`);
  }

  assertNestedValue(state, limits, 'state', 0);
  if (Buffer.byteLength(JSON.stringify(state), 'utf8') > limits.maxStateBytes) {
    invalidInput(`Project state exceeds the ${limits.maxStateBytes} byte limit`);
  }
}

export function parseLegacyArray<T>(
  value: string | T[],
  schema: z.ZodType<T[]>,
  label: string,
  limits: ResourceLimits,
): { value: T[]; legacy: boolean } {
  if (Array.isArray(value)) {
    return { value, legacy: false };
  }
  if (Buffer.byteLength(value, 'utf8') > limits.maxStateBytes) {
    invalidInput(`${label} JSON exceeds the input size limit`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    invalidInput(`${label} must be valid JSON`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issue = result.error.issues[0];
    const path = issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
    invalidInput(`Invalid ${label}${path}: ${issue.message}`);
  }
  return { value: result.data, legacy: true };
}

export function legacyDeprecation(label: string, legacy: boolean): string {
  return legacy
    ? ` Deprecated: pass ${label} as a nested array instead of a JSON-encoded string.`
    : '';
}

export function boundedString(limits: ResourceLimits) {
  return z.string().min(1).max(limits.maxStringLength);
}

export function boundedTime(limits: ResourceLimits) {
  return z.number().finite().min(0).max(limits.maxTimeMs);
}
