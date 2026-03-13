/**
 * Checkpoint persistence — save/load scene + animation state.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { ServerState } from './types.js';

const MAX_CHECKPOINT_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_CHECKPOINTS = 100;

function validateId(id: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(id) || id.length > 64) {
    throw new Error('Invalid checkpoint ID: alphanumeric/hyphens/underscores, max 64 chars');
  }
}

export interface CheckpointStore {
  save(id: string, data: ServerState): Promise<void>;
  load(id: string): Promise<ServerState | null>;
  list(): Promise<string[]>;
}

export class FileCheckpointStore implements CheckpointStore {
  private dir: string;

  constructor() {
    this.dir = path.join(os.tmpdir(), 'animate-excalidraw-mcp-checkpoints');
    fs.mkdirSync(this.dir, { recursive: true });
  }

  async save(id: string, data: ServerState): Promise<void> {
    validateId(id);
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_CHECKPOINT_BYTES) {
      throw new Error(`Checkpoint exceeds ${MAX_CHECKPOINT_BYTES} byte limit`);
    }
    const filePath = path.join(this.dir, `${id}.json`);
    if (!path.resolve(filePath).startsWith(path.resolve(this.dir) + path.sep)) {
      throw new Error('Invalid checkpoint path');
    }
    await fs.promises.writeFile(filePath, serialized);
    await this.prune();
  }

  async load(id: string): Promise<ServerState | null> {
    validateId(id);
    const filePath = path.join(this.dir, `${id}.json`);
    if (!path.resolve(filePath).startsWith(path.resolve(this.dir) + path.sep)) {
      throw new Error('Invalid checkpoint path');
    }
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async list(): Promise<string[]> {
    try {
      const entries = await fs.promises.readdir(this.dir);
      return entries.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    } catch {
      return [];
    }
  }

  private async prune(): Promise<void> {
    try {
      const entries = await fs.promises.readdir(this.dir);
      const jsonFiles = entries.filter(f => f.endsWith('.json'));
      if (jsonFiles.length <= MAX_CHECKPOINTS) return;
      const stats = await Promise.all(
        jsonFiles.map(async f => ({
          name: f,
          mtime: (await fs.promises.stat(path.join(this.dir, f))).mtimeMs,
        })),
      );
      stats.sort((a, b) => a.mtime - b.mtime);
      const toRemove = stats.slice(0, stats.length - MAX_CHECKPOINTS);
      await Promise.all(toRemove.map(f => fs.promises.unlink(path.join(this.dir, f.name)).catch(() => {})));
    } catch { /* best-effort */ }
  }
}

export class MemoryCheckpointStore implements CheckpointStore {
  private store = new Map<string, string>();

  async save(id: string, data: ServerState): Promise<void> {
    validateId(id);
    const serialized = JSON.stringify(data);
    if (serialized.length > MAX_CHECKPOINT_BYTES) throw new Error('Checkpoint too large');
    this.store.set(id, serialized);
    if (this.store.size > MAX_CHECKPOINTS) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
  }

  async load(id: string): Promise<ServerState | null> {
    validateId(id);
    const raw = this.store.get(id);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }

  async list(): Promise<string[]> {
    return [...this.store.keys()];
  }
}
