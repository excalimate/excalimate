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
import { trackMcpAction } from '../services/analytics/posthog';

const STORAGE_KEY = 'excalimate-mcp-url';

/** Decompress a gzip+base64 encoded string using the browser's DecompressionStream API. */
async function decompressGzBase64(b64: string): Promise<string> {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ds = new DecompressionStream('gzip');
  const writer = ds.writable.getWriter();
  writer.write(bytes);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
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
        trackMcpAction('connect');

        // Re-sync full state on every (re)connect to recover from missed SSE messages
        syncState(url);
      };

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'state' && data.state) {
            applyState(data.state);
          } else if (data.type === 'gz' && data.data) {
            // Decompress gzipped SSE payload
            decompressGzBase64(data.data).then(
              (json) => {
                try {
                  const parsed = JSON.parse(json);
                  if (parsed.type === 'state' && parsed.state) {
                    applyState(parsed.state);
                  }
                } catch (e) {
                  console.error('[MCP Live] Parse error after decompress:', e);
                }
              },
              (err) => console.error('[MCP Live] Decompress error:', err),
            );
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
    trackMcpAction('disconnect');
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
  // Supports both full-state messages (from /state endpoint on reconnect)
  // and delta messages (from SSE with upsert/removed fields).

  // 1. Scene
  if (state.scene) {
    const projectStore = useProjectStore.getState();
    const currentProject = projectStore.project;

    // Detect delta format (has upsert/removed) vs full format (has elements array)
    if (Array.isArray(state.scene.upsert) || Array.isArray(state.scene.removed)) {
      // ── Delta scene update ──
      if (currentProject?.scene) {
        const currentElements = [...(currentProject.scene.elements ?? [])];

        // Remove deleted elements
        const removedSet = new Set<string>(state.scene.removed ?? []);
        let elements = removedSet.size > 0
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? currentElements.filter((el: any) => !removedSet.has(el.id))
          : currentElements;

        // Upsert (add or replace) elements
        if (state.scene.upsert?.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const upsertMap = new Map(state.scene.upsert.map((el: any) => [el.id, el]));
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          elements = elements.map((el: any) => upsertMap.get(el.id) ?? el);
          // Add truly new elements (not in existing array)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingIds = new Set(elements.map((el: any) => el.id));
          for (const el of state.scene.upsert) {
            if (!existingIds.has(el.id)) elements.push(el);
          }
        }

        // Elements from the server normalizer already have opacity: 100.
        // No additional mapping needed for the delta path.

        const currentAppState = currentProject.scene.appState ?? {};
        projectStore.updateScene({
          elements,
          appState: currentAppState,
          files: currentProject.scene.files ?? {},
        });

        // Only re-extract targets if element IDs changed (add/remove), not just property updates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prevIdSet = new Set(currentElements.map((e: any) => e.id));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (removedSet.size > 0 || state.scene.upsert?.some((el: any) => !prevIdSet.has(el.id))) {
          const targets = extractTargets(elements);
          projectStore.setTargets(targets);
        }
      }
    } else if (state.scene.elements) {
      // ── Full scene replacement (reconnect / initial sync) ──
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const elements = state.scene.elements.map((el: any) => ({ ...el, opacity: 100 }));

      if (!currentProject) {
        projectStore.createNewProject('MCP Live', {
          elements,
          appState: state.scene.appState ?? {},
          files: state.scene.files ?? {},
        });
      } else {
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
    }
  }

  // 2. Animation store
  if (state.timeline) {
    const animStore = useAnimationStore.getState();

    // Detect delta format (has upsertedTracks/removedTrackIds) vs full format (has tracks array)
    if (Array.isArray(state.timeline.upsertedTracks) || Array.isArray(state.timeline.removedTrackIds)) {
      // ── Delta timeline update ──
      const currentTimeline = animStore.timeline;
      let tracks = [...currentTimeline.tracks];

      // Remove deleted tracks
      if (state.timeline.removedTrackIds?.length > 0) {
        const removedSet = new Set<string>(state.timeline.removedTrackIds);
        tracks = tracks.filter(t => !removedSet.has(t.id));
      }

      // Upsert tracks
      if (state.timeline.upsertedTracks?.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const upsertMap = new Map<string, any>(state.timeline.upsertedTracks.map((t: any) => [t.id, t]));
        tracks = tracks.map(t => upsertMap.get(t.id) ?? t) as typeof tracks;
        const existingIds = new Set(tracks.map(t => t.id));
        for (const t of state.timeline.upsertedTracks) {
          if (!existingIds.has(t.id)) tracks.push(t);
        }
      }

      // Update metadata if present
      const duration = state.timeline.meta?.duration ?? currentTimeline.duration;
      const fps = state.timeline.meta?.fps ?? currentTimeline.fps;

      const updates: Record<string, unknown> = {
        timeline: { ...currentTimeline, tracks, duration, fps },
      };

      // Switch to animate mode when tracks appear
      if (tracks.length > 0 && useUIStore.getState().mode !== 'animate') {
        useUIStore.getState().setMode('animate');
      }

      useAnimationStore.setState(updates);
    } else if (state.timeline.tracks) {
      // ── Full timeline replacement ──
      const updates: Record<string, unknown> = { timeline: state.timeline };

      if (state.timeline.tracks.length > 0 && useUIStore.getState().mode !== 'animate') {
        useUIStore.getState().setMode('animate');
      }

      useAnimationStore.setState(updates);
    }
  }

  // Clip range (unchanged — always small payload)
  if (state.clipStart !== undefined && state.clipEnd !== undefined) {
    useAnimationStore.setState({
      clipStart: Math.max(0, state.clipStart),
      clipEnd: Math.max(state.clipStart + 100, state.clipEnd),
    });
  }

  // 3. Camera frame
  if (state.cameraFrame) {
    useProjectStore.getState().setCameraFrame(state.cameraFrame);
  }

  // 4. Recompute animation frame AFTER all stores are updated — but only
  // when scene or timeline actually changed (not for clip-only or camera-only updates).
  if (state.scene || state.timeline) {
    queueMicrotask(() => {
      const currentTime = usePlaybackStore.getState().currentTime;
      computeFrameAtTime(currentTime);
    });
  }
}
