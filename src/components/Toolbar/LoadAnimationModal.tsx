import { useState } from 'react';
import { Modal, TextInput, Button, Text, Group, Stack, Divider, rem } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Dropzone } from '@mantine/dropzone';
import { IconFolderOpen, IconLink, IconUpload, IconX, IconFile, IconCheck } from '@tabler/icons-react';

interface LoadAnimationModalProps {
  opened: boolean;
  onClose: () => void;
  onLoadProjectFile: (file: File) => Promise<void>;
  onLoadCheckpointFile: (file: File) => Promise<void>;
  onLoadShareUrl: (url: string) => Promise<void>;
}

export function LoadAnimationModal({
  opened,
  onClose,
  onLoadProjectFile,
  onLoadCheckpointFile,
  onLoadShareUrl,
}: LoadAnimationModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlLoad = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onLoadShareUrl(url.trim());
      notifications.show({
        title: 'Animation loaded',
        message: 'Shared animation loaded successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      setUrl('');
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load from URL';
      setError(msg);
      notifications.show({
        title: 'Load failed',
        message: msg,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileDrop = async (files: File[]) => {
    if (files.length === 0) return;
    const file = files[0];
    setLoading(true);
    setError(null);
    try {
      // Detect file type: .excanim → project, .json → try project first, fall back to checkpoint
      const isExcanim = file.name.endsWith('.excanim');
      if (isExcanim) {
        await onLoadProjectFile(file);
      } else {
        // Try as project first, fall back to MCP checkpoint
        try {
          await onLoadProjectFile(file);
        } catch {
          await onLoadCheckpointFile(file);
        }
      }
      notifications.show({
        title: 'Animation loaded',
        message: `Loaded "${file.name}".`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load file';
      setError(msg);
      notifications.show({
        title: 'Load failed',
        message: msg,
        color: 'red',
        icon: <IconX size={16} />,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setError(null);
    setLoading(false);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Group gap="xs">
          <IconFolderOpen size={18} />
          <Text fw={600}>Open Animation</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        {/* Share URL input */}
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Paste an E2E encrypted share link to load a shared animation.
          </Text>
          <Group gap="xs" align="flex-end">
            <TextInput
              placeholder="https://excalimate.com/#share=ID,KEY"
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUrlLoad(); }}
              disabled={loading}
              leftSection={<IconLink size={14} />}
              style={{ flex: 1 }}
            />
            <Button
              size="sm"
              onClick={handleUrlLoad}
              disabled={!url.trim()}
              loading={loading}
            >
              Load
            </Button>
          </Group>
        </Stack>

        <Divider label="OR" labelPosition="center" />

        {/* File drop zone */}
        <Dropzone
          onDrop={handleFileDrop}
          accept={[
            'application/json',
            '.excanim',
            '.json',
          ]}
          maxFiles={1}
          loading={loading}
          disabled={loading}
        >
          <Group justify="center" gap="xl" mih={120} style={{ pointerEvents: 'none' }}>
            <Dropzone.Accept>
              <IconUpload style={{ width: rem(42), height: rem(42) }} stroke={1.5} />
            </Dropzone.Accept>
            <Dropzone.Reject>
              <IconX style={{ width: rem(42), height: rem(42) }} stroke={1.5} color="var(--mantine-color-red-6)" />
            </Dropzone.Reject>
            <Dropzone.Idle>
              <IconFile style={{ width: rem(42), height: rem(42) }} stroke={1.5} color="var(--mantine-color-dimmed)" />
            </Dropzone.Idle>
            <div>
              <Text size="sm" inline>
                Drag an animation file here or click to browse
              </Text>
              <Text size="xs" c="dimmed" inline mt={4}>
                Accepts .excanim projects and .json MCP checkpoints
              </Text>
            </div>
          </Group>
        </Dropzone>

        {error && (
          <Text c="red" size="sm">{error}</Text>
        )}
      </Stack>
    </Modal>
  );
}
