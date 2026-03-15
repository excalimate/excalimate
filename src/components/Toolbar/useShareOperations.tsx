import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import {
  encryptData,
  exportKeyToString,
  generateEncryptionKey,
} from '../../services/encryption';

export function useShareOperations() {
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    const project = useProjectStore.getState().project;
    if (!project?.scene) {
      notifications.show({
        title: 'Nothing to share',
        message: 'Create or import a project first.',
        color: 'yellow',
      });
      return;
    }
    try {
      setLoading(true);
      const timeline = useAnimationStore.getState().timeline;
      const { clipStart, clipEnd } = useAnimationStore.getState();
      const cameraFrame = useProjectStore.getState().cameraFrame;

      const payload = {
        name: project.name,
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
      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }
      const { id } = await response.json();

      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${id},${keyStr}`;
      await navigator.clipboard.writeText(shareUrl);
      notifications.show({
        title: 'Share link copied',
        message: 'The encryption key is in the URL — the server cannot read your data.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (e) {
      notifications.show({
        title: 'Share failed',
        message: e instanceof Error ? e.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    handleShare,
  };
}
