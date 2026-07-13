import {
  AnimationTimelineSchema,
  PROJECT_LIMITS,
  PROJECT_VERSION,
} from '@excalimate/project-schema';
import type { GroupHierarchy } from '@excalimate/animation-core';
import { sanitizeSvg } from './sanitize.js';
import { PLAYER_PACKAGE_LIMITS, PLAYER_PACKAGE_VERSION, PLAYER_RUNTIME_VERSION } from './types.js';
import type {
  PlayerCamera,
  PlayerDimensions,
  PlayerPackageV1,
  PlayerPosterMetadata,
} from './types.js';

const TOP_LEVEL_KEYS = new Set([
  'version',
  'runtimeVersion',
  'schemaVersion',
  'scene',
  'animation',
  'playback',
  'dimensions',
  'poster',
  'title',
  'attribution',
]);
const MAX_HIERARCHY_DEPTH = 64;
const ASPECT_RATIO_VALUES: Readonly<Record<PlayerDimensions['aspectRatio'], number>> =
  Object.freeze({
    '16:9': 16 / 9,
    '4:3': 4 / 3,
    '1:1': 1,
    '3:2': 3 / 2,
  });
const ASPECT_RATIO_TOLERANCE = 0.001;

export class PlayerPackageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlayerPackageValidationError';
  }
}

export const PlayerPackageV1Schema = Object.freeze({
  parse: parsePlayerPackage,
  safeParse(
    input: unknown,
  ):
    | { success: true; data: PlayerPackageV1 }
    | { success: false; error: PlayerPackageValidationError } {
    try {
      return { success: true, data: parsePlayerPackage(input) };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof PlayerPackageValidationError
            ? error
            : new PlayerPackageValidationError(errorMessage(error)),
      };
    }
  },
});

export function decodePlayerPackage(json: string): PlayerPackageV1 {
  assertByteLimit(json, PLAYER_PACKAGE_LIMITS.maxEncodedBytes, 'Player package');
  let input: unknown;
  try {
    input = JSON.parse(json);
  } catch {
    throw new PlayerPackageValidationError('Player package contains invalid JSON');
  }
  return parsePlayerPackage(input);
}

export function encodePlayerPackage(input: PlayerPackageV1): string {
  const validated = parsePlayerPackage(input);
  const json = JSON.stringify(validated);
  assertByteLimit(json, PLAYER_PACKAGE_LIMITS.maxEncodedBytes, 'Player package');
  return json;
}

export function parsePlayerPackage(input: unknown): PlayerPackageV1 {
  const record = strictRecord(input, TOP_LEVEL_KEYS, 'Player package');
  if (record['version'] !== PLAYER_PACKAGE_VERSION) {
    throw new PlayerPackageValidationError('Unsupported player package version');
  }
  if (record['runtimeVersion'] !== PLAYER_RUNTIME_VERSION) {
    throw new PlayerPackageValidationError('Unsupported player runtime version');
  }
  if (record['schemaVersion'] !== PROJECT_VERSION) {
    throw new PlayerPackageValidationError('Unsupported project schema version');
  }

  const scene = strictRecord(
    record['scene'],
    new Set(['svg', 'absoluteOpacityTargetIds']),
    'Player scene',
  );
  if (typeof scene['svg'] !== 'string') {
    throw new PlayerPackageValidationError('Player scene SVG is missing');
  }
  const sanitized = sanitizeSvg(scene['svg']);
  const absoluteOpacityTargetIds = parseIdentifierList(
    scene['absoluteOpacityTargetIds'],
    PLAYER_PACKAGE_LIMITS.maxAbsoluteOpacityTargets,
    'absolute opacity target',
  );

  const animation = strictRecord(
    record['animation'],
    new Set(['timeline', 'hierarchy']),
    'Player animation',
  );
  const timelineResult = AnimationTimelineSchema.safeParse(animation['timeline']);
  if (!timelineResult.success) {
    throw new PlayerPackageValidationError(
      `Invalid player timeline: ${timelineResult.error.issues[0]?.message ?? 'unknown error'}`,
    );
  }
  const hierarchy = parseHierarchy(animation['hierarchy']);

  const playback = strictRecord(
    record['playback'],
    new Set(['clipStart', 'clipEnd', 'camera']),
    'Player playback',
  );
  const clipStart = finiteNumber(playback['clipStart'], 'clipStart');
  const clipEnd = finiteNumber(playback['clipEnd'], 'clipEnd');
  if (clipStart < 0 || clipEnd <= clipStart || clipEnd > PROJECT_LIMITS.maxTimelineDurationMs) {
    throw new PlayerPackageValidationError('Player clip range is invalid');
  }
  const camera = parseCamera(playback['camera']);
  const dimensions = parseDimensions(record['dimensions']);
  if (camera.aspectRatio !== dimensions.aspectRatio) {
    throw new PlayerPackageValidationError('Camera and output aspect ratios differ');
  }
  assertNumericAspectRatio(
    camera.width,
    camera.height,
    camera.aspectRatio,
    'Player camera dimensions',
  );
  assertNumericAspectRatio(
    dimensions.width,
    dimensions.height,
    dimensions.aspectRatio,
    'Player output dimensions',
  );
  const poster = parsePoster(record['poster'], clipStart, clipEnd);
  const title = parseTitle(record['title']);
  parseAttribution(record['attribution']);

  const availableTargets = new Set(sanitized.elementIds);
  for (const targetId of absoluteOpacityTargetIds) {
    if (!availableTargets.has(targetId)) {
      throw new PlayerPackageValidationError(
        `Absolute opacity target "${targetId}" is missing from the SVG scene`,
      );
    }
  }
  const groupIds = new Set(Object.keys(hierarchy));
  for (const track of timelineResult.data.tracks) {
    if (
      track.targetType === 'element' &&
      track.targetId !== '__camera_frame__' &&
      !availableTargets.has(track.targetId)
    ) {
      throw new PlayerPackageValidationError(
        `Timeline target "${track.targetId}" is missing from the SVG scene`,
      );
    }
    if (track.targetType === 'group' && !groupIds.has(track.targetId)) {
      throw new PlayerPackageValidationError(
        `Timeline group "${track.targetId}" is missing from the hierarchy`,
      );
    }
  }

  return {
    version: PLAYER_PACKAGE_VERSION,
    runtimeVersion: PLAYER_RUNTIME_VERSION,
    schemaVersion: PROJECT_VERSION,
    scene: {
      svg: sanitized.svg,
      ...(absoluteOpacityTargetIds.length > 0 ? { absoluteOpacityTargetIds } : {}),
    },
    animation: {
      timeline: timelineResult.data,
      hierarchy,
    },
    playback: { clipStart, clipEnd, camera },
    dimensions,
    poster,
    ...(title ? { title } : {}),
    attribution: {
      label: 'Made with Excalimate',
      url: 'https://excalimate.com',
    },
  };
}

