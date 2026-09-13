import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTimeline } from '../core/models/Timeline';
import { useAnimationStore } from '../stores/animationStore';
import { usePlaybackStore } from '../stores/playbackStore';
import { useUIStore } from '../stores/uiStore';
import { useAppHotkeys } from './useAppHotkeys';

function HotkeyHarness({ onCanvasKeyDown }: { onCanvasKeyDown: () => void }) {
  useAppHotkeys();
  return (
    <>
      <div data-testid="excalidraw-host" tabIndex={0} onKeyDown={onCanvasKeyDown} />
      <input aria-label="Editable timeline name" onKeyDown={onCanvasKeyDown} />
    </>
  );
}

describe('useAppHotkeys canvas routing', () => {
  beforeEach(() => {
    useUIStore.setState({
      mode: 'animate',
      selectedElementIds: [],
    });
    usePlaybackStore.setState({ currentTime: 1_000 });
    useAnimationStore.setState({
      timeline: {
        ...createTimeline('Hotkeys', 3_000, 60),
        tracks: [
          {
            id: 'opacity-track',
            targetId: 'title',
            targetType: 'element',
            property: 'opacity',
            enabled: true,
            keyframes: [
              { id: 'previous', time: 500, value: 0, easing: 'linear' },
              { id: 'next', time: 1_500, value: 1, easing: 'linear' },
            ],
          },
        ],
      },
      clipStart: 0,
      clipEnd: 3_000,
    });
  });

  it.each([
    ['k', 1_500],
    ['j', 500],
  ])(
    'captures %s before the focused Excalidraw host can activate a canvas tool',
    (key, expectedTime) => {
      const onCanvasKeyDown = vi.fn();
      render(<HotkeyHarness onCanvasKeyDown={onCanvasKeyDown} />);
      const canvas = screen.getByTestId('excalidraw-host');
      canvas.focus();

      const eventWasNotCancelled = fireEvent.keyDown(canvas, { key });

      expect(eventWasNotCancelled).toBe(false);
      expect(onCanvasKeyDown).not.toHaveBeenCalled();
      expect(usePlaybackStore.getState().currentTime).toBe(expectedTime);
    },
  );

  it('ignores timeline shortcuts from editable targets', () => {
    const onCanvasKeyDown = vi.fn();
    render(<HotkeyHarness onCanvasKeyDown={onCanvasKeyDown} />);
    const input = screen.getByRole('textbox', { name: 'Editable timeline name' });
    input.focus();

    const eventWasNotCancelled = fireEvent.keyDown(input, { key: 'k' });

    expect(eventWasNotCancelled).toBe(true);
    expect(onCanvasKeyDown).toHaveBeenCalledOnce();
    expect(usePlaybackStore.getState().currentTime).toBe(1_000);
  });
});
