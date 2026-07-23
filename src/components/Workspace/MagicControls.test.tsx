import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { compileTimeline, computeCompiledFrame } from '@excalimate/animation-core';
import type {
  ExcalidrawArrowElement,
  ExcalidrawElement,
} from '@excalidraw/excalidraw/element/types';
import { createProject } from '../../core/models/Project';
import { createTimeline } from '../../core/models/Timeline';
import {
  applyAnimationToElements,
  getRenderableAnimationElements,
} from '../../core/engine/renderUtils';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import { extractTargets } from '../Canvas/extractTargets';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import {
  AUTO_ANIMATE_CHAIN_ARROW_IDS,
  createBoundArrowChainScene,
} from '../../test-fixtures/autoAnimateChain';
import { MagicControls } from './MagicControls';

vi.mock('../Transitions/SceneStateControls', () => ({
  SceneStateControls: () => null,
}));
vi.mock('../../services/analytics/posthog', () => ({
  trackCreatorEvent: vi.fn(),
}));

function renderControls() {
  return render(
    <MantineProvider>
      <Notifications />
      <MagicControls />
    </MantineProvider>,
  );
}

function loadScene(elements: readonly ExcalidrawElement[]) {
  const scene = {
    elements: [...elements],
    appState: { viewBackgroundColor: '#ffffff' },
    files: {},
  };
  const project = createProject('Auto Animate chain', scene);
  const targets = extractTargets(elements);
  useProjectStore.setState({
    project,
    targets,
    cameraFrame: project.playback.cameraFrame,
    isDirty: false,
  });
  useAnimationStore.setState({
    timeline: createTimeline('Test', 10_000, 60),
    actions: [],
    sceneStates: [],
    sceneTransitions: [],
    selectedTrackId: null,
    selectedKeyframeIds: [],
    clipboardKeyframes: [],
    clipStart: 0,
    clipEnd: 10_000,
    timelineRevision: 0,
    documentRevision: 0,
  });
  usePlaybackStore.setState({ currentTime: 0, frameState: new Map() });
  useUIStore.setState({
    selectedElementIds: [],
    canvasMode: 'design',
    workspace: 'magic',
  });
  useUndoRedoStore.getState().clearHistory();
}

describe('Magic Auto Animate review', () => {
  beforeEach(() => {
    vi.stubGlobal('Worker', undefined);
    getPlaybackController();
    loadScene(createBoundArrowChainScene().elements);
  });

  it('applies the four-node chain without ambiguity or arrow corruption', async () => {
    const sourceArrows = new Map(
      useProjectStore
        .getState()
        .project!.scene.elements.filter(
          (element): element is ExcalidrawArrowElement =>
            element.type === 'arrow' &&
            AUTO_ANIMATE_CHAIN_ARROW_IDS.includes(
              element.id as (typeof AUTO_ANIMATE_CHAIN_ARROW_IDS)[number],
            ),
        )
        .map((element) => [element.id, structuredClone(element)]),
    );
    renderControls();

    fireEvent.click(screen.getByRole('button', { name: 'Auto Animate' }));

    expect(await screen.findByText('Left-to-right order')).toBeInTheDocument();
    expect(screen.queryByText('Choose an animation order')).not.toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    expect(screen.getByText('Analyzed on this device.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Apply order' }));

    await waitFor(() => {
      expect(screen.getByText('Animation order applied')).toBeInTheDocument();
    });
    const timeline = useAnimationStore.getState().timeline;
    const drawTracks = timeline.tracks.filter((track) => track.property === 'drawProgress');
    expect(drawTracks).toHaveLength(3);
    const endTime = Math.max(
      ...drawTracks.flatMap((track) => track.keyframes.map((keyframe) => keyframe.time)),
    );
    const frame = computeCompiledFrame(compileTimeline(timeline), endTime);
    const project = useProjectStore.getState().project!;
    const rendered = applyAnimationToElements(
      getRenderableAnimationElements(project.scene.elements, new Set()),
      frame,
      useProjectStore.getState().targets,
    );

    for (const arrowId of AUTO_ANIMATE_CHAIN_ARROW_IDS) {
      const source = sourceArrows.get(arrowId);
      const persisted = project.scene.elements.find((element) => element.id === arrowId);
      const complete = rendered.find((element) => element.id === arrowId);
      expect(persisted).toMatchObject({
        points: source?.points,
        startBinding: source?.startBinding,
        endBinding: source?.endBinding,
        startArrowhead: source?.startArrowhead,
        endArrowhead: source?.endArrowhead,
      });
      expect(complete).toMatchObject({
        points: source?.points,
        startBinding: source?.startBinding,
        endBinding: source?.endBinding,
        startArrowhead: source?.startArrowhead,
        endArrowhead: source?.endArrowhead,
      });
    }
  });

  it('presents genuinely ambiguous input as neutral, actionable information', async () => {
    loadScene([createBoundArrowChainScene().elements[0]!]);
    renderControls();

    fireEvent.click(screen.getByRole('button', { name: 'Auto Animate' }));

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent('Choose an animation order');
    expect(status).toHaveTextContent(
      'We found a few good ways to animate this diagram. Preview the suggested order, or choose a different style before applying.',
    );
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
    expect(screen.queryByText('No single pattern is clearly dominant')).not.toBeInTheDocument();
  });
});
