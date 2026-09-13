import { useRef, useState } from 'react';
import { ActionIcon, FileButton, Group, Menu, Text } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconMusic,
  IconRefresh,
  IconTrash,
  IconUpload,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { formatTime } from '../../core/utils/math';
import { useAudioPlayback } from '../../hooks/useAudioPlayback';
import { AUDIO_FILE_ACCEPT, attachAudioFile } from '../../services/audioAttachment';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';

export function AudioControls() {
  useAudioPlayback();
  const attachment = useProjectStore((state) => state.project?.audio);
  const projectLoaded = useProjectStore((state) => Boolean(state.project));
  const muted = usePlaybackStore((state) => state.audioMuted);
  const [importing, setImporting] = useState(false);
  const resetRef = useRef<() => void>(null);

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setImporting(true);
    try {
      const audio = await attachAudioFile(file);
      notifications.show({
        title: attachment ? 'Audio replaced' : 'Audio attached',
        message: `${audio.fileName} is synchronized with the animation timeline.`,
        color: 'green',
      });
    } catch (error) {
      notifications.show({
        title: 'Could not import audio',
        message: error instanceof Error ? error.message : 'The selected file is not valid audio.',
        color: 'red',
      });
    } finally {
      resetRef.current?.();
      setImporting(false);
    }
  };

  return (
    <Menu keepMounted shadow="md" width={260} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          aria-label={attachment ? `Audio attached: ${attachment.fileName}` : 'Attach audio'}
          title={attachment ? `Audio: ${attachment.fileName}` : 'Attach audio'}
          variant={attachment ? 'light' : 'subtle'}
          color={attachment ? 'indigo' : 'gray'}
          loading={importing}
          disabled={!projectLoaded}
        >
          <IconMusic size={17} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {attachment ? (
          <>
            <Menu.Label>Animation audio</Menu.Label>
            <Group gap="xs" px="sm" pb="xs" wrap="nowrap">
              <IconMusic size={18} />
              <div style={{ minWidth: 0 }}>
                <Text size="sm" fw={500} truncate>
                  {attachment.fileName}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatTime(attachment.durationMs)} ·{' '}
                  {(attachment.sizeBytes / (1024 * 1024)).toFixed(1)} MiB
                </Text>
              </div>
            </Group>
            <Menu.Item
              leftSection={muted ? <IconVolume size={16} /> : <IconVolumeOff size={16} />}
              onClick={() => usePlaybackStore.getState().setAudioMuted(!muted)}
            >
              {muted ? 'Unmute audio' : 'Mute audio'}
            </Menu.Item>
            <FileButton
              resetRef={resetRef}
              accept={AUDIO_FILE_ACCEPT}
              onChange={(file) => void handleFile(file)}
            >
              {(props) => (
                <Menu.Item {...props} closeMenuOnClick={false} leftSection={<IconRefresh size={16} />}>
                  Replace audio
                </Menu.Item>
              )}
            </FileButton>
            <Menu.Item
              color="red"
              leftSection={<IconTrash size={16} />}
              onClick={() => {
                useProjectStore.getState().setAudioAttachment(undefined);
                notifications.show({
                  title: 'Audio removed',
                  message: 'The animation no longer has an audio attachment.',
                  color: 'gray',
                });
              }}
            >
              Remove audio
            </Menu.Item>
          </>
        ) : (
          <>
            <Menu.Label>Animation audio</Menu.Label>
            <Text size="xs" c="dimmed" px="sm" pb="xs">
              Import one browser-compatible audio file. It will be embedded in the project.
            </Text>
            <FileButton
              resetRef={resetRef}
              accept={AUDIO_FILE_ACCEPT}
              onChange={(file) => void handleFile(file)}
            >
              {(props) => (
                <Menu.Item {...props} closeMenuOnClick={false} leftSection={<IconUpload size={16} />}>
                  Import audio
                </Menu.Item>
              )}
            </FileButton>
          </>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
