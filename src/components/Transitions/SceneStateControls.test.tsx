import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { migrateV1Project } from '@excalimate/project-schema';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { createProject } from '../../core/models/Project';
import { createTimeline } from '../../core/models/Timeline';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import {
  captureSceneState,
  deleteSceneState,
  setExplicitSceneMapping,
} from '../../services/AnimationCommandService';
import {
  captureProjectDocument,
  loadProjectDocumentIntoStores,
} from '../../services/ProjectDocumentService';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import {
  SYNTHETIC_V1_PROJECT,
  createSyntheticV2Project,
} from '../../test-fixtures/projectDocuments';
import * as sceneDiffService from '../../services/SceneDiffService';
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

function renderControls(width?: number) {
  return render(
    <MantineProvider>
      <div style={width ? { width } : undefined}>
        <SceneStateControls />
      </div>
    </MantineProvider>,
  );
}

async function captureStateFromDialog(name: string) {
  fireEvent.click(screen.getByRole('button', { name: 'Capture state' }));
  fireEvent.change(await screen.findByLabelText('State name'), {
    target: { value: name },
  });
  fireEvent.click(
    within(screen.getByRole('dialog', { hidden: true })).getByRole('button', {
      name: 'Capture state',
      hidden: true,
    }),
  );
  await waitFor(() => expect(screen.queryByLabelText('State name')).not.toBeInTheDocument());
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
    useUIStore.setState({ workspace: 'magic' });
    useUndoRedoStore.getState().clearHistory();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('explains the zero, one, and two-state workflow and guards disabled activation', async () => {
    renderControls();

    const createTransition = screen.getByRole('button', {
      name: 'Create transition',
    });
    const initialHelp = screen.getByText('Capture your starting state.');
    expect(screen.getByText('0 of 50 states')).toBeInTheDocument();
    expect(createTransition).toHaveAttribute('aria-disabled', 'true');
    expect(createTransition).toHaveAttribute('data-disabled');
    expect(createTransition).toHaveAttribute('aria-describedby', initialHelp.id);

    createTransition.focus();
    expect(createTransition).toHaveFocus();
    fireEvent.click(createTransition, { detail: 0 });
    expect(screen.queryByRole('dialog', { name: 'Create transition' })).not.toBeInTheDocument();

    await captureStateFromDialog('Before');
    expect(useAnimationStore.getState().sceneStates).toHaveLength(1);
    expect(screen.getByText('1 of 50 states')).toBeInTheDocument();
    expect(screen.getByText('Make changes, then capture the next state.')).toBeInTheDocument();
    expect(createTransition).toHaveAttribute('aria-disabled', 'true');

    act(() => {
      useProjectStore.getState().updateScene({
        elements: [rectangle('node', 200)],
        appState: {},
        files: {},
      });
    });
    await captureStateFromDialog('After');
    expect(useAnimationStore.getState().sceneStates).toHaveLength(2);
    expect(screen.getByText('2 of 50 states')).toBeInTheDocument();
    expect(screen.getByText('Ready to create a transition.')).toBeInTheDocument();
    expect(createTransition).toHaveAttribute('aria-disabled', 'false');
    expect(createTransition).not.toHaveAttribute('data-disabled');

    fireEvent.click(createTransition);
    expect(
      await screen.findByText(/Camera changes are never inferred silently/),
    ).toBeInTheDocument();
    expect(screen.getByRole('switch', { name: /Include camera movement/ })).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Preview transition' }));
    expect(await screen.findByRole('heading', { name: 'Transition summary' })).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Create transition', hidden: true })).getByRole(
        'button',
        { name: 'Create transition', hidden: true },
      ),
    );
    await waitFor(() =>
      expect(useAnimationStore.getState().sceneTransitions[0]?.status).toBe('accepted'),
    );
    expect(screen.getByRole('textbox', { name: 'Starting point' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Preview transition' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close transition' }));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Create transition' })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(createTransition).toHaveFocus());
    expect(useAnimationStore.getState().sceneTransitions[0]?.status).toBe('accepted');
  });

  it('keeps complete labels and touch targets at a 200%-zoom equivalent width', () => {
    renderControls(160);

    const controlGrid = screen.getByTestId('transition-control-grid');
    expect(controlGrid.style.gridTemplateColumns).toBe(
      'repeat(auto-fit, minmax(min(100%, 12rem), 1fr))',
    );
    expect(controlGrid.style.minWidth).toBe('0rem');
    expect(controlGrid.style.width).toBe('100%');

    for (const name of ['Capture state', 'Create transition']) {
      const button = screen.getByRole('button', { name });
      const label = button.querySelector('.mantine-Button-label');
      expect(button).toHaveTextContent(name);
      expect(button).toHaveStyle({ height: 'auto', minHeight: '44px' });
      expect(label).toHaveStyle({
        overflow: 'visible',
        textOverflow: 'clip',
        whiteSpace: 'normal',
      });
    }
  });

  it('does not expose internal analysis failures in the transition alert', async () => {
    renderControls();
    act(() => {
      expect(captureSceneState('Start').ok).toBe(true);
      expect(captureSceneState('Next').ok).toBe(true);
    });
    vi.spyOn(sceneDiffService, 'analyzeSceneDiff').mockRejectedValueOnce(
      new Error('The local scene-diff worker failed'),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create transition' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preview transition' }));

    expect(
      await screen.findByText(
        'We could not compare the captured states. Check them and preview the transition again.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/scene-diff worker/i)).not.toBeInTheDocument();
  });

  it('cancels an in-flight preview before replacing the project', async () => {
    renderControls();
    act(() => {
      expect(captureSceneState('Start').ok).toBe(true);
      useProjectStore.getState().updateScene({
        elements: [rectangle('node', 200)],
        appState: {},
        files: {},
      });
      expect(captureSceneState('Next').ok).toBe(true);
    });
    const [fromState, toState] = useAnimationStore.getState().sceneStates;
    const diff = await sceneDiffService.analyzeSceneDiff(fromState!, toState!);
    let resolveAnalysis!: (value: typeof diff) => void;
    vi.spyOn(sceneDiffService, 'analyzeSceneDiff').mockReturnValueOnce(
      new Promise((resolve) => {
        resolveAnalysis = resolve;
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Create transition' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preview transition' }));
    act(() => {
      loadProjectDocumentIntoStores(createSyntheticV2Project(), {
        activateAnimationMode: false,
        trackWorkspaceChange: false,
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Create transition' })).not.toBeInTheDocument(),
    );

    await act(async () => {
      resolveAnalysis(diff);
      await Promise.resolve();
    });
    expect(useAnimationStore.getState().sceneTransitions).toEqual([]);
  });

  it('removes a mapped draft when the controls unmount', async () => {
    const rendered = renderControls();
    act(() => {
      expect(captureSceneState('Start').ok).toBe(true);
      useProjectStore.getState().updateScene({
        elements: [rectangle('node', 200)],
        appState: {},
        files: {},
      });
      expect(captureSceneState('Next').ok).toBe(true);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create transition' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preview transition' }));
    await screen.findByRole('heading', { name: 'Transition summary' });
    const draft = useAnimationStore.getState().sceneTransitions[0]!;
    act(() => {
      expect(
        setExplicitSceneMapping(draft.id, {
          fromElementId: 'node',
          toElementId: 'node',
        }).ok,
      ).toBe(true);
    });
    expect(useAnimationStore.getState().sceneTransitions[0]?.mappings).toHaveLength(1);

    rendered.unmount();
    expect(useAnimationStore.getState().sceneTransitions).toEqual([]);
  });

  it('tracks deletion, undo, redo, project/template loads, migration, and workspace changes', async () => {
    const rendered = renderControls();
    let createTransition = screen.getByRole('button', { name: 'Create transition' });

    act(() => {
      expect(captureSceneState('Start').ok).toBe(true);
      useProjectStore.getState().updateScene({
        elements: [rectangle('node', 200)],
        appState: {},
        files: {},
      });
      expect(captureSceneState('Next').ok).toBe(true);
    });
    await waitFor(() => expect(createTransition).toHaveAttribute('aria-disabled', 'false'));
    const projectWithTwoStates = captureProjectDocument();
    expect(projectWithTwoStates?.authoring?.sceneStates).toHaveLength(2);

    fireEvent.click(createTransition);
    expect(await screen.findByRole('dialog', { name: 'Create transition' })).toBeInTheDocument();
    const secondStateId = useAnimationStore.getState().sceneStates[1]!.id;
    act(() => {
      expect(deleteSceneState(secondStateId).ok).toBe(true);
    });
    await waitFor(() => expect(createTransition).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.queryByRole('dialog', { name: 'Create transition' })).not.toBeInTheDocument();
    expect(screen.getByText('Make changes, then capture the next state.')).toBeInTheDocument();

    act(() => {
      useUndoRedoStore.getState().undo();
    });
    await waitFor(() => expect(createTransition).toHaveAttribute('aria-disabled', 'false'));
    expect(screen.queryByRole('dialog', { name: 'Create transition' })).not.toBeInTheDocument();

    act(() => {
      useUndoRedoStore.getState().redo();
    });
    await waitFor(() => expect(createTransition).toHaveAttribute('aria-disabled', 'true'));

    act(() => {
      loadProjectDocumentIntoStores(projectWithTwoStates!, {
        activateAnimationMode: false,
        trackWorkspaceChange: false,
      });
    });
    await waitFor(() => expect(createTransition).toHaveAttribute('aria-disabled', 'false'));

    act(() => {
      useUIStore.getState().setWorkspace('sequence');
      useUIStore.getState().setWorkspace('magic');
    });
    expect(createTransition).toHaveAttribute('aria-disabled', 'false');
    rendered.unmount();
    renderControls();
    createTransition = screen.getByRole('button', { name: 'Create transition' });
    expect(createTransition).toHaveAttribute('aria-disabled', 'false');

    fireEvent.click(createTransition);
    expect(await screen.findByRole('dialog', { name: 'Create transition' })).toBeInTheDocument();
    act(() => {
      loadProjectDocumentIntoStores(projectWithTwoStates!, {
        activateAnimationMode: false,
        trackWorkspaceChange: false,
      });
    });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Create transition' })).not.toBeInTheDocument(),
    );
    expect(createTransition).toHaveAttribute('aria-disabled', 'false');

    act(() => {
      loadProjectDocumentIntoStores(createSyntheticV2Project(), {
        activateAnimationMode: false,
        trackWorkspaceChange: false,
      });
    });
    await waitFor(() => expect(createTransition).toHaveAttribute('aria-disabled', 'true'));
    expect(screen.getByText('Capture your starting state.')).toBeInTheDocument();

    act(() => {
      loadProjectDocumentIntoStores(migrateV1Project(structuredClone(SYNTHETIC_V1_PROJECT)), {
        activateAnimationMode: false,
        trackWorkspaceChange: false,
      });
    });
    expect(createTransition).toHaveAttribute('aria-disabled', 'true');
  });
});
