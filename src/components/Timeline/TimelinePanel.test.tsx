import { MantineProvider } from '@mantine/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnimationTrack } from '../../types/animation';
import { usePlaybackStore } from '../../stores/playbackStore';
import { TimelinePanel, type TimelinePanelProps } from './TimelinePanel';

const tracks: AnimationTrack[] = [
  {
    id: 'opacity-track',
    targetId: 'title',
    targetType: 'element',
    property: 'opacity',
    enabled: true,
    keyframes: [],
  },
];

function renderTimeline(
  overrides: Partial<TimelinePanelProps> = {},
) {
  const props: TimelinePanelProps = {
    tracks,
    duration: 1_000,
    currentTime: 0,
    selectedTrackId: null,
    selectedKeyframeIds: [],
    selectedElementIds: [],
    clipStart: 0,
    clipEnd: 1_000,
    onSelectTrack: vi.fn(),
    onSelectKeyframes: vi.fn(),
    onAddKeyframe: vi.fn(),
    onMoveKeyframe: vi.fn(),
    onDeleteKeyframe: vi.fn(),
    onScrub: vi.fn(),
    onToggleTrackEnabled: vi.fn(),
    onRemoveTrack: vi.fn(),
    onSelectElements: vi.fn(),
    onClipRangeChange: vi.fn(),
    targetLabels: new Map([['title', 'Title']]),
    targetOrder: new Map([['title', 0]]),
    targetParents: new Map([['title', undefined]]),
    ...overrides,
  };

  render(
    <MantineProvider>
      <TimelinePanel {...props} />
    </MantineProvider>,
  );

  return props;
}

describe('TimelinePanel target rows', () => {
  beforeEach(() => {
    usePlaybackStore.setState({
      currentTime: 0,
      state: 'stopped',
      speed: 1,
      loopMode: 'none',
      frameState: new Map(),
    });
  });

  it('selects an object from its name without expanding its properties', () => {
    const onSelectElements = vi.fn();
    renderTimeline({ onSelectElements });

    fireEvent.click(screen.getByRole('button', { name: 'Select Title' }));

    expect(onSelectElements).toHaveBeenCalledWith(['title']);
    expect(screen.queryByText('Opacity')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Expand animated properties for Title',
      }),
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles disclosure independently without changing selection', () => {
    const onSelectElements = vi.fn();
    renderTimeline({ onSelectElements });

    const disclosure = screen.getByRole('button', {
      name: 'Expand animated properties for Title',
    });
    disclosure.focus();
    fireEvent.click(disclosure);

    expect(onSelectElements).not.toHaveBeenCalled();
    expect(screen.getByText('Opacity')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Collapse animated properties for Title',
      }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('supports additive modifier selection from object names', () => {
    const onSelectElements = vi.fn();
    renderTimeline({
      selectedElementIds: ['body'],
      onSelectElements,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Select Title' }), {
      shiftKey: true,
    });

    expect(onSelectElements).toHaveBeenCalledWith(['body', 'title']);
  });
});
