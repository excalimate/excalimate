import { useState } from 'react';
import { Menu, Button, Modal, Select } from '@mantine/core';
import {
  IconFilePlus, IconFolderOpen, IconDeviceFloppy,
  IconFileImport, IconPlug, IconLink, IconShare, IconChevronDown, IconSettings, IconMaximize,
} from '@tabler/icons-react';
import { ImportUrlModal } from './ImportUrlModal';
import { useFileOperations } from './useFileOperations';
import { useShareOperations } from './useShareOperations';
import { useProjectStore, getExportResolution } from '../../stores/projectStore';
import type { AspectRatio } from '../../stores/projectStore';

const RATIOS: AspectRatio[] = ['16:9', '4:3', '1:1', '3:2'];

export function FileControls() {
  const { handleNew, handleOpen, handleSave, handleImportFile, handleLoadCheckpoint } =
    useFileOperations();
  const {
    loading,
    handleShare,
    showUrlModal,
    setShowUrlModal,
    url,
    setUrl,
    handleImportUrl,
  } = useShareOperations();

  const [prefsOpen, setPrefsOpen] = useState(false);
  const aspectRatio = useProjectStore((s) => s.cameraFrame.aspectRatio);

  return (
    <>
      <Menu shadow="md" width={220} position="bottom-start">
        <Menu.Target>
          <Button variant="subtle" color="gray" size="compact-sm" rightSection={<IconChevronDown size={12} />}>
            File
          </Button>
        </Menu.Target>

        <Menu.Dropdown>
          <Menu.Item leftSection={<IconFilePlus size={16} />} onClick={handleNew}>
            New
          </Menu.Item>
          <Menu.Item leftSection={<IconFolderOpen size={16} />} onClick={handleOpen}>
            Open
          </Menu.Item>
          <Menu.Item leftSection={<IconDeviceFloppy size={16} />} onClick={handleSave}>
            Save
          </Menu.Item>

          <Menu.Divider />

          <Menu.Label>Import</Menu.Label>
          <Menu.Item leftSection={<IconFileImport size={16} />} onClick={handleImportFile}>
            Import file
          </Menu.Item>
          <Menu.Item leftSection={<IconPlug size={16} />} onClick={handleLoadCheckpoint}>
            MCP checkpoint
          </Menu.Item>
          <Menu.Item leftSection={<IconLink size={16} />} onClick={() => setShowUrlModal(true)}>
            From URL
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconShare size={16} />} onClick={handleShare}>
            Share
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => setPrefsOpen(true)}>
            Preferences
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {showUrlModal && (
        <ImportUrlModal
          isOpen={showUrlModal}
          url={url}
          loading={loading}
          onUrlChange={setUrl}
          onImport={handleImportUrl}
          onClose={() => {
            setShowUrlModal(false);
            setUrl('');
          }}
        />
      )}

      <Modal opened={prefsOpen} onClose={() => setPrefsOpen(false)} title="Preferences" size="sm">
        <div className="space-y-4">
          <Select
            label="Camera aspect ratio"
            value={aspectRatio}
            onChange={(v) => { if (v) useProjectStore.getState().setCameraAspectRatio(v as AspectRatio); }}
            data={RATIOS.map((r) => {
              const res = getExportResolution(r);
              return { value: r, label: `${r}  (${res.width}×${res.height})` };
            })}
          />
          <Button
            variant="light"
            size="xs"
            leftSection={<IconMaximize size={14} />}
            onClick={() => useProjectStore.getState().fitFrameToScene()}
          >
            Fit camera frame to scene
          </Button>
        </div>
      </Modal>
    </>
  );
}
