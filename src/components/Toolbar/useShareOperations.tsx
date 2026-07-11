import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useProjectStore } from '../../stores/projectStore';
import {
  encryptData,
  exportKeyToString,
  generateEncryptionKey,
} from '../../services/encryption';
import { trackShare } from '../../services/analytics/posthog';
import { captureProjectDocument } from '../../services/ProjectDocumentService';

const SHARE_API_URL = import.meta.env.VITE_SHARE_API_URL ?? 'https://share.excalimate.com';

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
      const payload = captureProjectDocument();
      if (!payload) throw new Error('No project to share');

      const key = await generateEncryptionKey();
      const encrypted = await encryptData(payload, key);
      const keyStr = await exportKeyToString(key);

      // Upload encrypted blob to share service (Cloudflare Worker + R2)
      const response = await fetch(`${SHARE_API_URL}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: encrypted,
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error((err as { error?: string }).error ?? `Upload failed: ${response.status}`);
      }
      const { id } = await response.json() as { id: string };

      const shareUrl = `${window.location.origin}${window.location.pathname}#share=${id},${keyStr}`;
      await navigator.clipboard.writeText(shareUrl);
      trackShare();
      notifications.show({
        title: 'Share link copied',
        message: 'E2E encrypted — the server only stores an encrypted blob it cannot read.',
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
