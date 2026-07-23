import { describe, expect, it } from 'vitest';
import type { McpStateDelta } from '@excalimate/project-schema';
import { createSyntheticV2Project } from '../test-fixtures/projectDocuments';
import {
  classifyMcpDelta,
  createMcpStateSyncQueue,
  mergeMcpStateDelta,
} from './mcpLiveState';

function timelineDelta(overrides: Partial<McpStateDelta> = {}): McpStateDelta {
  return {
    revision: 1,
    sequence: 1,
    baseRevision: 0,
    timeline: {
      upsertedTracks: [],
      removedTrackIds: [],
      meta: {
        id: 'synthetic-timeline',
        name: 'Updated through MCP',
        duration: 2_000,
        fps: 60,
      },
    },
    ...overrides,
  };
}

describe('MCP live state integration', () => {
  it('accepts deltas that omit additive project and authoring fields', () => {
    const merged = mergeMcpStateDelta(createSyntheticV2Project(), timelineDelta());

    expect(merged.timeline.name).toBe('Updated through MCP');
    expect(merged.preferredWorkspace).toBe('sequence');
    expect(merged.authoring?.actions).toEqual([]);
  });

  it('hydrates project metadata and sparse authoring entities losslessly', () => {
    const project = createSyntheticV2Project();
    const updatedAt = '2026-07-12T00:00:00.000Z';
    const merged = mergeMcpStateDelta(project, {
      revision: 1,
      sequence: 1,
      baseRevision: 0,
      project: {
        version: '2.0.0',
        metadata: { ...project.metadata, updatedAt },
        preferredWorkspace: 'studio',
      },
      authoring: {
        upsertedActions: [],
        removedActionIds: [],
        upsertedSceneStates: [
          {
            id: 'state-hidden',
            name: 'Hidden',
            createdAt: updatedAt,
            elements: [
              {
                id: 'synthetic-rectangle',
                type: 'rectangle',
                x: 0,
                y: 0,
                width: 100,
                height: 100,
                angle: 0,
                opacity: 0,
                present: false,
                groupIds: [],
                boundElementIds: [],
              },
            ],
          },
        ],
        removedSceneStateIds: [],
        upsertedSceneTransitions: [],
        removedSceneTransitionIds: [],
        meta: {
          version: 1,
          documentRevision: 1,
          timelineRevision: 0,
        },
      },
    });

    expect(merged.metadata.updatedAt).toBe(updatedAt);
    expect(merged.preferredWorkspace).toBe('studio');
    expect(merged.authoring?.sceneStates?.[0]).toMatchObject({
      id: 'state-hidden',
      elements: [{ opacity: 0, present: false }],
    });
    expect(merged.authoring?.documentRevision).toBe(1);
  });

  it('classifies duplicate and gapped revisions before applying a delta', () => {
    const cursor = { revision: 2, sequence: 4 };
    expect(
      classifyMcpDelta(
        cursor,
        timelineDelta({
          revision: 3,
          sequence: 5,
          baseRevision: 2,
        }),
      ),
    ).toBe('apply');
    expect(
      classifyMcpDelta(
        cursor,
        timelineDelta({
          revision: 2,
          sequence: 4,
          baseRevision: 1,
        }),
      ),
    ).toBe('stale');
    expect(
      classifyMcpDelta(
        cursor,
        timelineDelta({
          revision: 4,
          sequence: 6,
          baseRevision: 3,
        }),
      ),
    ).toBe('resync');
    expect(classifyMcpDelta(null, timelineDelta())).toBe('resync');
  });

  it('rejects malformed delta collections instead of mutating state', () => {
    expect(() =>
      mergeMcpStateDelta(createSyntheticV2Project(), {
        revision: 1,
        sequence: 1,
        baseRevision: 0,
        timeline: {
          upsertedTracks: 'not-an-array',
          removedTrackIds: [],
        },
      }),
    ).toThrow('Invalid MCP state delta');
  });

  it('queues a fresh snapshot when a delta arrives during synchronization', async () => {
    let releaseFirstSync: (() => void) | undefined;
    const urls: string[] = [];
    const queue = createMcpStateSyncQueue(async (url) => {
      urls.push(url);
      if (urls.length === 1) {
        await new Promise<void>((resolve) => {
          releaseFirstSync = resolve;
        });
      }
    });

    const request = queue.request('http://localhost:3001');
    expect(queue.syncing).toBe(true);
    expect(queue.request('http://localhost:3001')).toBe(request);
    releaseFirstSync?.();
    await request;

    expect(urls).toEqual([
      'http://localhost:3001',
      'http://localhost:3001',
    ]);
    expect(queue.syncing).toBe(false);
  });

  it('removes final sparse authoring entities instead of retaining stale data', () => {
    const project = createSyntheticV2Project();
    const createdAt = project.metadata.createdAt;
    project.authoring = {
      ...project.authoring!,
      sceneStates: [
        {
          id: 'state-final',
          name: 'Final state',
          createdAt,
          elements: [],
        },
      ],
      sceneTransitions: [
        {
          id: 'transition-final',
          fromStateId: 'state-final',
          toStateId: 'state-final',
          mappings: [],
          settings: {
            durationMs: 100,
            easing: 'linear',
            staggerMs: 0,
            includeCamera: false,
          },
          status: 'draft',
        },
      ],
    };

    const merged = mergeMcpStateDelta(
      project,
      timelineDelta({
        authoring: {
          upsertedActions: [],
          removedActionIds: [],
          upsertedSceneStates: [],
          removedSceneStateIds: ['state-final'],
          upsertedSceneTransitions: [],
          removedSceneTransitionIds: ['transition-final'],
          meta: {
            version: 1,
            documentRevision: 1,
            timelineRevision: 0,
          },
        },
      }),
    );

    expect(merged.authoring?.sceneStates).toEqual([]);
    expect(merged.authoring?.sceneTransitions).toEqual([]);
  });
});
