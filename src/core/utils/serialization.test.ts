// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { ProjectDocument } from '@excalimate/project-schema';
import type { AnimationProject } from '../../core/models/Project';
import { PROJECT_VERSION, createProject } from '../models/Project';
import {
  serializeProject,
  deserializeProject,
  isCompatibleVersion,
} from './serialization';

function createTestProject(
  overrides: Partial<AnimationProject> = {},
): AnimationProject {
  const base = createProject('Test Project', {
    elements: [],
    appState: {},
    files: {},
  });
  const project = { ...base, id: 'test-id', ...overrides };
  return {
    ...project,
    metadata: {
      ...project.metadata,
      id: project.id,
      name: project.name,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
  };
}

describe('serializeProject', () => {
  it('produces valid JSON', () => {
    const project = createTestProject();
    const json = serializeProject(project);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes version info', () => {
    const project = createTestProject();
    const json = serializeProject(project);
    const parsed = JSON.parse(json) as ProjectDocument;
    expect(parsed.version).toBe(PROJECT_VERSION);
  });

  it('preserves project fields', () => {
    const project = createTestProject({ name: 'My Animation' });
    const json = serializeProject(project);
    const parsed = JSON.parse(json) as ProjectDocument;
    expect(parsed.metadata.name).toBe('My Animation');
    expect(parsed.metadata.id).toBe('test-id');
    expect(parsed.playback.cameraFrame).toEqual(project.cameraFrame);
    expect('clipStart' in parsed).toBe(false);
  });
});

describe('deserializeProject', () => {
  it('roundtrips correctly', () => {
    const project = createTestProject();
    const json = serializeProject(project);
    const result = deserializeProject(json);
    expect(result).toEqual(project);
  });

  it('throws on invalid JSON', () => {
    expect(() => deserializeProject('not json!')).toThrow('Invalid JSON');
  });

  it('throws on non-object JSON', () => {
    expect(() => deserializeProject('"just a string"')).toThrow(
      'Unsupported project version',
    );
  });

  it('throws on missing version field', () => {
    const json = JSON.stringify({ id: 'x', name: 'y' });
    expect(() => deserializeProject(json)).toThrow(
      'Unsupported project version "missing"',
    );
  });

  it('throws on missing id field', () => {
    const project = createTestProject();
    const parsed = JSON.parse(serializeProject(project)) as ProjectDocument;
    const json = JSON.stringify({ ...parsed, metadata: { ...parsed.metadata, id: undefined } });
    expect(() => deserializeProject(json)).toThrow('metadata.id');
  });

  it('throws on missing name field', () => {
    const project = createTestProject();
    const parsed = JSON.parse(serializeProject(project)) as ProjectDocument;
    const json = JSON.stringify({ ...parsed, metadata: { ...parsed.metadata, name: 42 } });
    expect(() => deserializeProject(json)).toThrow('metadata.name');
  });

  it('throws on incompatible version', () => {
    const json = JSON.stringify({
      version: '99.0.0',
      id: 'x',
      name: 'y',
    });
    expect(() => deserializeProject(json)).toThrow('Unsupported');
  });
});

describe('isCompatibleVersion', () => {
  it('returns true for same major version', () => {
    expect(isCompatibleVersion('1.0.0', '1.2.3')).toBe(true);
  });

  it('returns true for exact same version', () => {
    expect(isCompatibleVersion('1.0.0', '1.0.0')).toBe(true);
  });

  it('returns false for different major version', () => {
    expect(isCompatibleVersion('2.0.0', '1.0.0')).toBe(false);
  });

  it('returns true for different minor and patch', () => {
    expect(isCompatibleVersion('1.5.9', '1.0.0')).toBe(true);
  });

  it('handles major version 0', () => {
    expect(isCompatibleVersion('0.1.0', '0.2.0')).toBe(true);
  });
});
