import { ActionIcon, Tooltip } from '@mantine/core';
import { IconPlayerSkipBack, IconPlayerPlay, IconPlayerPause, IconPlayerStop, IconPlayerSkipForward } from '@tabler/icons-react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { getPlaybackController, computeFrameAtTime } from '../../core/engine/playbackSingleton';
import { formatTime } from '../../core/utils/math';

export function PlaybackControls() {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const playbackState = usePlaybackStore((s) => s.state);
  const isPlaying = playbackState === 'playing';

  const controller = getPlaybackController();

  return (
    <div className="flex items-center gap-0.5">
      <Tooltip label="Skip to start">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { controller.seek(0); computeFrameAtTime(0); }}>
          <IconPlayerSkipBack size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label={isPlaying ? 'Pause' : 'Play'}>
        <ActionIcon variant={isPlaying ? 'light' : 'subtle'} color={isPlaying ? 'indigo' : 'gray'} size="sm" onClick={() => controller.togglePlayPause()}>
          {isPlaying ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Stop">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => controller.stop()}>
          <IconPlayerStop size={16} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Skip to end">
        <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => { const dur = controller.duration; controller.seek(dur); computeFrameAtTime(dur); }}>
          <IconPlayerSkipForward size={16} />
        </ActionIcon>
      </Tooltip>
      <span className="text-xs text-text-muted ml-1 font-mono w-16 text-center">
        {formatTime(currentTime)}
      </span>
    </div>
  );
}
