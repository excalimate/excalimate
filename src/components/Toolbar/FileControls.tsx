import { useEffect, useRef, useState } from 'react';
import { Menu, Button, Modal, Select, Divider, TextInput } from '@mantine/core';
import {
  IconFilePlus, IconFolderOpen, IconDeviceFloppy,
  IconFileImport, IconShare, IconChevronDown, IconSettings, IconMaximize, IconServer, IconCheck,
} from '@tabler/icons-react';
import { ImportExcalidrawModal } from './ImportExcalidrawModal';
import { LoadAnimationModal } from './LoadAnimationModal';
import { useFileOperations } from './useFileOperations';
import { useShareOperations } from './useShareOperations';
import { useProjectStore, getExportResolution } from '../../stores/projectStore';
import type { AspectRatio } from '../../stores/projectStore';
import { useMcpLive } from '../../hooks/useMcpLive';

const RATIOS: AspectRatio[] = ['16:9', '4:3', '1:1', '3:2'];

export function FileControls() {
  const {
    handleNew, handleSave,
    handleImportFile, handleImportUrl,
    handleLoadProjectFile, handleLoadCheckpointFile, handleLoadShareUrl,
  } = useFileOperations();
  const { loading, handleShare } = useShareOperations();

  const [importOpen, setImportOpen] = useState(false);
  const [loadOpen, setLoadOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const aspectRatio = useProjectStore((s) => s.cameraFrame.aspectRatio);
  const { liveUrl, setLiveUrl } = useMcpLive();

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
          <Menu.Item leftSection={<IconFolderOpen size={16} />} onClick={() => setLoadOpen(true)}>
            Open
          </Menu.Item>
          <Menu.Item leftSection={<IconDeviceFloppy size={16} />} onClick={handleSave}>
            Save
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconFileImport size={16} />} onClick={() => setImportOpen(true)}>
            Import Excalidraw
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconShare size={16} />} onClick={handleShare} disabled={loading}>
            Share
          </Menu.Item>

          <Menu.Divider />

          <Menu.Item leftSection={<IconSettings size={16} />} onClick={() => setPrefsOpen(true)}>
            Preferences
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      <ImportExcalidrawModal
        opened={importOpen}
        onClose={() => setImportOpen(false)}
        onImportFile={handleImportFile}
        onImportUrl={handleImportUrl}
      />

      <LoadAnimationModal
        opened={loadOpen}
        onClose={() => setLoadOpen(false)}
        onLoadProjectFile={handleLoadProjectFile}
        onLoadCheckpointFile={handleLoadCheckpointFile}
        onLoadShareUrl={handleLoadShareUrl}
      />

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
          <Divider label="MCP Server" labelPosition="left" />
          <McpUrlInput liveUrl={liveUrl} setLiveUrl={setLiveUrl} />
        </div>
      </Modal>
    </>
  );
}

/** MCP URL input with a checkmark that appears briefly after the value is persisted. */
function McpUrlInput({ liveUrl, setLiveUrl }: { liveUrl: string; setLiveUrl: (url: string) => void }) {
  const [saved, setSaved] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = (value: string) => {
    setLiveUrl(value);
    setSaved(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSaved(false), 1500);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return (
    <TextInput
      label="Server URL"
      description="URL of your Excalimate MCP server"
      placeholder="http://localhost:3001"
      value={liveUrl}
      onChange={(e) => handleChange(e.currentTarget.value)}
      leftSection={<IconServer size={14} />}
      rightSection={saved ? <IconCheck size={14} color="var(--mantine-color-green-6)" /> : undefined}
    />
  );
}
