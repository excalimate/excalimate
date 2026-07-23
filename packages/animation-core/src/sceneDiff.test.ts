import { describe, expect, it } from 'vitest';
import type {
  SceneState,
  SceneStateElement,
  SmartTransitionSettings,
} from '@excalimate/project-schema';
import {
  SceneDiffCancelledError,
  captureSceneStateSnapshot,
  createSmartTransitionRecipes,
  diffSceneStates,
  sceneStateFingerprint,
} from './sceneDiff.js';

const settings: SmartTransitionSettings = {
  durationMs: 600,
  easing: 'easeInOut',
  staggerMs: 40,
  includeCamera: false,
};

function element(id: string, update: Partial<SceneStateElement> = {}): SceneStateElement {
  return {
    id,
    type: 'rectangle',
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    angle: 0,
    opacity: 1,
    present: true,
    groupIds: [],
    boundElementIds: [],
    ...update,
  };
}

function state(id: string, elements: SceneStateElement[]): SceneState {
  return {
    id,
    name: id,
    createdAt: '2026-01-01T00:00:00.000Z',
    elements,
  };
}

describe('scene state capture and diff', () => {
  it('captures sparse supported properties without copying binary files', () => {
    const snapshot = captureSceneStateSnapshot({
      id: 'state-1',
      name: 'State 1',
      createdAt: '2026-01-01T00:00:00.000Z',
      elements: [
        {
          id: 'image-1',
          type: 'image',
          x: 10,
          y: 20,
          width: 120,
          height: 80,
          opacity: 50,
          fileId: 'shared-file',
          isDeleted: true,
        },
      ],
    });

    expect(snapshot.elements[0]).toEqual({
      id: 'image-1',
      type: 'image',
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      angle: 0,
      opacity: 0.5,
      present: false,
      groupIds: [],
      boundElementIds: [],
      fileId: 'shared-file',
    });
    expect(snapshot).not.toHaveProperty('files');
  });

  it('detects every supported change type in stable order', () => {
    const before = state('before', [
      element('changed', {
        groupIds: ['group-a'],
        boundElementIds: ['label-a'],
      }),
      element('removed'),
      element('presence', { present: true }),
    ]);
    const after = state('after', [
      element('added'),
      element('changed', {
        x: 20,
        y: 30,
        width: 140,
        height: 90,
        angle: 0.5,
        groupIds: ['group-b'],
        boundElementIds: ['label-b'],
      }),
      element('presence', { present: false }),
    ]);

    const result = diffSceneStates(before, after);

    expect(result.changes).toEqual([
      { toElementId: 'added', types: ['added'] },
      {
        fromElementId: 'changed',
        toElementId: 'changed',
        types: ['moved', 'resized', 'rotated', 'bound-group'],
      },
      {
        fromElementId: 'presence',
        toElementId: 'presence',
        types: ['presence', 'removed'],
      },
      { fromElementId: 'removed', types: ['removed'] },
    ]);
    expect(result.addedElementIds).toEqual(['added']);
    expect(result.removedElementIds).toEqual(['presence', 'removed']);
  });

  it('uses IDs and explicit mappings but never auto-accepts heuristics', () => {
    const before = state('before', [
      element('stable'),
      element('old-a', { label: 'Service', x: 100 }),
      element('old-b', { label: 'Service', x: 100 }),
    ]);
    const after = state('after', [
      element('stable', { x: 20 }),
      element('new-a', { label: 'Service', x: 100 }),
      element('new-b', { label: 'Service', x: 100 }),
    ]);

    const proposed = diffSceneStates(before, after);
    expect(proposed.matches).toHaveLength(1);
    expect(proposed.ambiguousFromElementIds).toEqual(['old-a', 'old-b']);

    const mapped = diffSceneStates(before, after, {
      mappings: [
        { fromElementId: 'old-a', toElementId: 'new-b' },
        { fromElementId: 'old-b', toElementId: 'new-a' },
      ],
    });
    expect(mapped.matches.map((match) => match.method)).toEqual([
      'explicit',
      'explicit',
      'stable-id',
    ]);
    expect(mapped.addedElementIds).toEqual([]);
    expect(mapped.removedElementIds).toEqual([]);
  });

  it('is deterministic regardless of input order', () => {
    const before = state('before', [element('b', { x: 20 }), element('a', { x: 10 })]);
    const after = state('after', [element('a', { x: 30 }), element('b', { x: 40 })]);

    expect(diffSceneStates(before, after)).toEqual(
      diffSceneStates(
        { ...before, elements: [...before.elements].reverse() },
        { ...after, elements: [...after.elements].reverse() },
      ),
    );
  });

  it('fingerprints diff-relevant state content deterministically', () => {
    const original = state('before', [
      element('b', { x: 20 }),
      element('a', { groupIds: ['g-2', 'g-1'] }),
    ]);
    const reordered = {
      ...original,
      name: 'Renamed',
      elements: [...original.elements].reverse(),
    };

    expect(sceneStateFingerprint(reordered)).toBe(sceneStateFingerprint(original));
    expect(
      sceneStateFingerprint({
        ...original,
        elements: original.elements.map((item) =>
          item.id === 'a' ? { ...item, x: item.x + 1 } : item,
        ),
      }),
    ).not.toBe(sceneStateFingerprint(original));
  });

  it('creates transform and fade recipes while keeping camera opt-in', () => {
    const before = {
      ...state('before', [element('moved', { x: 10, width: 50 }), element('gone')]),
      cameraFrame: { aspectRatio: '16:9' as const, width: 1000, x: 0, y: 0 },
    };
    const after = {
      ...state('after', [
        element('moved', { x: 110, width: 100 }),
        element('gone', { present: false }),
        element('new'),
      ]),
      cameraFrame: { aspectRatio: '16:9' as const, width: 800, x: 50, y: 20 },
    };
    const diff = diffSceneStates(before, after);

    const withoutCamera = createSmartTransitionRecipes(before, after, diff, settings);
    expect(withoutCamera).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          targetId: 'moved',
          property: 'translateX',
          from: -100,
          to: 0,
        }),
        expect.objectContaining({
          targetId: 'moved',
          property: 'scaleX',
          from: 0.5,
          to: 1,
        }),
        expect.objectContaining({
          targetId: 'gone',
          property: 'opacity',
          from: 1,
          to: 0,
        }),
        expect.objectContaining({
          targetId: 'new',
          property: 'opacity',
          from: 0,
          to: 1,
        }),
      ]),
    );
    expect(withoutCamera.some((recipe) => recipe.targetId === '__camera_frame__')).toBe(false);

    const withCamera = createSmartTransitionRecipes(before, after, diff, {
      ...settings,
      includeCamera: true,
    });
    expect(withCamera.some((recipe) => recipe.targetId === '__camera_frame__')).toBe(true);
  });

  it('creates endpoints relative to the live baseline without changing captured geometry', () => {
    const before = state('before', [element('node', { x: 0, width: 100, angle: 0, opacity: 1 })]);
    const after = state('after', [
      element('node', { x: 100, width: 200, angle: Math.PI / 2, opacity: 0 }),
    ]);
    const recipes = createSmartTransitionRecipes(
      before,
      after,
      diffSceneStates(before, after),
      settings,
      {
        baselineElements: [
          {
            id: 'node',
            type: 'rectangle',
            x: 200,
            width: 400,
            angle: Math.PI,
            opacity: 0,
          },
        ],
      },
    );

    expect(recipes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          property: 'translateX',
          from: -200,
          to: -100,
        }),
        expect.objectContaining({
          property: 'scaleX',
          from: 0.25,
          to: 0.5,
        }),
        expect.objectContaining({
          property: 'rotation',
          from: -180,
          to: -90,
        }),
        expect.objectContaining({
          property: 'opacity',
          from: 1,
          to: 0,
        }),
      ]),
    );
  });

  it('supports deterministic cancellation checks', () => {
    const before = state(
      'before',
      Array.from({ length: 256 }, (_, index) => element(`old-${index}`)),
    );
    const after = state(
      'after',
      Array.from({ length: 256 }, (_, index) => element(`new-${index}`)),
    );

    expect(() => diffSceneStates(before, after, { shouldCancel: () => true })).toThrow(
      SceneDiffCancelledError,
    );
  });
});
