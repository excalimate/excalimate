import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { createProject } from '../../core/models/Project';
import { createTimeline } from '../../core/models/Timeline';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { SceneStateControls } from './SceneStateControls';

vi.mock('@mantine/notifications', () => ({
  notifications: { show: vi.fn() },
}));

function rectangle(id: string, x: number): ExcalidrawElement {
  return {
    id,
    type: 'rectangle',
    x,
    y: 10,
    width: 100,
    height: 60,
    angle: 0,
    opacity: 100,
    isDeleted: false,
    groupIds: [],
    boundElements: null,
  } as unknown as ExcalidrawElement;
}

describe('SceneStateControls', () => {
  beforeEach(() => {
    getPlaybackController();
    const project = createProject('States', {
      elements: [rectangle('node', 10)],
      appState: {},
      files: {},
    });
    useProjectStore.setState({
      project,
      targets: [],
      cameraFrame: project.playback.cameraFrame,
      isDirty: false,
    });
    useAnimationStore.setState({
      timeline: createTimeline(),
      actions: [],
      sceneStates: [],
      sceneTransitions: [],
      timelineRevision: 0,
      documentRevision: 0,
    });
    useUndoRedoStore.getState().clearHistory();
  });

  it('captures sparse states and enables the transition review flow', async () => {
    render(
      <MantineProvider>
        <SceneStateControls />
      </MantineProvider>,
    );

    const smartTransition = screen.getByRole('button', {
      name: 'Smart Transition',
    });
    expect(smartTransition).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Capture state' }));
    expect(await screen.findByText(/does not copy binary file data/i)).toBeInTheDocument();
    fireEvent.change(await screen.findByLabelText('State name'), {
      target: { value: 'Before' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog', { hidden: true })).getByRole('button', {
        name: 'Capture state',
        hidden: true,
      }),
    );
    expect(useAnimationStore.getState().sceneStates).toHaveLength(1);
    await waitFor(() => expect(screen.queryByLabelText('State name')).not.toBeInTheDocument());

    act(() => {
      useProjectStore.getState().updateScene({
        elements: [rectangle('node', 200)],
        appState: {},
        files: {},
      });
    });
    fireEvent.click(screen.getByRole('button', { name: 'Capture state' }));
    fireEvent.change(await screen.findByLabelText('State name'), {
      target: { value: 'After' },
    });
    fireEvent.click(
      within(screen.getByRole('dialog', { hidden: true })).getByRole('button', {
        name: 'Capture state',
        hidden: true,
      }),
    );

    expect(useAnimationStore.getState().sceneStates).toHaveLength(2);
    expect(smartTransition).toBeEnabled();
    await waitFor(() => expect(screen.queryByLabelText('State name')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Smart Transition' }));
    expect(
      await screen.findByText(/Camera changes are never inferred silently/),
    ).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Include camera movement/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Preview transition' }));
    expect(await screen.findByRole('heading', { name: 'Transition summary' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accept Smart Transition' }));
    await waitFor(() =>
      expect(useAnimationStore.getState().sceneTransitions[0]?.status).toBe('accepted'),
    );
    expect(screen.getByRole('textbox', { name: 'From state' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preview transition' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close Smart Transition' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Smart Transition' })).not.toBeInTheDocument(),
    );
    expect(useAnimationStore.getState().sceneTransitions[0]?.status).toBe('accepted');
  });
});
