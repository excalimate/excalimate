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
});
