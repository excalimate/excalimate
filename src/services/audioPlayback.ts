import type { PlaybackController } from '../core/engine/PlaybackController';

const MAX_AUDIO_DRIFT_SECONDS = 0.12;
const HAVE_METADATA = 1;

export function bindAudioPlayback(
  audio: HTMLAudioElement,
  controller: PlaybackController,
  onPlayError: (error: unknown) => void,
): () => void {
  let playPending = false;

  const play = async (): Promise<void> => {
    if (playPending || !audio.paused || audio.currentTime >= audio.duration) return;
    playPending = true;
    try {
      await audio.play();
    } catch (error) {
      onPlayError(error);
    } finally {
      playPending = false;
    }
  };

  const unsubscribeFrame = controller.onFrame((timeMs) => {
    if (!audio.src || audio.readyState < HAVE_METADATA) return;
    const targetSeconds = timeMs / 1_000;
    if (targetSeconds >= audio.duration) {
      audio.pause();
      return;
    }
    if (
      !controller.isPlaying ||
      Math.abs(audio.currentTime - targetSeconds) > MAX_AUDIO_DRIFT_SECONDS
    ) {
      syncAudioTime(audio, timeMs);
    }
    if (controller.isPlaying && audio.paused) void play();
  });
  const unsubscribeState = controller.onStateChange((state) => {
    if (!audio.src) return;
    if (state === 'playing') {
      syncAudioTime(audio, controller.currentTime);
      void play();
    } else {
      audio.pause();
      playPending = false;
      if (state === 'stopped') syncAudioTime(audio, 0);
    }
  });

  return () => {
    unsubscribeFrame();
    unsubscribeState();
  };
}

export function syncAudioTime(audio: HTMLAudioElement, timeMs: number): void {
  if (audio.readyState < HAVE_METADATA) return;
  audio.currentTime = Math.min(Math.max(0, timeMs / 1_000), audio.duration);
}
