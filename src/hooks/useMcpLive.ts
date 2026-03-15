/**
 * useMcpLive — Connects to the MCP server's SSE endpoint for real-time state updates.
 *
 * Implements explicit reconnection with exponential backoff + jitter,
 * state re-sync on each reconnect, and AbortController-based fetch cleanup.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { extractTargets } from '../components/Canvas/extractTargets';
import { computeFrameAtTime } from '../core/engine/playbackSingleton';

const STORAGE_KEY = 'excalimate-mcp-url';

function getPersistedMcpUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';
  } catch {
    return import.meta.env.VITE_MCP_SERVER_URL || 'http://localhost:3001';
  }
}

function persistMcpUrl(url: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, url);
  } catch {
    // Best effort persistence.
  }
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

  const setLiveUrl = useCallback((url: string) => {
    setLiveUrlState(url);
    persistMcpUrl(url);
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  /** Fetch full state from the server and apply it. */
  async function syncState(url: string): Promise<void> {
    // Cancel any in-flight fetch from a previous sync
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = setTimeout(() => controller.abort(), STATE_FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`${url}/state`, { signal: controller.signal });
      if (!res.ok) {
        console.error('[MCP Live] Failed to fetch state:', res.statusText);
        return;
      }
      const state = await res.json();
      if (state?.scene?.elements) {
        applyState(state);
      }
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('[MCP Live] Failed to fetch state:', e);
        setLastError('connection_failed');
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /** Compute reconnect delay with exponential backoff + jitter. */
  function getReconnectDelay(): number {
    const attempt = reconnectAttemptRef.current;
    const base = Math.min(RECONNECT_BASE_MS * 2 ** attempt, RECONNECT_MAX_MS);
    const jitter = base * RECONNECT_JITTER * (Math.random() * 2 - 1);
    return Math.max(0, base + jitter);
  }

  const connect = useCallback((url: string = getMcpUrl()) => {
    // Clean up any existing connection/timers
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    abortRef.current?.abort();
    eventSourceRef.current?.close();
    intentionalDisconnectRef.current = false;
    reconnectAttemptRef.current = 0;
    setLastError(null);

    function openConnection(isReconnect = false) {
      setStatus(isReconnect ? 'reconnecting' : 'connecting');

      const es = new EventSource(`${url}/live`);
      eventSourceRef.current = es;
      let hasConnected = false;

      es.onopen = () => {
        if (import.meta.env.DEV) console.log('[MCP Live] Connected to', url);
        hasConnected = true;
        reconnectAttemptRef.current = 0;
        setStatus('connected');
        useUIStore.getState().setLiveMode(true);

        // Re-sync full state on every (re)connect to recover from missed SSE messages
        syncState(url);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state' && data.state) {
            applyState(data.state);
          }
        } catch (e) {
          console.error('[MCP Live] Parse error:', e);
        }
      };

      es.onerror = () => {
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
          console.log(`[MCP Live] Connection lost. Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttemptRef.current})`);
        }
        reconnectTimerRef.current = setTimeout(() => openConnection(true), delay);
      };
    }

    openConnection();
    setLiveUrl(url);
  }, [setLiveUrl]);

  const disconnect = useCallback(() => {
    intentionalDisconnectRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    reconnectTimerRef.current = null;
    abortRef.current?.abort();
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    reconnectAttemptRef.current = 0;
    useUIStore.getState().setLiveMode(false);
    setStatus('disconnected');
    if (import.meta.env.DEV) console.log('[MCP Live] Disconnected');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalDisconnectRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      abortRef.current?.abort();
      eventSourceRef.current?.close();
    };
  }, []);

  // Backwards-compatible: expose `connected` boolean alongside richer `status`
  const connected = status === 'connected';

  return { connected, status, connect, disconnect, liveUrl, setLiveUrl, lastError, clearError };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyState(state: any) {
  // ── Batch all store mutations ──────────────────────────────────
  // Each store is updated with a single set() call to minimize intermediate
  // renders.  Frame recomputation runs after all stores are committed via
  // queueMicrotask so subscribers see fully consistent state.

  // 1. Scene + targets + mode (project store + UI store)
  if (state.scene?.elements) {
    // Force element opacity to 100 — animation controls visibility via keyframes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const elements = state.scene.elements.map((el: any) => ({ ...el, opacity: 100 }));

    const projectStore = useProjectStore.getState();
    const currentProject = projectStore.project;

    if (!currentProject) {
      projectStore.createNewProject('MCP Live', {
        elements,
        appState: state.scene.appState ?? {},
        files: state.scene.files ?? {},
      });
    } else {
      // Preserve the current scene's appState (viewport scroll/zoom) so the
      // user's view isn't reset on every MCP update.
      const currentAppState = currentProject.scene?.appState ?? {};
      const scene = {
        elements,
        appState: { ...currentAppState, ...(state.scene.appState ?? {}) },
        files: { ...(currentProject.scene?.files ?? {}), ...(state.scene.files ?? {}) },
      };
      projectStore.updateScene(scene);
    }

    const targets = extractTargets(elements);
    projectStore.setTargets(targets);

    // Switch to animate mode when receiving live updates
    if (useUIStore.getState().mode !== 'animate') {
      useUIStore.getState().setMode('animate');
    }
  }

  // 2. Animation store — batch timeline + clip range into one set()
  if (state.timeline || (state.clipStart !== undefined && state.clipEnd !== undefined)) {
    const updates: Record<string, unknown> = {};
    if (state.timeline) {
      updates.timeline = state.timeline;
    }
    if (state.clipStart !== undefined && state.clipEnd !== undefined) {
      updates.clipStart = Math.max(0, state.clipStart);
      updates.clipEnd = Math.max(state.clipStart + 100, state.clipEnd);
    }
    // Apply all animation updates in a single set() call
    useAnimationStore.setState(updates);
  }

  // 3. Camera frame
  if (state.cameraFrame) {
    useProjectStore.getState().setCameraFrame(state.cameraFrame);
  }

  // 4. Recompute animation frame AFTER all stores are updated.
  // queueMicrotask ensures all synchronous Zustand subscriptions have
  // fired and React has batched the pending re-renders, so the frame
  // computation reads fully consistent state.
  queueMicrotask(() => {
    const currentTime = usePlaybackStore.getState().currentTime;
    computeFrameAtTime(currentTime);
  });
}
