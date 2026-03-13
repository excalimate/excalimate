import { useEffect, useRef, useCallback } from 'react';
import { PlaybackController } from '../core/engine/PlaybackController';
import { usePlaybackStore } from '../stores/playbackStore';
import { useAnimationStore } from '../stores/animationStore';
import type { PlaybackState } from '../types/ui';

export function usePlayback() {
  const controllerRef = useRef<PlaybackController | null>(null);

  // Get store state/actions
  const {
    setCurrentTime,
    setPlaybackState,
    currentTime,
    state: playbackState,
    speed,
    loopMode,
  } = usePlaybackStore();
  const { timeline } = useAnimationStore();

  // Initialize controller
  useEffect(() => {
    const controller = new PlaybackController(timeline.duration);
    controllerRef.current = controller;

    // Sync frame callbacks to store
    const unsubFrame = controller.onFrame((time: number) => setCurrentTime(time));
    const unsubState = controller.onStateChange((state: PlaybackState) =>
      setPlaybackState(state),
    );

    return () => {
      unsubFrame();
      unsubState();
      controller.destroy();
    };
    // Only create once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync duration changes
  useEffect(() => {
    controllerRef.current?.setDuration(timeline.duration);
  }, [timeline.duration]);

  // Sync speed changes
  useEffect(() => {
    controllerRef.current?.setSpeed(speed);
  }, [speed]);

  // Sync loop mode
  useEffect(() => {
    controllerRef.current?.setLoopMode(loopMode);
  }, [loopMode]);

  const play = useCallback(() => controllerRef.current?.play(), []);
  const pause = useCallback(() => controllerRef.current?.pause(), []);
  const stop = useCallback(() => controllerRef.current?.stop(), []);
  const togglePlayPause = useCallback(
    () => controllerRef.current?.togglePlayPause(),
    [],
  );
  const seek = useCallback(
    (time: number) => {
      controllerRef.current?.seek(time);
      setCurrentTime(time);
    },
    [setCurrentTime],
  );
  const seekToStart = useCallback(() => seek(0), [seek]);
  const seekToEnd = useCallback(
    () => seek(timeline.duration),
    [seek, timeline.duration],
  );

  return {
    play,
    pause,
    stop,
    togglePlayPause,
    seek,
    seekToStart,
    seekToEnd,
    currentTime,
    isPlaying: playbackState === 'playing',
    playbackState,
  };
}
