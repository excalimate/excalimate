import { parseProjectDocument } from '@excalimate/project-schema';
import type { ProjectDocument } from '@excalimate/project-schema';

const DATABASE_NAME = 'excalimate-recovery';
const DATABASE_VERSION = 1;
const SNAPSHOT_STORE = 'snapshots';
const SAVED_AT_INDEX = 'savedAt';
const PROJECT_ID_INDEX = 'projectId';

export const MAX_RECOVERY_SNAPSHOTS = 10;

export interface RecoverySnapshot {
  id: string;
  projectId: string;
  savedAt: number;
  document: ProjectDocument;
}

export class IndexedDbRecoveryStore {
  private readonly indexedDb: IDBFactory;
  private readonly maxSnapshots: number;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(
    indexedDb: IDBFactory = globalThis.indexedDB,
    maxSnapshots = MAX_RECOVERY_SNAPSHOTS,
  ) {
    this.indexedDb = indexedDb;
    this.maxSnapshots = maxSnapshots;
  }

  async save(
    document: ProjectDocument,
    savedAt = Date.now(),
  ): Promise<RecoverySnapshot> {
    const validated = parseProjectDocument(document);
    const snapshot: RecoverySnapshot = {
      id: `${validated.metadata.id}:${savedAt}`,
      projectId: validated.metadata.id,
      savedAt,
      document: validated,
    };
    const database = await this.open();
    const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
    const completion = transactionComplete(transaction);
    transaction.objectStore(SNAPSHOT_STORE).put(snapshot);
    await completion;
    await this.prune();
    return snapshot;
  }

  async latest(): Promise<RecoverySnapshot | null> {
    const database = await this.open();
    const transaction = database.transaction(SNAPSHOT_STORE, 'readonly');
    const completion = transactionComplete(transaction);
    const cursor = await requestResult<IDBCursorWithValue | null>(
      transaction
        .objectStore(SNAPSHOT_STORE)
        .index(SAVED_AT_INDEX)
        .openCursor(null, 'prev'),
    );
    const record: unknown = cursor?.value;
    await completion;
    return record === undefined ? null : parseRecoverySnapshot(record);
  }

  async list(): Promise<RecoverySnapshot[]> {
    const database = await this.open();
    const transaction = database.transaction(SNAPSHOT_STORE, 'readonly');
    const completion = transactionComplete(transaction);
    const request = transaction
      .objectStore(SNAPSHOT_STORE)
      .index(SAVED_AT_INDEX)
      .getAll();
    const records = await requestResult<unknown[]>(request);
    await completion;
    return records.map(parseRecoverySnapshot);
  }

  async clear(projectId?: string): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(SNAPSHOT_STORE);

    if (projectId === undefined) {
      store.clear();
    } else {
      const keys = await requestResult<IDBValidKey[]>(
        store.index(PROJECT_ID_INDEX).getAllKeys(projectId),
      );
      for (const key of keys) store.delete(key);
    }
    await completion;
  }

  close(): void {
    if (!this.databasePromise) return;
    void this.databasePromise.then((database) => database.close());
    this.databasePromise = null;
  }

  private open(): Promise<IDBDatabase> {
    this.databasePromise ??= new Promise<IDBDatabase>((resolve, reject) => {
      if (!this.indexedDb) {
        reject(new Error('IndexedDB is not available in this browser'));
        return;
      }

      const request = this.indexedDb.open(DATABASE_NAME, DATABASE_VERSION);
      request.onupgradeneeded = () => {
        const database = request.result;
        const store = database.createObjectStore(SNAPSHOT_STORE, {
          keyPath: 'id',
        });
        store.createIndex(SAVED_AT_INDEX, SAVED_AT_INDEX);
        store.createIndex(PROJECT_ID_INDEX, PROJECT_ID_INDEX);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(request.error ?? new Error('Unable to open recovery database'));
      request.onblocked = () =>
        reject(new Error('Recovery database upgrade was blocked'));
    });
    return this.databasePromise;
  }

  private async prune(): Promise<void> {
    const database = await this.open();
    const transaction = database.transaction(SNAPSHOT_STORE, 'readwrite');
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(SNAPSHOT_STORE);
    const count = await requestResult(store.count());
    const excess = count - this.maxSnapshots;
    if (excess > 0) {
      await deleteOldestRecords(store.index(SAVED_AT_INDEX), store, excess);
    }
    await completion;
  }
}

function parseRecoverySnapshot(input: unknown): RecoverySnapshot {
  if (typeof input !== 'object' || input === null) {
    throw new Error('Recovery snapshot is invalid');
  }
  const record = input as Record<string, unknown>;
  if (
    typeof record['id'] !== 'string' ||
    typeof record['projectId'] !== 'string' ||
    typeof record['savedAt'] !== 'number' ||
    !Number.isFinite(record['savedAt'])
  ) {
    throw new Error('Recovery snapshot metadata is invalid');
  }
  return {
    id: record['id'],
    projectId: record['projectId'],
    savedAt: record['savedAt'],
    document: parseProjectDocument(record['document']),
  };
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function transactionComplete(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    transaction.onabort = () =>
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
  });
}

function deleteOldestRecords(
  index: IDBIndex,
  store: IDBObjectStore,
  count: number,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let remaining = count;
    const request = index.openKeyCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor || remaining <= 0) {
        resolve();
        return;
      }
      store.delete(cursor.primaryKey);
      remaining -= 1;
      cursor.continue();
    };
    request.onerror = () =>
      reject(request.error ?? new Error('Unable to prune recovery history'));
  });
}
