/**
 * useMcpLive — Connects to the MCP server's SSE endpoint for real-time state updates.
 *
 * Implements explicit reconnection with exponential backoff + jitter,
 * state re-sync on each reconnect, and AbortController-based fetch cleanup.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { PROJECT_LIMITS } from '@excalimate/project-schema';
import { usePlaybackStore } from '../stores/playbackStore';
import { useUIStore } from '../stores/uiStore';
import { computeFrameAtTime } from '../core/engine/playbackSingleton';
import { trackMcpAction } from '../services/analytics/posthog';
import { readPreference, storePreference } from '../services/analytics/consent';
import { OPTIONAL_STORAGE_KEYS } from '../services/privacy/dataInventory';
import {
  captureProjectDocument,
  loadProjectDocumentIntoStores,
} from '../services/ProjectDocumentService';
import {
  classifyMcpDelta,
  createMcpStateSyncQueue,
  mergeMcpStateDelta,
  parseMcpDelta,
  parseMcpSnapshot,
  projectFromMcpSnapshot,
} from './mcpLiveState';
import type { McpStateCursor } from './mcpLiveState';
import type { McpStateSyncQueue } from './mcpLiveState';
import { createMcpConnectionGeneration } from './mcpConnectionGeneration';

const STORAGE_KEY = OPTIONAL_STORAGE_KEYS.mcpUrl;

/** Decompress a gzip+base64 encoded string using the browser's DecompressionStream API. */
async function decompressGzBase64(b64: string): Promise<string> {
  if (b64.length > PROJECT_LIMITS.maxInputBytes * 2) {
    throw new Error('Compressed MCP payload exceeds the transfer limit');
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let decompressedBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    decompressedBytes += value.byteLength;
    if (decompressedBytes > PROJECT_LIMITS.maxInputBytes) {
      await reader.cancel();
      throw new Error('MCP payload exceeds the transfer limit');
    }
    chunks.push(value);
  }

  const totalLen = chunks.reduce((s, c) => s + c.length, 0);
  const merged = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  return new TextDecoder().decode(merged);
}

function getPersistedMcpUrl(): string {
  return (
    readPreference(STORAGE_KEY) || import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001'
  );
}

function persistMcpUrl(url: string): void {
  storePreference(STORAGE_KEY, url);
}

export function getMcpUrl(): string {
  return getPersistedMcpUrl();
}

/** Reconnection constants */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;
const RECONNECT_JITTER = 0.3; // ±30% random jitter
const STATE_FETCH_TIMEOUT_MS = 10000;

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

