// @vitest-environment node
import { describe, it, expect } from 'vitest';
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
  return { ...base, id: 'test-id', ...overrides };
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
    const parsed = JSON.parse(json) as AnimationProject;
    expect(parsed.version).toBe(PROJECT_VERSION);
  });

  it('preserves project fields', () => {
    const project = createTestProject({ name: 'My Animation' });
    const json = serializeProject(project);
    const parsed = JSON.parse(json) as AnimationProject;
    expect(parsed.name).toBe('My Animation');
    expect(parsed.id).toBe('test-id');
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
      'expected an object',
    );
  });

  it('throws on missing version field', () => {
    const json = JSON.stringify({ id: 'x', name: 'y' });
    expect(() => deserializeProject(json)).toThrow('missing "version"');
  });

  it('throws on missing id field', () => {
    const json = JSON.stringify({ version: PROJECT_VERSION, name: 'y' });
    expect(() => deserializeProject(json)).toThrow('missing "id"');
  });

  it('throws on missing name field', () => {
    const json = JSON.stringify({ version: PROJECT_VERSION, id: 'x' });
    expect(() => deserializeProject(json)).toThrow('missing "name"');
  });

  it('throws on incompatible version', () => {
    const json = JSON.stringify({
      version: '99.0.0',
      id: 'x',
      name: 'y',
    });
    expect(() => deserializeProject(json)).toThrow('Incompatible');
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
