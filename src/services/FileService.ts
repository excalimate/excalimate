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
 * Load an MCP checkpoint file (.json from animate-excalidraw MCP server).
 * Returns scene data and animation timeline for import into the app.
 */
export async function loadMcpCheckpoint(): Promise<{
  scene: ExcalidrawSceneData;
  timeline: any;
  clipStart: number;
  clipEnd: number;
  cameraFrame: any;
}> {
  const file = await fileOpen({
    description: 'MCP Checkpoint files',
    extensions: ['.json'],
    mimeTypes: ['application/json'],
  });

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
