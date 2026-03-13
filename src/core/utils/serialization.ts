import type { AnimationProject } from '../../types';
import { PROJECT_VERSION } from '../models/Project';

/** Serialize a project to JSON string with version info */
export function serializeProject(project: AnimationProject): string {
  return JSON.stringify({ ...project, version: PROJECT_VERSION });
}

/** Deserialize a project from JSON string, with version checking */
export function deserializeProject(json: string): AnimationProject {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: failed to parse project data');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid project data: expected an object');
  }

  const obj = parsed as Record<string, unknown>;

  if (typeof obj['version'] !== 'string') {
    throw new Error('Invalid project data: missing "version" field');
  }
  if (typeof obj['id'] !== 'string') {
    throw new Error('Invalid project data: missing "id" field');
  }
  if (typeof obj['name'] !== 'string') {
    throw new Error('Invalid project data: missing "name" field');
  }

  if (!isCompatibleVersion(obj['version'] as string, PROJECT_VERSION)) {
    throw new Error(
      `Incompatible project version: "${obj['version']}" is not compatible with current version "${PROJECT_VERSION}"`,
    );
  }

  return parsed as AnimationProject;
}

/** Check if a version string is compatible (semver major must match) */
export function isCompatibleVersion(
  version: string,
  currentVersion: string,
): boolean {
  const versionMajor = version.split('.')[0];
  const currentMajor = currentVersion.split('.')[0];
  return versionMajor === currentMajor;
}
