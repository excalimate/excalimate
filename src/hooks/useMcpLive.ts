/**
 * useMcpLive — Connects to the MCP server's SSE endpoint for real-time state updates.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';
import { useUIStore } from '../stores/uiStore';
import { extractTargets } from '../components/Canvas/ExcalidrawEditor';
import { computeFrameAtTime } from '../core/engine/playbackSingleton';

const DEFAULT_URL = import.meta.env.VITE_MCP_SERVER_URL ?? 'http://localhost:3001';

export function useMcpLive() {
  const [connected, setConnected] = useState(false);
  const [liveUrl, setLiveUrl] = useState(DEFAULT_URL);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback((url: string = liveUrl) => {
    // Close existing connection
    eventSourceRef.current?.close();

    const es = new EventSource(`${url}/live`);
    eventSourceRef.current = es;

    es.onopen = async () => {
      if (import.meta.env.DEV) console.log('[MCP Live] Connected to', url);

      try {
        const res = await fetch(`${url}/state`);
        if (!res.ok) {
          console.error('[MCP Live] Failed to fetch initial state:', res.statusText);
          return;
        }
        const state = await res.json();
        if (state?.scene?.elements) {
          applyState(state);
        }
      } catch (e) {
        console.error('[MCP Live] Failed to fetch initial state:', e);
      }

      setConnected(true);
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
      setConnected(false);
      // Auto-reconnect is handled by EventSource
    };

    setLiveUrl(url);
  }, [liveUrl]);

  const disconnect = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
    setConnected(false);
    if (import.meta.env.DEV) console.log('[MCP Live] Disconnected');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      eventSourceRef.current?.close();
    };
  }, []);

  return { connected, connect, disconnect, liveUrl, setLiveUrl };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyState(state: any) {
  // Update scene
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

  // Update timeline
  if (state.timeline) {
    useAnimationStore.getState().setTimeline(state.timeline);
  }

  // Update clip range
  if (state.clipStart !== undefined && state.clipEnd !== undefined) {
    useAnimationStore.getState().setClipRange(state.clipStart, state.clipEnd);
  }

  // Update camera frame
  if (state.cameraFrame) {
    useProjectStore.getState().setCameraFrame(state.cameraFrame);
  }

  // Recompute animation at current playhead position (don't reset playhead)
  const currentTime = usePlaybackStore.getState().currentTime;
  computeFrameAtTime(currentTime);
}
