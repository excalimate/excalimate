// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { createSyntheticV2Project } from '../../test-fixtures/projectDocuments';
import { IndexedDbRecoveryStore } from './IndexedDbRecoveryStore';

describe('IndexedDbRecoveryStore', () => {
  let store: IndexedDbRecoveryStore;

  beforeEach(() => {
    store = new IndexedDbRecoveryStore(new IDBFactory(), 3);
  });

  it('round-trips validated recovery snapshots', async () => {
    const document = createSyntheticV2Project();
    await store.save(document, 100);

    expect(await store.latest()).toEqual({
      id: 'synthetic-project:100',
      projectId: 'synthetic-project',
      savedAt: 100,
      document,
    });
  });

  it('retains only the configured recovery history', async () => {
    const document = createSyntheticV2Project();
    await store.save(document, 100);
    await store.save(document, 200);
    await store.save(document, 300);
    await store.save(document, 400);

    expect((await store.list()).map((snapshot) => snapshot.savedAt)).toEqual([
      200, 300, 400,
    ]);
  });

  it('clears one project without deleting other recovery entries', async () => {
    const first = createSyntheticV2Project();
    const second = {
      ...createSyntheticV2Project(),
      metadata: {
        ...createSyntheticV2Project().metadata,
        id: 'other-project',
      },
    };
    await store.save(first, 100);
    await store.save(second, 200);

    await store.clear(first.metadata.id);

    expect((await store.list()).map((snapshot) => snapshot.projectId)).toEqual([
      'other-project',
    ]);
  });

  it('rejects invalid documents before writing', async () => {
    const document = createSyntheticV2Project();
    document.timeline.duration = Number.POSITIVE_INFINITY;
    await expect(store.save(document)).rejects.toThrow();
    expect(await store.list()).toEqual([]);
  });
});
