import { IconButton } from '../common';
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
      <IconButton
        icon="⏮"
        tooltip="Skip to start"
        size="sm"
        onClick={() => {
          controller.seek(0);
          computeFrameAtTime(0);
        }}
      />
      <IconButton
        icon={isPlaying ? '⏸' : '▶'}
        tooltip={isPlaying ? 'Pause' : 'Play'}
        size="sm"
        onClick={() => controller.togglePlayPause()}
        active={isPlaying}
      />
      <IconButton
        icon="⏹"
        tooltip="Stop"
        size="sm"
        onClick={() => controller.stop()}
      />
      <IconButton
        icon="⏭"
        tooltip="Skip to end"
        size="sm"
        onClick={() => {
          const dur = controller.duration;
          controller.seek(dur);
          computeFrameAtTime(dur);
        }}
      />
      <span className="text-xs text-[var(--color-text-secondary)] ml-1 font-mono w-16 text-center">
        {formatTime(currentTime)}
      </span>
    </div>
  );
}
