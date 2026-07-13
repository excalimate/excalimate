import type {
  ProjectDocument,
  V1ProjectDocument,
} from '@excalimate/project-schema';
import { migrateV1Project } from '@excalimate/project-schema';

export const SYNTHETIC_V1_PROJECT = {
  version: '1.0.0',
  id: 'synthetic-project',
  name: 'Synthetic animation',
  scene: {
    elements: [
      {
        id: 'synthetic-rectangle',
        type: 'rectangle',
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
    ],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  },
  timeline: {
    id: 'synthetic-timeline',
    name: 'Synthetic timeline',
    duration: 2_000,
    fps: 60,
    tracks: [
      {
        id: 'synthetic-opacity-track',
        targetId: 'synthetic-rectangle',
        targetType: 'element',
        property: 'opacity',
        enabled: true,
        keyframes: [
          {
            id: 'synthetic-keyframe-start',
            time: 0,
            value: 0,
            easing: 'linear',
          },
          {
            id: 'synthetic-keyframe-end',
            time: 1_000,
            value: 1,
            easing: 'linear',
          },
        ],
      },
    ],
  },
  clipStart: 100,
  clipEnd: 1_800,
  cameraFrame: {
    aspectRatio: '16:9',
    width: 1_200,
    x: 600,
    y: 337.5,
  },
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-02T00:00:00.000Z',
} satisfies V1ProjectDocument;

export function createSyntheticV2Project(): ProjectDocument {
  return {
    ...migrateV1Project(structuredClone(SYNTHETIC_V1_PROJECT)),
    authoring: {
      version: 1,
      documentRevision: 0,
      timelineRevision: 0,
      actions: [],
    },
    preferredWorkspace: 'sequence',
  };
}
