import { beforeEach, describe, expect, it } from 'vitest';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { AnimationAction } from '@excalimate/project-schema';
import { createTimeline } from '../../core/models/Timeline';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import type { AnimatableTarget } from '../../types/excalidraw';
import { createAction } from '../../services/AnimationCommandService';
import { ActionList } from './ActionList';

function target(id: string, label: string): AnimatableTarget {
  return {
    id,
    type: 'element',
    label,
    elementIds: [id],
    originalBounds: {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      centerX: 50,
      centerY: 50,
    },
    originalAngle: 0,
    zIndex: 0,
  };
}

function renderActionList() {
  return render(
    <MantineProvider>
      <Notifications />
      <ActionList />
    </MantineProvider>,
  );
}

describe('Sequence ActionList', () => {
  beforeEach(() => {
    getPlaybackController();
    useProjectStore.setState({
      targets: [target('element-1', 'Title'), target('element-2', 'Body')],
    });
    useAnimationStore.setState({
      timeline: createTimeline('Test', 10_000, 60),
      actions: [],
      timelineRevision: 0,
      documentRevision: 0,
      selectedTrackId: null,
      selectedKeyframeIds: [],
      clipboardKeyframes: [],
      clipStart: 0,
      clipEnd: 10_000,
    });
    usePlaybackStore.setState({ currentTime: 0, frameState: new Map() });
    useUIStore.setState({ workspace: 'sequence', selectedElementIds: [] });
    useUndoRedoStore.getState().clearHistory();
  });

  it('renders semantic managed, invalid, and unmanaged rows without hiding them', () => {
    const invalid: AnimationAction = {
      id: 'invalid-action',
      type: 'fade',
      preset: 'fade',
      targetIds: ['missing-target'],
      timing: {
        startMs: 0,
        durationMs: 650,
        staggerMs: 0,
        startMode: 'absolute',
      },
      easing: 'easeOut',
      parameters: {},
      ownership: [],
      generatedHash: 'empty',
      status: 'customized',
    };
    useAnimationStore.setState({
      actions: [invalid],
      timeline: {
        ...useAnimationStore.getState().timeline,
        tracks: [
          {
            id: 'legacy-track',
            targetId: 'element-1',
            targetType: 'element',
            property: 'rotation',
            enabled: true,
            keyframes: [
              {
                id: 'legacy-keyframe',
                time: 250,
                value: 1,
                easing: 'linear',
              },
            ],
          },
        ],
      },
    });

    renderActionList();

    expect(
      screen.getByRole('list', { name: 'Sequence actions' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('Invalid reference')).toBeInTheDocument();
    expect(screen.getByText('Custom timeline')).toBeInTheDocument();
    expect(
      screen.getByText(/target reference missing.*row was preserved/i),
    ).toBeInTheDocument();
  });

  it('provides keyboard reorder controls, a live announcement, and focus retention', async () => {
    expect(
      createAction({
        id: 'action-1',
        type: 'fade',
        preset: 'fade',
        targetIds: ['element-1'],
        timing: {
          startMs: 0,
          durationMs: 500,
          staggerMs: 0,
          startMode: 'absolute',
        },
      }).ok,
    ).toBe(true);
    expect(
      createAction({
        id: 'action-2',
        type: 'draw',
        preset: 'draw',
        targetIds: ['element-2'],
        timing: {
          startMs: 0,
          durationMs: 500,
          staggerMs: 0,
          startMode: 'afterPrevious',
        },
      }).ok,
    ).toBe(true);

    renderActionList();
    const firstRow = document.getElementById('sequence-row-action-1')!;
    firstRow.focus();
    const moveButtons = screen.getAllByRole('button', { name: 'Move' });
    fireEvent.click(moveButtons[0]!);
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Move down' }));

    await waitFor(() => {
      expect(
        useAnimationStore.getState().actions.map((action) => action.id),
      ).toEqual(['action-2', 'action-1']);
      expect(document.activeElement).toBe(
        document.getElementById('sequence-row-action-1'),
      );
    });
    expect(
      screen.getByText('Action moved to position 2 of 2.'),
    ).toBeInTheDocument();
  });

  it('restores focus after delete and exposes named row operations', async () => {
    expect(
      createAction({
        id: 'action-1',
        type: 'fade',
        preset: 'fade',
        targetIds: ['element-1'],
        timing: {
          startMs: 0,
          durationMs: 500,
          staggerMs: 0,
          startMode: 'absolute',
        },
      }).ok,
    ).toBe(true);
    expect(
      createAction({
        id: 'action-2',
        type: 'draw',
        preset: 'draw',
        targetIds: ['element-2'],
        timing: {
          startMs: 0,
          durationMs: 500,
          staggerMs: 0,
          startMode: 'afterPrevious',
        },
      }).ok,
    ).toBe(true);

    renderActionList();
    expect(screen.getByRole('button', { name: 'Drag Fade' })).toHaveStyle({
      touchAction: 'none',
    });
    expect(
      screen.getByRole('switch', { name: 'Disable Fade' }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: 'Open in Studio' }),
    ).toHaveLength(2);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Fade' }));

    await waitFor(() => {
      expect(document.activeElement).toBe(
        document.getElementById('sequence-row-action-2'),
      );
    });
    expect(screen.getByText('Row deleted.')).toBeInTheDocument();
  });
});