export function useMcpLive() {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [liveUrl, setLiveUrlState] = useState(getPersistedMcpUrl());
  const [lastError, setLastError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptRef = useRef(0);
  const intentionalDisconnectRef = useRef(false);
  const cursorRef = useRef<McpStateCursor | null>(null);
  const syncQueueRef = useRef<McpStateSyncQueue | null>(null);
  const connectionGenerationRef = useRef(createMcpConnectionGeneration());

  const setLiveUrl = useCallback((url: string) => {
    setLiveUrlState(url);
    persistMcpUrl(url);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  const applyProjectState = useCallback(
    (project: Parameters<typeof loadProjectDocumentIntoStores>[0]): void => {
      loadProjectDocumentIntoStores(project, {
        activateAnimationMode: true,
        pushUndo: false,
        trackWorkspaceChange: false,
      });
      queueMicrotask(() => {
        computeFrameAtTime(usePlaybackStore.getState().currentTime);
      });
    },
    [],
  );

  const syncState = useCallback(
    async (url: string): Promise<void> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const timeoutId = setTimeout(() => controller.abort(), STATE_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${url}/state`, {
          signal: controller.signal,
          credentials: 'omit',
          referrerPolicy: 'no-referrer',
        });
        if (!res.ok) {
          throw new Error(`MCP state request failed with status ${res.status}`);
        }
        const declaredLength = Number(res.headers.get('content-length'));
        if (Number.isFinite(declaredLength) && declaredLength > PROJECT_LIMITS.maxInputBytes) {
          throw new Error('MCP state snapshot exceeds the transfer limit');
        }
        const json = await res.text();
        if (new TextEncoder().encode(json).byteLength > PROJECT_LIMITS.maxInputBytes) {
          throw new Error('MCP state snapshot exceeds the transfer limit');
        }
        const snapshot = parseMcpSnapshot(JSON.parse(json));
        applyProjectState(projectFromMcpSnapshot(snapshot));
        cursorRef.current = {
          revision: snapshot.revision,
          sequence: snapshot.sequence,
        };
        setLastError(null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') {
          console.error('[MCP Live] State synchronization failed');
          setLastError('invalid_state');
        }
      } finally {
        clearTimeout(timeoutId);
      }
    },
    [applyProjectState],
  );

  const requestStateSync = useCallback(
    (url: string): Promise<void> => {
      if (!syncQueueRef.current) {
        syncQueueRef.current = createMcpStateSyncQueue(syncState);
      }
      return syncQueueRef.current.request(url);
    },
    [syncState],
  );

  const applyDelta = useCallback(
    (input: unknown, url: string): void => {
      try {
        const delta = parseMcpDelta(input);
        if (syncQueueRef.current?.syncing) {
          void requestStateSync(url);
          return;
        }
        const disposition = classifyMcpDelta(cursorRef.current, delta);
        if (disposition === 'stale') return;
        if (disposition === 'resync') {
          void requestStateSync(url);
          return;
        }
        const current = captureProjectDocument({ touchUpdatedAt: false });
        if (!current) {
          void requestStateSync(url);
          return;
        }
        applyProjectState(mergeMcpStateDelta(current, delta));
        cursorRef.current = {
          revision: delta.revision,
          sequence: delta.sequence,
        };
        setLastError(null);
      } catch {
        console.error('[MCP Live] Rejected an invalid state delta');
        setLastError('invalid_state');
        void requestStateSync(url);
      }
    },
    [applyProjectState, requestStateSync],
  );

  const handleLiveMessage = useCallback(
    (input: unknown, url: string): void => {
      if (!input || typeof input !== 'object') {
        throw new Error('Invalid MCP live message');
      }
      const message = input as Record<string, unknown>;
      if (message['type'] === 'state') {
        applyDelta(message['state'], url);
      }
    },
    [applyDelta],
  );

  /** Compute reconnect delay with exponential backoff + jitter. */
  function getReconnectDelay(): number {
    const attempt = reconnectAttemptRef.current;
    const base = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    const jitter = base * RECONNECT_JITTER * (Math.random() * 2 - 1);
    return Math.max(0, base + jitter);
  }

  const connect = useCallback(
    (url: string = getMcpUrl()) => {
      // Clean up any existing connection/timers
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
      abortRef.current?.abort();
      syncQueueRef.current?.reset();
      eventSourceRef.current?.close();
      cursorRef.current = null;
      intentionalDisconnectRef.current = false;
      reconnectAttemptRef.current = 0;
      setLastError(null);

      function openConnection(isReconnect = false) {
        setStatus(isReconnect ? 'reconnecting' : 'connecting');

        const generation = connectionGenerationRef.current.next();
        const es = new EventSource(`${url}/live`);
        eventSourceRef.current = es;
        let hasConnected = false;
        const isCurrentConnection = () =>
          connectionGenerationRef.current.isCurrent(generation) && eventSourceRef.current === es;
        es.onopen = () => {
          if (!isCurrentConnection()) return;
          if (!isCurrentConnection()) return;
          if (import.meta.env.DEV) console.log('[MCP Live] Connected to', url);
          hasConnected = true;
          reconnectAttemptRef.current = 0;
          setStatus('connected');
          useUIStore.getState().setLiveMode(true);
          trackMcpAction('connect');

          // Re-sync full state on every (re)connect to recover from missed SSE messages
          void requestStateSync(url);
        };

        es.onmessage = (event) => {
          if (!isCurrentConnection()) return;
          try {
            const data: unknown = JSON.parse(event.data);
            if (
              data &&
              typeof data === 'object' &&
              (data as Record<string, unknown>)['type'] === 'gz' &&
              typeof (data as Record<string, unknown>)['data'] === 'string'
            ) {
              // Decompress gzipped SSE payload
              decompressGzBase64((data as Record<string, string>)['data']).then(
                (json) => {
                  if (!isCurrentConnection()) return;
                  try {
                    handleLiveMessage(JSON.parse(json), url);
                  } catch {
                    console.error('[MCP Live] Rejected an invalid compressed message');
                    setLastError('invalid_state');
                    void requestStateSync(url);
                  }
                },
                () => {
                  if (!isCurrentConnection()) return;
                  console.error('[MCP Live] Rejected an invalid compressed payload');
                  setLastError('invalid_state');
                  void requestStateSync(url);
                },
              );
            } else {
              handleLiveMessage(data, url);
            }
          } catch {
            console.error('[MCP Live] Rejected an invalid live message');
            setLastError('invalid_state');
            void requestStateSync(url);
          }
        };

        es.onerror = () => {
          if (!isCurrentConnection()) return;
          es.close();
          eventSourceRef.current = null;

          if (intentionalDisconnectRef.current) {
            setStatus('disconnected');
            return;
          }

          if (!hasConnected) {
            setStatus('disconnected');
            setLastError('connection_failed');
            return;
          }

          // Schedule reconnect with backoff
          const delay = getReconnectDelay();
          reconnectAttemptRef.current++;
          if (import.meta.env.DEV) {
            console.log(
              `[MCP Live] Connection lost. Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptRef.current})`,
            );
          }
          reconnectTimerRef.current = setTimeout(() => openConnection(true), delay);
        };
      }

      openConnection();
      setLiveUrl(url);
    },
    [handleLiveMessage, requestStateSync, setLiveUrl],
  );

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    connectionGenerationRef.current.invalidate();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    abortRef.current?.abort();
    syncQueueRef.current?.reset();
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    cursorRef.current = null;
    reconnectAttemptRef.current = 0;
    useUIStore.getState().setLiveMode(false);
    setStatus('disconnected');
    trackMcpAction('disconnect');
    if (import.meta.env.DEV) console.log('[MCP Live] Disconnected');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    const connectionGeneration = connectionGenerationRef.current;
    return () => {
      intentionalDisconnectRef.current = true;
      connectionGeneration.invalidate();
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      abortRef.current?.abort();
      syncQueueRef.current?.reset();
      eventSourceRef.current?.close();
    };
  }, []);

  // Backwards-compatible: expose `connected` boolean alongside richer `status`
  const connected = status === 'connected';

  return { connected, status, connect, disconnect, liveUrl, setLiveUrl, lastError, clearError };
}
