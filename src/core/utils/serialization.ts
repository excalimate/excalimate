import {
  decodeProjectDocument,
  encodeProjectDocument,
} from '@excalimate/project-schema';
import type { AnimationProject } from '../models/Project';
import {
  fromProjectDocument,
  toProjectDocument,
} from '../models/Project';

/** Serialize an app project as the canonical V2 document. */
export function serializeProject(project: AnimationProject): string {
  return encodeProjectDocument(toProjectDocument(project));
}

/** Deserialize and validate V2 documents or explicitly migrate V1 documents. */
export function deserializeProject(json: string): AnimationProject {
  return fromProjectDocument(decodeProjectDocument(json));
}

/** Retained for callers that compare semver major compatibility. */
export function isCompatibleVersion(
  version: string,
  currentVersion: string,
): boolean {
  const versionMajor = version.split('.')[0];
  const currentMajor = currentVersion.split('.')[0];
  return versionMajor === currentMajor;
}
