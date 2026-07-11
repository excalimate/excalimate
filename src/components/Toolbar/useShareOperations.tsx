import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useProjectStore } from '../../stores/projectStore';
import { useAnimationStore } from '../../stores/animationStore';
import { encryptData, exportKeyToString, generateEncryptionKey } from '../../services/encryption';
import { trackShare } from '../../services/analytics/posthog';
import {
  buildEditorShareUrl,
  deleteEncryptedShare,
  formatShareExpiry,
  type ShareDeleteCapability,
  uploadEncryptedShare,
} from '../../services/shareApi';

export function useShareOperations() {
  const [loading, setLoading] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [deleteCapability, setDeleteCapability] = useState<ShareDeleteCapability | null>(null);

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

      const { id, expiresAt, deleteSecret } = await uploadEncryptedShare(encrypted);
      setDeleteCapability({ id, deleteSecret });

      const shareUrl = buildEditorShareUrl(
        `${window.location.origin}${window.location.pathname}`,
        id,
        keyStr,
      );
      await navigator.clipboard.writeText(shareUrl);
      trackShare();
      notifications.show({
        title: 'Share link copied',
        message: `E2E encrypted. The link expires ${formatShareExpiry(expiresAt)}.`,
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

  const handleRevokeShare = async () => {
    if (!deleteCapability) return;
    const revokedCapability = deleteCapability;

    try {
      setRevoking(true);
      await deleteEncryptedShare(revokedCapability);
      setDeleteCapability((current) => (current?.id === revokedCapability.id ? null : current));
      notifications.show({
        title: 'Share revoked',
        message: 'The encrypted share is no longer available from the share service.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
    } catch (e) {
      notifications.show({
        title: 'Revoke failed',
        message: e instanceof Error ? e.message : 'Unknown error',
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setRevoking(false);
    }
  };

  return {
    canRevoke: deleteCapability !== null,
    handleRevokeShare,
    loading,
    handleShare,
    revoking,
  };
}
