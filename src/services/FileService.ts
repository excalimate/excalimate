import { fileOpen, fileSave } from 'browser-fs-access';
import {
  PROJECT_LIMITS,
  ProjectSceneSchema,
  assertInputByteLimit,
  decodeProjectContent,
  parseProjectContent,
} from '@excalimate/project-schema';
import type { ProjectScene } from '@excalimate/project-schema';
import type { ExcalidrawSceneData } from '../types/excalidraw';
import type { AnimationProject } from '../core/models/Project';
import {
  createProjectFromContent,
} from '../core/models/Project';
import {
  serializeProject,
  deserializeProject,
} from '../core/utils/serialization';
import { loadScene } from '../vendor/loadScene';
import { parseExcalidrawUrl } from '../vendor/parseUrl';

/**
 * Import an Excalidraw file (.excalidraw or .json).
 */
export async function importExcalidrawFile(): Promise<ExcalidrawSceneData> {
  const file = await fileOpen({
    description: 'Excalidraw files',
    extensions: ['.excalidraw', '.json'],
    mimeTypes: ['application/json'],
  });
  return parseExcalidrawFileBlob(file);
}

/**
 * Parse an Excalidraw file from a File/Blob object.
 */
export async function parseExcalidrawFileBlob(
  file: Blob,
): Promise<ExcalidrawSceneData> {
  const data = parseJson(
    await readBlobText(file, 'Excalidraw file'),
    'Excalidraw file',
  );
  return fromProjectScene(parseScene(data, 'Invalid Excalidraw file'));
}

/**
 * Save an animation project to a canonical V2 .excanim file.
 */
export async function saveProjectFile(
  project: AnimationProject,
): Promise<void> {
  const json = serializeProject(project);
  const blob = new Blob([json], { type: 'application/json' });

  await fileSave(blob, {
    fileName: `${project.name || 'animation'}.excanim`,
    description: 'Excalidraw Animation files',
    extensions: ['.excanim'],
  });
}

/**
 * Load an animation project from .excanim file.
 */
export async function loadProjectFile(): Promise<AnimationProject> {
  const file = await fileOpen({
    description: 'Excalidraw Animation files',
    extensions: ['.excanim', '.json'],
    mimeTypes: ['application/json'],
  });

  return parseProjectFileBlob(file);
}

/**
 * Parse an animation project from a File/Blob.
 */
export async function parseProjectFileBlob(
  file: Blob,
): Promise<AnimationProject> {
  return deserializeProject(await readBlobText(file, 'Project file'));
}

/**
 * Load an MCP checkpoint file and normalize it into a V2 project.
 */
export async function loadMcpCheckpoint(): Promise<McpCheckpointData> {
  const file = await fileOpen({
    description: 'MCP Checkpoint files',
    extensions: ['.json'],
    mimeTypes: ['application/json'],
  });

  return parseMcpCheckpointBlob(file);
}

export type McpCheckpointData = AnimationProject;

/**
 * Parse an MCP checkpoint from a File/Blob.
 */
export async function parseMcpCheckpointBlob(
  file: Blob,
): Promise<McpCheckpointData> {
  const content = decodeProjectContent(
    await readBlobText(file, 'MCP checkpoint'),
  );
  return createProjectFromContent('MCP Checkpoint', content);
}

/**
 * Import an Excalidraw scene from a sharing URL.
 * Supports: https://excalidraw.com/#json=ID,KEY
 */
export async function importFromUrl(url: string): Promise<ExcalidrawSceneData> {
  const parsed = parseExcalidrawUrl(url);
  if (!parsed) {
    throw new Error(
      'Invalid URL format. Expected: https://excalidraw.com/#json=ID,KEY',
    );
  }

  const data = await loadScene(parsed.id, parsed.key);
  const scene = parseScene(data, 'Invalid shared Excalidraw scene');
  if (scene.elements.length === 0) {
    throw new Error('The shared scene contains no elements.');
  }
  return fromProjectScene(scene);
}

export { parseExcalidrawUrl } from '../vendor/parseUrl';

export type SharedAnimationData = AnimationProject;

/**
 * Load an E2E encrypted share and normalize V1, V2, or legacy transfer data.
 */
export async function loadShareUrl(
  shareUrl: string,
): Promise<SharedAnimationData> {
  const { importKeyFromString, decryptData } = await import('./encryption');
  const { shareId, keyString } = parseShareReference(shareUrl);
  const shareApiUrl =
    import.meta.env.VITE_SHARE_API_URL ?? 'https://share.excalimate.com';
  const response = await fetch(
    `${shareApiUrl}/share/${encodeURIComponent(shareId)}`,
  );
  if (!response.ok) throw new Error('Shared animation not found.');

  const encrypted = await readResponseBytes(response, 'Encrypted share');
  const key = await importKeyFromString(keyString);
  const data = await decryptData(encrypted, key);
  const content = parseProjectContent(data);
  return createProjectFromContent('Shared Animation', content);
}

async function readBlobText(blob: Blob, label: string): Promise<string> {
  assertInputByteLimit(blob.size, PROJECT_LIMITS.maxInputBytes, label);
  const text = await blob.text();
  assertInputByteLimit(
    new TextEncoder().encode(text).byteLength,
    PROJECT_LIMITS.maxInputBytes,
    label,
  );
  return text;
}

async function readResponseBytes(
  response: Response,
  label: string,
): Promise<ArrayBuffer> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const byteLength = Number(declaredLength);
    assertInputByteLimit(byteLength, PROJECT_LIMITS.maxInputBytes, label);
  }

  if (!response.body) {
    const buffer = await response.arrayBuffer();
    assertInputByteLimit(
      buffer.byteLength,
      PROJECT_LIMITS.maxInputBytes,
      label,
    );
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > PROJECT_LIMITS.maxInputBytes) {
      await reader.cancel();
      throw new Error(`${label} exceeds the download limit`);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

function parseShareReference(shareUrl: string): {
  shareId: string;
  keyString: string;
} {
  const hashMatch = shareUrl.match(/#share=([^,]+),([^&\s]+)/);
  const rawParts = hashMatch
    ? [hashMatch[1], hashMatch[2]]
    : shareUrl.split(',', 2);
  const shareId = rawParts[0]?.trim();
  const keyString = rawParts[1]?.trim();

  if (
    !shareId ||
    !keyString ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(shareId) ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(keyString)
  ) {
    throw new Error(
      'Invalid share URL. Expected format: https://.../#share=ID,KEY',
    );
  }
  return { shareId, keyString };
}

function parseJson(text: string, label: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} contains invalid JSON`);
  }
}

function parseScene(input: unknown, label: string): ProjectScene {
  if (typeof input !== 'object' || input === null) {
    throw new Error(`${label}: expected an object`);
  }
  const record = input as Record<string, unknown>;
  const result = ProjectSceneSchema.safeParse({
    elements: record['elements'],
    appState: record['appState'] ?? {},
    files: record['files'] ?? {},
  });
  if (!result.success) {
    throw new Error(`${label}: ${result.error.issues[0]?.message}`);
  }
  return result.data;
}

function fromProjectScene(scene: ProjectScene): ExcalidrawSceneData {
  return {
    elements: scene.elements as unknown as ExcalidrawSceneData['elements'],
    appState: scene.appState as ExcalidrawSceneData['appState'],
    files: scene.files as ExcalidrawSceneData['files'],
  };
}
