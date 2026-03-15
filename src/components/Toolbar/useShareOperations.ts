import { useState } from 'react';
import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import { importFromUrl } from '../../services/FileService';
import {
  encryptData,
  exportKeyToString,
  generateEncryptionKey,
} from '../../services/encryption';
import { extractTargets } from '../Canvas/extractTargets';

export function useShareOperations() {
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const handleImportUrl = async () => {
    if (!url.trim()) return;
    setLoading(true);
    try {
      const scene = await importFromUrl(url.trim());
      useProjectStore.getState().createNewProject('Imported from URL', scene);
      const targets = extractTargets(scene.elements);
      useProjectStore.getState().setTargets(targets);
      useAnimationStore.getState().setTimeline({
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        name: 'Animation 1',
        duration: 30000,
        fps: 60,
        tracks: [],
      });
      setShowUrlModal(false);
      setUrl('');
    } catch (e) {
      window.alert(
        `Failed to import from URL: ${e instanceof Error ? e.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const project = useProjectStore.getState().project;
    if (!project?.scene) {
      window.alert('No project to share.');
      return;
    }
    try {
      setLoading(true);
      const timeline = useAnimationStore.getState().timeline;
      const { clipStart, clipEnd } = useAnimationStore.getState();
      const cameraFrame = useProjectStore.getState().cameraFrame;

      const payload = {
        scene: project.scene,
        timeline,
        clipStart,
        clipEnd,
        cameraFrame,
      };

      const key = await generateEncryptionKey();
      const encrypted = await encryptData(payload, key);
      const keyStr = await exportKeyToString(key);

      const serverUrl = import.meta.env.VITE_MCP_SERVER_URL ?? 'http://localhost:3001';
      const response = await fetch(`${serverUrl}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encrypted,
      });
      const { id } = await response.json();

      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${id},${keyStr}`;
      await navigator.clipboard.writeText(shareUrl);
      window.alert(
        'Share link copied to clipboard!\n\nThe encryption key is in the URL — the server cannot read your data.',
      );
    } catch (e) {
      window.alert(`Failed to share: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleShare,
    showUrlModal,
    setShowUrlModal,
    url,
    setUrl,
    handleImportUrl,
  };
}