function parseIdentifierList(input: unknown, maximumLength: number, label: string): string[] {
  if (input === undefined) return [];
  if (!Array.isArray(input) || input.length > maximumLength) {
    throw new PlayerPackageValidationError(`Player ${label} list is invalid`);
  }
  const identifiers = input.map((value) => {
    if (typeof value !== 'string') {
      throw new PlayerPackageValidationError(`Player ${label} is invalid`);
    }
    assertIdentifier(value, label);
    return value;
  });
  if (new Set(identifiers).size !== identifiers.length) {
    throw new PlayerPackageValidationError(`Player ${label} list contains duplicates`);
  }
  return identifiers;
}

function parseHierarchy(input: unknown): GroupHierarchy {
  const record = strictRecord(input, undefined, 'Animation hierarchy');
  const entries = Object.entries(record);
  if (entries.length > PLAYER_PACKAGE_LIMITS.maxHierarchyGroups) {
    throw new PlayerPackageValidationError('Animation hierarchy has too many groups');
  }
  const hierarchy: GroupHierarchy = {};
  let memberCount = 0;
  for (const [groupId, members] of entries) {
    assertIdentifier(groupId, 'group ID');
    if (!Array.isArray(members)) {
      throw new PlayerPackageValidationError('Animation hierarchy members must be arrays');
    }
    const parsedMembers = members.map((member) => {
      if (typeof member !== 'string') {
        throw new PlayerPackageValidationError('Animation hierarchy member is invalid');
      }
      assertIdentifier(member, 'hierarchy member');
      return member;
    });
    if (new Set(parsedMembers).size !== parsedMembers.length) {
      throw new PlayerPackageValidationError('Animation hierarchy contains duplicate members');
    }
    memberCount += parsedMembers.length;
    hierarchy[groupId] = parsedMembers;
  }
  if (memberCount > PLAYER_PACKAGE_LIMITS.maxHierarchyMembers) {
    throw new PlayerPackageValidationError('Animation hierarchy has too many members');
  }
  validateHierarchy(hierarchy);
  return hierarchy;
}

function validateHierarchy(hierarchy: GroupHierarchy): void {
  const parentByGroup = new Map<string, string>();
  for (const [groupId, members] of Object.entries(hierarchy)) {
    for (const memberId of members) {
      if (!(memberId in hierarchy)) continue;
      const parentId = parentByGroup.get(memberId);
      if (parentId && parentId !== groupId) {
        throw new PlayerPackageValidationError(
          `Animation group "${memberId}" has multiple parents`,
        );
      }
      parentByGroup.set(memberId, groupId);
    }
  }

  const state = new Map<string, 'visiting' | 'visited'>();
  const visit = (groupId: string, depth: number): void => {
    if (depth > MAX_HIERARCHY_DEPTH) {
      throw new PlayerPackageValidationError('Animation hierarchy exceeds the depth limit');
    }
    const currentState = state.get(groupId);
    if (currentState === 'visiting') {
      throw new PlayerPackageValidationError('Animation hierarchy contains a cycle');
    }
    if (currentState === 'visited') return;
    state.set(groupId, 'visiting');
    for (const memberId of hierarchy[groupId] ?? []) {
      if (memberId in hierarchy) visit(memberId, depth + 1);
    }
    state.set(groupId, 'visited');
  };

  for (const groupId of Object.keys(hierarchy)) {
    visit(groupId, 1);
  }
}

