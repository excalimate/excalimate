import { describe, expect, it } from 'vitest';
import {
  AnimationActionSchema,
  PROJECT_VERSION,
  ProjectValidationError,
  parseProjectDocument,
} from './index.js';

function baseProject() {
  return {
    version: PROJECT_VERSION,
    metadata: {
      id: 'project',
      name: 'Project',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    scene: {
      elements: [
        { id: 'image', type: 'image', fileId: 'shared-image' },
        { id: 'node', type: 'rectangle' },
      ],
      appState: {},
      files: {
        'shared-image': {
          mimeType: 'image/png',
          dataURL: 'data:image/png;base64,AA==',
        },
      },
    },
    timeline: {
      id: 'timeline',
      name: 'Timeline',
      duration: 5_000,
      fps: 60,
      tracks: [],
    },
    playback: {
      clipStart: 0,
      clipEnd: 5_000,
      cameraFrame: {
        aspectRatio: '16:9',
        width: 1_280,
        x: 640,
        y: 360,
      },
    },
  };
}

function snapshot(id: string, present: boolean) {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    elements: [
      {
        id: 'image',
        type: 'image',
        x: 10,
        y: 20,
        width: 100,
        height: 80,
        angle: 0,
        opacity: 1,
        present,
        groupIds: [],
        boundElementIds: [],
        fileId: 'shared-image',
      },
    ],
  };
}

describe('scene-state project schema', () => {
  it('keeps scene-state metadata optional for legacy V2 projects', () => {
    expect(parseProjectDocument(baseProject()).authoring).toBeUndefined();
  });

  it('preserves sparse tombstones and shared file references', () => {
    const project = parseProjectDocument({
      ...baseProject(),
      authoring: {
        version: 1,
        documentRevision: 2,
        timelineRevision: 0,
        actions: [],
        sceneStates: [snapshot('before', true), snapshot('after', false)],
        sceneTransitions: [
          {
            id: 'transition',
            fromStateId: 'before',
            toStateId: 'after',
            mappings: [{ fromElementId: 'image', toElementId: 'image' }],
            settings: {
              durationMs: 600,
              easing: 'easeInOut',
              staggerMs: 40,
              includeCamera: false,
            },
            status: 'draft',
          },
        ],
      },
    });

    expect(project.authoring?.sceneStates?.[1]?.elements[0]).toMatchObject({
      id: 'image',
      present: false,
      fileId: 'shared-image',
    });
    expect(project.authoring?.sceneStates?.[1]).not.toHaveProperty('files');
  });

  it('rejects missing shared files and stale transition references', () => {
    const source = baseProject();
    const missingFile = {
      ...source,
      scene: { ...source.scene, files: {} },
    };
    expect(() =>
      parseProjectDocument({
        ...missingFile,
        authoring: {
          version: 1,
          documentRevision: 1,
          timelineRevision: 0,
          actions: [],
          sceneStates: [snapshot('before', true)],
        },
      }),
    ).toThrow(ProjectValidationError);

    expect(() =>
      parseProjectDocument({
        ...baseProject(),
        authoring: {
          version: 1,
          documentRevision: 1,
          timelineRevision: 0,
          actions: [],
          sceneStates: [snapshot('before', true)],
          sceneTransitions: [
            {
              id: 'stale',
              fromStateId: 'before',
              toStateId: 'missing',
              mappings: [],
              settings: {
                durationMs: 600,
                easing: 'easeInOut',
                staggerMs: 0,
                includeCamera: false,
              },
              status: 'draft',
            },
          ],
        },
      }),
    ).toThrow(/missing scene state/);
  });

  it('rejects duplicate mapping ownership', () => {
    expect(() =>
      parseProjectDocument({
        ...baseProject(),
        authoring: {
          version: 1,
          documentRevision: 1,
          timelineRevision: 0,
          actions: [],
          sceneStates: [snapshot('before', true), snapshot('after', false)],
          sceneTransitions: [
            {
              id: 'transition',
              fromStateId: 'before',
              toStateId: 'after',
              mappings: [
                { fromElementId: 'image', toElementId: 'image' },
                { fromElementId: 'image', toElementId: 'image' },
              ],
              settings: {
                durationMs: 600,
                easing: 'easeInOut',
                staggerMs: 0,
                includeCamera: false,
              },
              status: 'draft',
            },
          ],
        },
      }),
    ).toThrow(/mapped only once/);
  });

  it('rejects transition ownership on ordinary actions', () => {
    expect(
      AnimationActionSchema.safeParse({
        id: 'ordinary-action',
        type: 'fade',
        transitionId: 'transition',
        targetIds: ['node'],
        timing: {
          startMs: 0,
          durationMs: 600,
          staggerMs: 0,
          startMode: 'absolute',
        },
        easing: 'easeInOut',
        parameters: {},
        ownership: [],
        generatedHash: 'hash',
        status: 'managed',
      }).success,
    ).toBe(false);
  });

  it('requires reciprocal Smart Transition action ownership', () => {
    expect(() =>
      parseProjectDocument({
        ...baseProject(),
        authoring: {
          version: 1,
          documentRevision: 1,
          timelineRevision: 0,
          actions: [
            {
              id: 'smart-action',
              type: 'smartTransition',
              transitionId: 'transition',
              targetIds: ['image'],
              timing: {
                startMs: 0,
                durationMs: 600,
                staggerMs: 0,
                startMode: 'absolute',
              },
              easing: 'easeInOut',
              parameters: {
                transitionRecipes: [
                  {
                    targetId: 'image',
                    property: 'opacity',
                    from: 1,
                    to: 0,
                    delayMs: 0,
                  },
                ],
              },
              ownership: [],
              generatedHash: 'hash',
              status: 'managed',
            },
          ],
          sceneStates: [snapshot('before', true), snapshot('after', false)],
          sceneTransitions: [
            {
              id: 'transition',
              fromStateId: 'before',
              toStateId: 'after',
              mappings: [],
              settings: {
                durationMs: 600,
                easing: 'easeInOut',
                staggerMs: 0,
                includeCamera: false,
              },
              status: 'accepted',
            },
          ],
        },
      }),
    ).toThrow(/managed action|reciprocal transition ownership/);
  });
});
