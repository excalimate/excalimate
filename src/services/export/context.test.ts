import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { describe, expect, it } from 'vitest';
import { createSyntheticV2Project } from '../../test-fixtures/projectDocuments';
import { preflightSnapshot } from './context';
import type { ExportSnapshot } from './context';

describe('export context preflight', () => {
  it('uses the independent vertical scale for Lottie raster budgets', async () => {
    const project = createSyntheticV2Project();
    project.playback.cameraFrame = {
      ...project.playback.cameraFrame,
      aspectRatio: '1:1',
      width: 100,
    };
    project.timeline.tracks = [];
    const image = {
      ...project.scene.elements[0],
      id: 'tall-image',
      type: 'image',
      width: 100,
      height: 500,
    } as NonDeletedExcalidrawElement;
    const snapshot: ExportSnapshot = {
      project,
      projectName: 'Vertical scale',
      targets: [],
      elements: [image],
      files: {},
      width: 100,
      height: 10_000,
      fps: 30,
      options: { format: 'lottie' },
    };

    const result = await preflightSnapshot(snapshot);

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'lottie-raster-budget-exceeded',
        severity: 'error',
      }),
    );
  });

  it('warns when a format cannot carry attached audio', async () => {
    const project = createSyntheticV2Project();
    project.audio = {
      fileName: 'narration.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 3,
      durationMs: 1_000,
      dataUrl: 'data:audio/mpeg;base64,AQID',
    };
    const snapshot: ExportSnapshot = {
      project,
      projectName: 'Audio fallback',
      targets: [],
      elements: [],
      files: {},
      width: 100,
      height: 100,
      fps: 30,
      options: { format: 'gif' },
    };

    const result = await preflightSnapshot(snapshot);

    expect(result.issues).toContainEqual({
      code: 'audio-unsupported-format',
      severity: 'warning',
      message: 'Attached audio is included only in MP4 and WebM exports.',
    });
  });

  it('blocks video export when attached audio cannot be encoded', async () => {
    const project = createSyntheticV2Project();
    project.audio = {
      fileName: 'narration.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 3,
      durationMs: 1_000,
      dataUrl: 'data:audio/mpeg;base64,AQID',
    };
    const snapshot: ExportSnapshot = {
      project,
      projectName: 'Audio capability',
      targets: [],
      elements: [],
      files: {},
      width: 100,
      height: 100,
      fps: 30,
      options: { format: 'mp4' },
    };

    const result = await preflightSnapshot(snapshot);

    expect(result.supported).toBe(false);
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        code: 'audio-encoder-unavailable',
        severity: 'error',
      }),
    );
  });
});
