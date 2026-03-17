import { useState } from 'react';
import { Modal, TextInput, Select, Group, Button, Stack } from '@mantine/core';
import { IconFilePlus } from '@tabler/icons-react';
import { getExportResolution } from '../../stores/projectStore';
import type { AspectRatio } from '../../stores/projectStore';

const RATIOS: AspectRatio[] = ['16:9', '4:3', '1:1', '3:2'];

interface NewProjectModalProps {
  opened: boolean;
  onClose: () => void;
  onCreate: (name: string, aspectRatio: AspectRatio) => void;
}

export function NewProjectModal({ opened, onClose, onCreate }: NewProjectModalProps) {
  const [name, setName] = useState('Untitled Animation');
  const [ratio, setRatio] = useState<AspectRatio>('16:9');

  const handleCreate = () => {
    onCreate(name.trim() || 'Untitled Animation', ratio);
    onClose();
    // Reset for next open
    setName('Untitled Animation');
    setRatio('16:9');
  };

  return (
    <Modal opened={opened} onClose={onClose} title="New Project" size="sm">
      <Stack gap="md">
        <TextInput
          label="Project name"
          placeholder="My animation"
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
          data-autofocus
        />
        <Select
          label="Camera aspect ratio"
          value={ratio}
          onChange={(v) => { if (v) setRatio(v as AspectRatio); }}
          data={RATIOS.map((r) => {
            const res = getExportResolution(r);
            return { value: r, label: `${r}  (${res.width}×${res.height})` };
          })}
        />
        <Group justify="flex-end" mt="xs">
          <Button variant="default" onClick={onClose}>Cancel</Button>
          <Button leftSection={<IconFilePlus size={16} />} onClick={handleCreate}>
            Create
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
