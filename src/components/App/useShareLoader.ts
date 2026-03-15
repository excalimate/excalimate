import { useEffect, useState } from 'react';
import { extractTargets } from '../Canvas/extractTargets';
import { computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { decryptData, importKeyFromString } from '../../services/encryption';

export function useShareLoader(): void {
  const [shareLoaded, setShareLoaded] = useState(false);

  useEffect(() => {
    if (shareLoaded) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return;
    setShareLoaded(true);

    const parts = hash.slice('#share='.length).split(',');
    if (parts.length < 2) return;
    const [shareId, keyStr] = parts;

    (async () => {
      try {
        const serverUrl = import.meta.env.VITE_MCP_SERVER_URL ?? 'http://localhost:3001';
        const response = await fetch(`${serverUrl}/share/${shareId}`);
        if (!response.ok) throw new Error('Share not found');
        const encrypted = await response.arrayBuffer();
        const key = await importKeyFromString(keyStr);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await decryptData<any>(encrypted, key);

        if (data.scene?.elements) {
          useProjectStore.getState().createNewProject('Shared Animation', {
            elements: data.scene.elements,
            appState: data.scene.appState ?? {},
            files: data.scene.files ?? {},
          });
          const targets = extractTargets(data.scene.elements);
          useProjectStore.getState().setTargets(targets);
          if (data.timeline) useAnimationStore.getState().setTimeline(data.timeline);
          if (data.cameraFrame) useProjectStore.getState().setCameraFrame(data.cameraFrame);
          if (data.clipStart !== undefined) useAnimationStore.getState().setClipRange(data.clipStart, data.clipEnd);
          useUIStore.getState().setMode('animate');
          computeFrameAtTime(0);
        }
      } catch (e) {
        console.error('Failed to load shared animation:', e);
      }
    })();
  }, [shareLoaded]);
}
