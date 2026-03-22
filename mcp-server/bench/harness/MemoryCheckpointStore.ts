import type { CheckpointStore } from '../../src/checkpoint-store.js';
import type { ServerState } from '../../src/types.js';

/**
 * In-memory checkpoint store — no filesystem I/O during benchmarks.
 */
export class MemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, ServerState>();

  async save(id: string, data: ServerState): Promise<void> {
    this.store.set(id, data);
  }

  async load(id: string): Promise<ServerState | null> {
    return this.store.get(id) ?? null;
  }

  async list(): Promise<string[]> {
    return [...this.store.keys()];
  }
}
