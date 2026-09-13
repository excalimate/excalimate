// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlaybackController } from '../core/engine/PlaybackController';
import { bindAudioPlayback } from './audioPlayback';

describe('audio playback synchronization', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('seeks, plays, pauses, and stops with the animation controller', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const controller = new PlaybackController(5_000);
    const audio = createAudioDouble();
    const unbind = bindAudioPlayback(audio.element, controller, vi.fn());

    controller.seek(1_250);
    expect(audio.element.currentTime).toBe(1.25);

    controller.play();
    await Promise.resolve();
    expect(audio.play).toHaveBeenCalledOnce();

    controller.pause();
    expect(audio.pause).toHaveBeenCalled();

    controller.stop();
    expect(audio.element.currentTime).toBe(0);
    unbind();
  });

  it('reports browser playback failures without stopping animation', async () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const controller = new PlaybackController(5_000);
    const audio = createAudioDouble();
    const failure = new Error('blocked');
    audio.play.mockRejectedValueOnce(failure);
    const onPlayError = vi.fn();
    bindAudioPlayback(audio.element, controller, onPlayError);

    controller.play();
    await Promise.resolve();
    await Promise.resolve();

    expect(controller.isPlaying).toBe(true);
    expect(onPlayError).toHaveBeenCalledWith(failure);
  });
});

function createAudioDouble(): {
  element: HTMLAudioElement;
  play: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
} {
  const play = vi.fn(async () => undefined);
  const pause = vi.fn();
  return {
    element: {
      src: 'data:audio/mpeg;base64,AQID',
      readyState: 1,
      currentTime: 0,
      duration: 5,
      paused: true,
      play,
      pause,
    } as unknown as HTMLAudioElement,
    play,
    pause,
  };
}
