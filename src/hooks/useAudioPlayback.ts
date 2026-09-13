import { useEffect, useRef } from 'react';
import { notifications } from '@mantine/notifications';
import { getPlaybackController } from '../core/engine/playbackSingleton';
import { bindAudioPlayback, syncAudioTime } from '../services/audioPlayback';
import { usePlaybackStore } from '../stores/playbackStore';
import { useProjectStore } from '../stores/projectStore';

export function useAudioPlayback(): void {
  const attachment = useProjectStore((state) => state.project?.audio);
  const muted = usePlaybackStore((state) => state.audioMuted);
  const speed = usePlaybackStore((state) => state.speed);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    if (!attachment) {
      audio.removeAttribute('src');
      audio.load();
      return;
    }

    audio.src = attachment.dataUrl;
    audio.load();
    const controller = getPlaybackController();
    const handleLoaded = () => {
      syncAudioTime(audio, controller.currentTime);
      if (controller.isPlaying) {
        void audio.play().catch(showAudioPlaybackError);
      }
    };
    audio.addEventListener('loadedmetadata', handleLoaded);
    return () => audio.removeEventListener('loadedmetadata', handleLoaded);
  }, [attachment]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    return bindAudioPlayback(audio, getPlaybackController(), showAudioPlaybackError);
  }, []);
}

function showAudioPlaybackError(error: unknown): void {
  notifications.show({
    id: 'audio-playback-error',
    title: 'Audio playback unavailable',
    message: error instanceof Error ? error.message : 'The browser could not play this audio.',
    color: 'red',
  });
}
