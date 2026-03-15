import { useState } from 'react';
import { Modal, TextInput, Button, Text, Group, Stack, Divider, rem } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { Dropzone } from '@mantine/dropzone';
import { IconFileImport, IconLink, IconUpload, IconX, IconFile, IconCheck } from '@tabler/icons-react';

interface ImportExcalidrawModalProps {
  opened: boolean;
  onClose: () => void;
  onImportFile: (file: File) => Promise<void>;
  onImportUrl: (url: string) => Promise<void>;
}

export function ImportExcalidrawModal({
  opened,
  onClose,
  onImportFile,
  onImportUrl,
}: ImportExcalidrawModalProps) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onImportUrl(url.trim());
      setUrl('');
      notifications.show({
        title: 'Import successful',
        message: 'Excalidraw scene imported from URL.',
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to import from URL';
      setError(msg);
      notifications.show({
        title: 'Import failed',
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
    setLoading(true);
    setError(null);
    try {
      await onImportFile(files[0]);
      notifications.show({
        title: 'Import successful',
        message: `Imported "${files[0].name}".`,
        color: 'green',
        icon: <IconCheck size={16} />,
      });
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to import file';
      setError(msg);
      notifications.show({
        title: 'Import failed',
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
          <IconFileImport size={18} />
          <Text fw={600}>Import Excalidraw</Text>
        </Group>
      }
      size="md"
    >
      <Stack gap="md">
        {/* URL import */}
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            Paste an Excalidraw sharing link to import the drawing.
          </Text>
          <Group gap="xs" align="flex-end">
            <TextInput
              placeholder="https://excalidraw.com/#json=..."
              value={url}
              onChange={(e) => setUrl(e.currentTarget.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport(); }}
              disabled={loading}
              leftSection={<IconLink size={14} />}
              style={{ flex: 1 }}
            />
            <Button
              size="sm"
              onClick={handleUrlImport}
              disabled={!url.trim()}
              loading={loading}
            >
              Import
            </Button>
          </Group>
        </Stack>

        <Divider label="OR" labelPosition="center" />

        {/* File drop zone */}
        <Dropzone
          onDrop={handleFileDrop}
          accept={[
            'application/json',
            '.excalidraw',
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
                Drag an Excalidraw file here or click to browse
              </Text>
              <Text size="xs" c="dimmed" inline mt={4}>
                Accepts .excalidraw and .json files
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
