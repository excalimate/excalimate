import { fileOpen, fileSave } from 'browser-fs-access';
import type { ExcalidrawSceneData } from '../types/excalidraw';
import type { AnimationProject } from '../core/models/Project';
import {
  serializeProject,
  deserializeProject,
} from '../core/utils/serialization';
import { loadScene } from '../vendor/loadScene';
import { parseExcalidrawUrl } from '../vendor/parseUrl';

/**
 * Import an Excalidraw file (.excalidraw or .json)
 */
export async function importExcalidrawFile(): Promise<ExcalidrawSceneData> {
  const file = await fileOpen({
    description: 'Excalidraw files',
    extensions: ['.excalidraw', '.json'],
    mimeTypes: ['application/json'],
  });

  const text = await file.text();
  const data = JSON.parse(text);

  // Validate it has Excalidraw structure
  if (!data.elements || !Array.isArray(data.elements)) {
    throw new Error('Invalid Excalidraw file: missing elements array');
  }

  return {
    elements: data.elements,
    appState: data.appState ?? {},
    files: data.files ?? {},
  };
}

/**
 * Parse an Excalidraw file from a File/Blob object (for drag & drop / programmatic import).
 */
export async function parseExcalidrawFileBlob(file: File): Promise<ExcalidrawSceneData> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.elements || !Array.isArray(data.elements)) {
    throw new Error('Invalid Excalidraw file: missing elements array');
  }

  return {
    elements: data.elements,
    appState: data.appState ?? {},
    files: data.files ?? {},
  };
}

/**
 * Save an animation project to .excanim file
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
 * Load an animation project from .excanim file
 */
export async function loadProjectFile(): Promise<AnimationProject> {
  const file = await fileOpen({
    description: 'Excalidraw Animation files',
    extensions: ['.excanim', '.json'],
    mimeTypes: ['application/json'],
  });

  const text = await file.text();
  return deserializeProject(text);
}

/**
 * Parse an animation project from a File/Blob (for drag & drop).
 */
export async function parseProjectFileBlob(file: File): Promise<AnimationProject> {
  const text = await file.text();
  return deserializeProject(text);
}

/**
 * Load an MCP checkpoint file (.json from Excalimate MCP server).
 * Returns scene data and animation timeline for import into the app.
 */
export async function loadMcpCheckpoint(): Promise<McpCheckpointData> {
  const file = await fileOpen({
    description: 'MCP Checkpoint files',
    extensions: ['.json'],
    mimeTypes: ['application/json'],
  });

  return parseMcpCheckpointBlob(file);
}

export interface McpCheckpointData {
  scene: ExcalidrawSceneData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline: any;
  clipStart: number;
  clipEnd: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cameraFrame: any;
}

/**
 * Parse an MCP checkpoint from a File/Blob (for drag & drop).
 */
export async function parseMcpCheckpointBlob(file: File): Promise<McpCheckpointData> {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.scene?.elements) {
    throw new Error('Invalid checkpoint: missing scene.elements');
  }

  return {
    scene: {
      elements: data.scene.elements,
      appState: data.scene.appState ?? {},
      files: data.scene.files ?? {},
    },
    timeline: data.timeline ?? null,
    clipStart: data.clipStart ?? 0,
    clipEnd: data.clipEnd ?? 10000,
    cameraFrame: data.cameraFrame ?? null,
  };
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

  if (!data.elements || data.elements.length === 0) {
    throw new Error('The shared scene contains no elements.');
  }

  return {
    elements: data.elements,
    appState: data.appState ?? {},
    files: data.files ?? {},
  };
}

export { parseExcalidrawUrl } from '../vendor/parseUrl';

export interface SharedAnimationData {
  scene: ExcalidrawSceneData;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  timeline?: any;
  clipStart?: number;
  clipEnd?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cameraFrame?: any;
}

/**
 * Load a shared animation from an E2E encrypted share URL.
 * Format: https://excalimate.com/#share=ID,KEY
 */
export async function loadShareUrl(shareUrl: string): Promise<SharedAnimationData> {
  // Lazy import to avoid pulling crypto into the main bundle
  const { importKeyFromString, decryptData } = await import('./encryption');

  // Parse the URL — accept full URLs or just the hash fragment
  let shareId: string;
  let keyStr: string;

  const hashMatch = shareUrl.match(/#share=([^,]+),(.+)/);
  if (hashMatch) {
    shareId = hashMatch[1];
    keyStr = hashMatch[2];
  } else {
    // Try as raw "ID,KEY"
    const parts = shareUrl.split(',');
    if (parts.length >= 2) {
      shareId = parts[0].trim();
      keyStr = parts[1].trim();
    } else {
      throw new Error('Invalid share URL. Expected format: https://.../#share=ID,KEY');
    }
  }

  const serverUrl = import.meta.env.VITE_MCP_SERVER_URL ?? 'http://localhost:3001';
  const response = await fetch(`${serverUrl}/share/${shareId}`);
  if (!response.ok) throw new Error('Shared animation not found.');
  const encrypted = await response.arrayBuffer();
  const key = await importKeyFromString(keyStr);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = await decryptData<any>(encrypted, key);

  if (!data.scene?.elements) {
    throw new Error('Invalid shared data: missing scene elements.');
  }

  return {
    scene: {
      elements: data.scene.elements,
      appState: data.scene.appState ?? {},
      files: data.scene.files ?? {},
    },
    timeline: data.timeline,
    clipStart: data.clipStart,
    clipEnd: data.clipEnd,
    cameraFrame: data.cameraFrame,
  };
}