function parseCamera(input: unknown): PlayerCamera {
  const record = strictRecord(
    input,
    new Set(['aspectRatio', 'width', 'height', 'x', 'y', 'sceneOffsetX', 'sceneOffsetY']),
    'Player camera',
  );
  const aspectRatio = parseAspectRatio(record['aspectRatio']);
  const camera = {
    aspectRatio,
    width: finiteNumber(record['width'], 'camera width'),
    height: finiteNumber(record['height'], 'camera height'),
    x: finiteNumber(record['x'], 'camera x'),
    y: finiteNumber(record['y'], 'camera y'),
    sceneOffsetX: finiteNumber(record['sceneOffsetX'], 'scene offset x'),
    sceneOffsetY: finiteNumber(record['sceneOffsetY'], 'scene offset y'),
  };
  if (camera.width <= 0 || camera.height <= 0) {
    throw new PlayerPackageValidationError('Player camera dimensions must be positive');
  }
  return camera;
}

function parseDimensions(input: unknown): PlayerDimensions {
  const record = strictRecord(
    input,
    new Set(['width', 'height', 'aspectRatio']),
    'Player dimensions',
  );
  const dimensions = {
    width: finiteNumber(record['width'], 'output width'),
    height: finiteNumber(record['height'], 'output height'),
    aspectRatio: parseAspectRatio(record['aspectRatio']),
  };
  if (
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > 16_384 ||
    dimensions.height > 16_384
  ) {
    throw new PlayerPackageValidationError('Player output dimensions are invalid');
  }
  return dimensions;
}

function parsePoster(input: unknown, clipStart: number, clipEnd: number): PlayerPosterMetadata {
  const record = strictRecord(input, new Set(['kind', 'timeMs']), 'Player poster metadata');
  const timeMs = finiteNumber(record['timeMs'], 'poster time');
  if (record['kind'] !== 'frame' || timeMs < clipStart || timeMs > clipEnd) {
    throw new PlayerPackageValidationError('Player poster metadata is invalid');
  }
  return { kind: 'frame', timeMs };
}

function parseTitle(input: unknown): string | undefined {
  if (input === undefined) return undefined;
  if (typeof input !== 'string') {
    throw new PlayerPackageValidationError('Player title must be text');
  }
  const title = input.trim();
  if (
    title.length === 0 ||
    title.length > PLAYER_PACKAGE_LIMITS.maxTitleLength ||
    [...title].some((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127;
    })
  ) {
    throw new PlayerPackageValidationError('Player title is invalid');
  }
  return title;
}

function parseAttribution(input: unknown): void {
  const record = strictRecord(input, new Set(['label', 'url']), 'Player attribution');
  if (record['label'] !== 'Made with Excalimate' || record['url'] !== 'https://excalimate.com') {
    throw new PlayerPackageValidationError('Player attribution metadata is invalid');
  }
}

function parseAspectRatio(input: unknown): PlayerDimensions['aspectRatio'] {
  if (input === '16:9' || input === '4:3' || input === '1:1' || input === '3:2') {
    return input;
  }
  throw new PlayerPackageValidationError('Player aspect ratio is invalid');
}

function assertNumericAspectRatio(
  width: number,
  height: number,
  aspectRatio: PlayerDimensions['aspectRatio'],
  label: string,
): void {
  const expected = ASPECT_RATIO_VALUES[aspectRatio];
  const relativeError = Math.abs(width / height - expected) / expected;
  if (relativeError > ASPECT_RATIO_TOLERANCE) {
    throw new PlayerPackageValidationError(`${label} do not match ${aspectRatio}`);
  }
}

function strictRecord(
  input: unknown,
  allowedKeys: ReadonlySet<string> | undefined,
  label: string,
): Record<string, unknown> {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Object.prototype
  ) {
    throw new PlayerPackageValidationError(`${label} must be an object`);
  }
  const record = input as Record<string, unknown>;
  if (allowedKeys) {
    for (const key of Object.keys(record)) {
      if (!allowedKeys.has(key)) {
        throw new PlayerPackageValidationError(`${label} contains unknown fields`);
      }
    }
  }
  return record;
}

function finiteNumber(input: unknown, label: string): number {
  if (
    typeof input !== 'number' ||
    !Number.isFinite(input) ||
    Math.abs(input) > PROJECT_LIMITS.maxAnimationValue
  ) {
    throw new PlayerPackageValidationError(`${label} is invalid`);
  }
  return input;
}

function assertIdentifier(input: string, label: string): void {
  if (input.length === 0 || input.length > PROJECT_LIMITS.maxIdentifierLength) {
    throw new PlayerPackageValidationError(`${label} is invalid`);
  }
}

function assertByteLimit(value: string, limit: number, label: string): void {
  if (new TextEncoder().encode(value).byteLength > limit) {
    throw new PlayerPackageValidationError(`${label} exceeds the size limit`);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Invalid player package';
}
