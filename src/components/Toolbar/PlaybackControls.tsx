import { useState } from 'react';
import { ActionIcon, Group, Popover, TextInput, Tooltip, UnstyledButton } from '@mantine/core';
import {
  IconArrowRight,
  IconClock,
  IconPlayerSkipBack,
  IconPlayerPlay,
  IconPlayerPause,
  IconPlayerStop,
  IconPlayerSkipForward,
} from '@tabler/icons-react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useAnimationStore } from '../../stores/animationStore';
import { getPlaybackController, computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { formatTime } from '../../core/utils/math';
import { trackPlayback } from '../../services/analytics/posthog';
import { parseTimelineTimeEntry } from '../Timeline/timelineTime';

export function PlaybackControls() {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const playbackState = usePlaybackStore((s) => s.state);
  const duration = useAnimationStore((s) => s.timeline.duration);
  const fps = useAnimationStore((s) => s.timeline.fps);
  const [timeEditorOpen, setTimeEditorOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState('');
  const [timeError, setTimeError] = useState<string | null>(null);
  const isPlaying = playbackState === 'playing';

  const controller = getPlaybackController();
  const openTimeEditor = () => {
    setTimeDraft(formatTime(currentTime));
    setTimeError(null);
    setTimeEditorOpen(true);
  };
  const commitTime = () => {
    const result = parseTimelineTimeEntry(timeDraft, duration, fps);
    if (!result.ok) {
      setTimeError(result.error);
      return;
    }
    computeFrameAtTime(result.time);
    setTimeEditorOpen(false);
  };

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip label="Skip to start">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { controller.seek(0); computeFrameAtTime(0); }}>
          <IconPlayerSkipBack size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
        <ActionIcon variant={isPlaying ? 'light' : 'subtle'} color={isPlaying ? 'indigo' : 'gray'} size="sm" onClick={() => { trackPlayback(isPlaying ? 'pause' : 'play'); controller.togglePlayPause(); }}>
          {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Stop">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { trackPlayback('stop'); controller.stop(); }}>
          <IconPlayerStop size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Skip to end">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { const dur = controller.duration; controller.seek(dur); computeFrameAtTime(dur); }}>
          <IconPlayerSkipForward size={16} />
        </ActionIcon>
      </Tooltip>
      <Popover
        opened={timeEditorOpen}
        onChange={setTimeEditorOpen}
        position="bottom-end"
        width={260}
        trapFocus
        withArrow
        shadow="md"
      >
        <Popover.Target>
          <Tooltip label="Set current time" disabled={timeEditorOpen}>
            <UnstyledButton
              className="text-xs text-text-muted ml-1 font-mono w-16 text-center rounded-sm hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              aria-label={`Current time ${formatTime(currentTime)}. Set current time`}
              onClick={openTimeEditor}
            >
              {formatTime(currentTime)}
            </UnstyledButton>
          </Tooltip>
        </Popover.Target>
        <Popover.Dropdown p="xs">
          <Group gap="xs" align="flex-end" wrap="nowrap">
            <TextInput
              autoFocus
              label="Current time"
              description={`0 to ${formatTime(duration)} at ${fps} fps`}
              leftSection={<IconClock size={14} />}
              value={timeDraft}
              error={timeError}
              onChange={(event) => {
                setTimeDraft(event.currentTarget.value);
                setTimeError(null);
              }}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === 'Enter') {
                  event.preventDefault();
                  commitTime();
                } else if (event.key === 'Escape') {
                  setTimeEditorOpen(false);
                }
              }}
            />
            <Tooltip label="Go to time">
              <ActionIcon
                variant="light"
                color="indigo"
                aria-label="Go to time"
                onClick={commitTime}
              >
                <IconArrowRight size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Popover.Dropdown>
      </Popover>
    </div>
  );
}
