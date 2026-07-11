// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  PROJECT_LIMITS,
  PROJECT_VERSION,
  ProjectValidationError,
  assertInputByteLimit,
  decodeProjectDocument,
  encodeProjectDocument,
  migrateV1Project,
  parseProjectContent,
  parseProjectDocument,
} from '@excalimate/project-schema';
import { AnimationEngine } from '../engine/AnimationEngine';
import {
  SYNTHETIC_V1_PROJECT,
  createSyntheticV2Project,
} from '../../test-fixtures/projectDocuments';

describe('shared project schema contracts', () => {
  it('migrates V1 to V2 idempotently without changing rendered frames', () => {
    const before = new AnimationEngine().computeFrame(
      SYNTHETIC_V1_PROJECT.timeline,
      500,
    );
    const migrated = migrateV1Project(
      structuredClone(SYNTHETIC_V1_PROJECT),
    );
    const migratedAgain = migrateV1Project(structuredClone(migrated));
    const after = new AnimationEngine().computeFrame(migrated.timeline, 500);

    expect(migrated.version).toBe(PROJECT_VERSION);
    expect(migratedAgain).toEqual(migrated);
    expect(migrated.timeline).toEqual(SYNTHETIC_V1_PROJECT.timeline);
    expect([...after.entries()]).toEqual([...before.entries()]);
    expect(migrated.playback).toEqual({
      clipStart: 100,
      clipEnd: 1_800,
      cameraFrame: SYNTHETIC_V1_PROJECT.cameraFrame,
    });
  });

  it('round-trips the complete V2 document', () => {
    const project = createSyntheticV2Project();
    expect(decodeProjectDocument(encodeProjectDocument(project))).toEqual(
      project,
    );
  });

  it('normalizes safe defaults for legacy checkpoint/share payloads', () => {
    const content = parseProjectContent({
      scene: SYNTHETIC_V1_PROJECT.scene,
    });

    expect(content.timeline.tracks).toEqual([]);
    expect(content.playback.clipStart).toBe(0);
    expect(content.playback.clipEnd).toBe(content.timeline.duration);
    expect(content.playback.cameraFrame.aspectRatio).toBe('16:9');
  });

  it('rejects unsupported versions instead of guessing', () => {
    expect(() =>
      parseProjectDocument({
        ...createSyntheticV2Project(),
        version: '2.1.0',
      }),
    ).toThrow('Unsupported project version');
  });

  it.each([
    ['non-finite values', { path: ['timeline', 'tracks', 0, 'keyframes', 0, 'value'], value: Infinity }],
    ['overlong names', { path: ['metadata', 'name'], value: 'x'.repeat(PROJECT_LIMITS.maxNameLength + 1) }],
    ['excessive duration', { path: ['timeline', 'duration'], value: PROJECT_LIMITS.maxTimelineDurationMs + 1 }],
    ['invalid clip range', { path: ['playback', 'clipEnd'], value: 50 }],
    ['missing element reference', { path: ['timeline', 'tracks', 0, 'targetId'], value: 'missing-element' }],
  ])('rejects hostile %s', (_label, mutation) => {
    const project = createSyntheticV2Project();
    setPath(project, mutation.path, mutation.value);
    expect(() => parseProjectDocument(project)).toThrow(ProjectValidationError);
  });

  it('rejects missing file references', () => {
    const project = createSyntheticV2Project();
    project.scene.elements[0]['fileId'] = 'missing-file';
    expect(() => parseProjectDocument(project)).toThrow(
      'references missing file',
    );
  });

  it('does not accept inherited object names as file references', () => {
    const project = createSyntheticV2Project();
    project.scene.elements[0]['fileId'] = 'toString';
    expect(() => parseProjectDocument(project)).toThrow(
      'references missing file',
    );
  });

  it('allows the reserved synthetic camera animation target', () => {
    const project = createSyntheticV2Project();
    project.timeline.tracks[0].targetId = '__camera_frame__';
    expect(parseProjectDocument(project).timeline.tracks[0].targetId).toBe(
      '__camera_frame__',
    );
  });

  it('accepts finite Excalidraw epoch timestamps', () => {
    const project = createSyntheticV2Project();
    project.scene.elements[0]['updated'] = Date.now();
    expect(parseProjectDocument(project).scene.elements[0]['updated']).toBe(
      project.scene.elements[0]['updated'],
    );
  });

  it('preserves bounded keyframes and clips beyond declared duration', () => {
    const project = createSyntheticV2Project();
    project.timeline.duration = 500;
    project.playback.clipEnd = 1_800;
    const parsed = parseProjectDocument(project);
    expect(parsed.timeline.tracks[0].keyframes[1].time).toBe(1_000);
    expect(parsed.playback.clipEnd).toBe(1_800);
  });

  it('enforces scene count and encoded byte limits', () => {
    const project = createSyntheticV2Project();
    project.scene.elements = Array.from(
      { length: PROJECT_LIMITS.maxSceneElements + 1 },
      (_, index) => ({ id: `element-${index}`, type: 'rectangle' }),
    );
    expect(() => parseProjectDocument(project)).toThrow();
    expect(() =>
      assertInputByteLimit(PROJECT_LIMITS.maxInputBytes + 1),
    ).toThrow('limit');
  });

  it('rejects circular unknown metadata before schema parsing', () => {
    const project = createSyntheticV2Project();
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    project.authoring = circular;
    expect(() => parseProjectDocument(project)).toThrow(
      'circular reference',
    );
  });
});

function setPath(
  target: object,
  path: Array<string | number>,
  value: unknown,
): void {
  let current: Record<string | number, unknown> = target as Record<
    string | number,
    unknown
  >;
  for (const segment of path.slice(0, -1)) {
    current = current[segment] as Record<string | number, unknown>;
  }
  const finalSegment = path.at(-1);
  if (finalSegment !== undefined) current[finalSegment] = value;
}
