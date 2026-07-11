import { beforeEach, describe, expect, it } from 'vitest';
import { useAnimationStore } from '../stores/animationStore';
import { useProjectStore } from '../stores/projectStore';
import { createSyntheticV2Project } from '../test-fixtures/projectDocuments';
import {
  captureProjectDocument,
  loadProjectDocumentIntoStores,
} from './ProjectDocumentService';

describe('ProjectDocumentService', () => {
  beforeEach(() => {
    useProjectStore.setState({
      project: null,
      targets: [],
      isDirty: false,
      cameraFrame: {
        aspectRatio: '16:9',
        width: 1280,
        x: 640,
        y: 360,
      },
    });
  });

  it('round-trips timeline, short clips, and camera without store normalization', () => {
    const document = createSyntheticV2Project();
    document.timeline = {
      ...document.timeline,
      duration: 50,
      tracks: [],
    };
    document.playback = {
      clipStart: 0,
      clipEnd: 50,
      cameraFrame: {
        aspectRatio: '1:1',
        width: 500,
        x: 120,
        y: 80,
      },
    };

    loadProjectDocumentIntoStores(document, {
      activateAnimationMode: false,
    });
    const captured = captureProjectDocument();

    expect(useAnimationStore.getState().clipEnd).toBe(50);
    expect(captured?.timeline).toEqual(document.timeline);
    expect(captured?.playback).toEqual(document.playback);
  });
});
