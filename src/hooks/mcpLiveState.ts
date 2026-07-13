import {
  parseMcpStateDelta,
  parseMcpStateSnapshot,
  parseProjectDocument,
} from '@excalimate/project-schema';
import type {
  McpStateDelta,
  McpStateSnapshot,
  ProjectAuthoring,
  ProjectDocument,
} from '@excalimate/project-schema';

export interface McpStateCursor {
  revision: number;
  sequence: number;
}

export type McpDeltaDisposition = 'apply' | 'stale' | 'resync';

export interface McpStateSyncQueue {
  readonly syncing: boolean;
  request(url: string): Promise<void>;
  reset(): void;
}

export function createMcpStateSyncQueue(
  sync: (url: string) => Promise<void>,
): McpStateSyncQueue {
  let active: Promise<void> | null = null;
  let pendingUrl: string | null = null;
  let generation = 0;

  return {
    get syncing(): boolean {
      return active !== null;
    },
    request(url: string): Promise<void> {
      pendingUrl = url;
      if (active) return active;

      const requestGeneration = generation;
      const request = (async () => {
        while (pendingUrl && requestGeneration === generation) {
          const nextUrl = pendingUrl;
          pendingUrl = null;
          await sync(nextUrl);
        }
      })().finally(() => {
        if (active === request) active = null;
      });
      active = request;
      return request;
    },
    reset(): void {
      generation += 1;
      pendingUrl = null;
      active = null;
    },
  };
}

export function parseMcpSnapshot(input: unknown): McpStateSnapshot {
  return parseMcpStateSnapshot(input);
}

export function parseMcpDelta(input: unknown): McpStateDelta {
  return parseMcpStateDelta(input);
}

export function projectFromMcpSnapshot(snapshot: McpStateSnapshot): ProjectDocument {
  const {
    clipStart: _clipStart,
    clipEnd: _clipEnd,
    cameraFrame: _cameraFrame,
    revision: _revision,
    sequence: _sequence,
    ...project
  } = snapshot;
  return parseProjectDocument(project);
}

export function classifyMcpDelta(
  cursor: McpStateCursor | null,
  delta: McpStateDelta,
): McpDeltaDisposition {
  if (!cursor) return 'resync';
  if (delta.revision <= cursor.revision || delta.sequence <= cursor.sequence) {
    return 'stale';
  }
  return delta.baseRevision === cursor.revision && delta.sequence === cursor.sequence + 1
    ? 'apply'
    : 'resync';
}

export function mergeMcpStateDelta(project: ProjectDocument, input: unknown): ProjectDocument {
  const delta = parseMcpStateDelta(input);
  const scene = delta.scene
    ? {
        elements: mergeEntities(project.scene.elements, delta.scene.upsert, delta.scene.removed),
        appState: delta.scene.appState ?? project.scene.appState,
        files: delta.scene.files ?? project.scene.files,
      }
    : project.scene;
  const timeline = delta.timeline
    ? {
        ...project.timeline,
        ...(delta.timeline.meta ?? {}),
        tracks: mergeEntities(
          project.timeline.tracks,
          delta.timeline.upsertedTracks,
          delta.timeline.removedTrackIds,
        ),
      }
    : project.timeline;
  const authoring = delta.authoring
    ? mergeAuthoring(project.authoring, delta.authoring)
    : project.authoring;
  const preferredWorkspace =
    delta.project && Object.prototype.hasOwnProperty.call(delta.project, 'preferredWorkspace')
      ? (delta.project.preferredWorkspace ?? undefined)
      : project.preferredWorkspace;

  return parseProjectDocument({
    ...project,
    ...(delta.project
      ? {
          version: delta.project.version,
          metadata: delta.project.metadata,
          preferredWorkspace,
        }
      : {}),
    scene,
    timeline,
    playback: {
      clipStart: delta.clipStart ?? project.playback.clipStart,
      clipEnd: delta.clipEnd ?? project.playback.clipEnd,
      cameraFrame: delta.cameraFrame ?? project.playback.cameraFrame,
    },
    ...(authoring ? { authoring } : {}),
  });
}

function mergeAuthoring(
  current: ProjectAuthoring | undefined,
  delta: NonNullable<McpStateDelta['authoring']>,
): ProjectAuthoring {
  const baseline: ProjectAuthoring = current ?? {
    version: 1,
    documentRevision: 0,
    timelineRevision: 0,
    actions: [],
  };
  const sceneStates =
    delta.upsertedSceneStates || delta.removedSceneStateIds
      ? mergeEntities(
          baseline.sceneStates ?? [],
          delta.upsertedSceneStates ?? [],
          delta.removedSceneStateIds ?? [],
        )
      : baseline.sceneStates;
  const sceneTransitions =
    delta.upsertedSceneTransitions || delta.removedSceneTransitionIds
      ? mergeEntities(
          baseline.sceneTransitions ?? [],
          delta.upsertedSceneTransitions ?? [],
          delta.removedSceneTransitionIds ?? [],
        )
      : baseline.sceneTransitions;

  return {
    ...baseline,
    ...delta.meta,
    actions: mergeEntities(baseline.actions, delta.upsertedActions, delta.removedActionIds),
    ...(sceneStates !== undefined ? { sceneStates } : {}),
    ...(sceneTransitions !== undefined ? { sceneTransitions } : {}),
  };
}

function mergeEntities<T extends { id: string }>(
  current: readonly T[],
  upserted: readonly T[],
  removedIds: readonly string[],
): T[] {
  const removed = new Set(removedIds);
  const upserts = new Map(upserted.map((item) => [item.id, item]));
  const merged = current
    .filter((item) => !removed.has(item.id))
    .map((item) => upserts.get(item.id) ?? item);
  const existing = new Set(merged.map((item) => item.id));
  for (const item of upserted) {
    if (!existing.has(item.id)) {
      merged.push(item);
      existing.add(item.id);
    }
  }
  return merged;
}
