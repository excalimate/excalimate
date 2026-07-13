import {
  parsePlayerPackage,
} from '@excalimate/player-runtime';
import type {
  PlayerPackageV1,
} from '@excalimate/player-runtime';
import type {
  ProjectDocument,
} from '@excalimate/project-schema';

export const SHARE_ENVELOPE_VERSION = 2 as const;

export interface ShareEnvelopeV2 {
  envelopeVersion: typeof SHARE_ENVELOPE_VERSION;
  project: ProjectDocument;
  playerPackage: PlayerPackageV1;
}

export interface ParsedShareEnvelope {
  project: unknown;
  playerPackage: PlayerPackageV1 | null;
  legacy: boolean;
}

export function createShareEnvelope(
  project: ProjectDocument,
  playerPackage: PlayerPackageV1,
): ShareEnvelopeV2 {
  return {
    envelopeVersion: SHARE_ENVELOPE_VERSION,
    project,
    playerPackage: parsePlayerPackage(playerPackage),
  };
}

export function parseShareEnvelope(input: unknown): ParsedShareEnvelope {
  if (!isRecord(input) || input['envelopeVersion'] === undefined) {
    return { project: input, playerPackage: null, legacy: true };
  }
  if (
    input['envelopeVersion'] !== SHARE_ENVELOPE_VERSION ||
    !hasExactKeys(input, ['envelopeVersion', 'project', 'playerPackage'])
  ) {
    throw new Error('Unsupported encrypted share envelope');
  }
  return {
    project: input['project'],
    playerPackage: parsePlayerPackage(input['playerPackage']),
    legacy: false,
  };
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function hasExactKeys(
  input: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(input).sort();
  return (
    keys.length === expected.length &&
    [...expected].sort().every((key, index) => key === keys[index])
  );
}
