import { lazy, Suspense, useCallback } from 'react';
import {
  ActionIcon,
  Button,
  Center,
  CloseButton,
  Paper,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import {
  IconChevronUp,
  IconDeviceDesktop,
  IconLayoutSidebarLeftExpand,
  IconWand,
} from '@tabler/icons-react';
import { Toolbar } from '../Toolbar';
import { ToolbarHints } from '../Onboarding/ToolbarHints';
import { LayersPanel } from '../Layers/LayersPanel';
import { SequenceRevealPanel } from '../SequenceReveal/SequenceRevealPanel';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useSceneChangeSync } from '../App/useSceneChangeSync';
import { useSelectionDerivedState } from '../App/useSelectionDerivedState';
import { useKeyframeActions } from '../App/useKeyframeActions';
import { TimelinePanelWrapper } from '../App/TimelinePanelWrapper';
import { PropertyPanelWrapper } from '../App/PropertyPanelWrapper';
import { trackCreatorEvent } from '../../services/analytics/posthog';
import { getWorkspaceMinimumWidth } from '../../core/workspace/workspaceLayout';

const ExcalidrawEditor = lazy(() =>
  import('../Canvas/ExcalidrawEditor').then((module) => ({
    default: module.ExcalidrawEditor,
  })),
);
const AnimateCanvasWrapper = lazy(() =>
  import('../App/AnimateCanvasWrapper').then((module) => ({
    default: module.AnimateCanvasWrapper,
  })),
);

export function StudioWorkspace({
  legacyShell = false,
}: {
  legacyShell?: boolean;
}) {
  const workspace = useUIStore((state) => state.workspace);
  const minimumWidth = getWorkspaceMinimumWidth(
    workspace === 'studio' ? 'studio' : 'sequence',
  );
  const isSupported = useMediaQuery(
    `(min-width: ${minimumWidth}px)`,
    true,
  );

  if (!legacyShell && !isSupported) {
    return (
      <Center h="100vh" p="xl">
        <Paper withBorder shadow="md" radius="lg" p="xl" maw={520}>
          <Stack align="center" gap="md">
            <IconDeviceDesktop
              size={44}
              stroke={1.5}
              color="var(--mantine-color-indigo-6)"
              aria-hidden="true"
            />
            <Title order={2} ta="center">
              {workspace === 'studio'
                ? 'Studio needs a larger screen'
                : 'Sequence works best on a tablet or desktop'}
            </Title>
            <Text c="dimmed" ta="center">
              Your project and timeline are unchanged. Open Magic to keep editing
              on this device, or return on a wider screen.
            </Text>
            <Button
              leftSection={<IconWand size={18} aria-hidden="true" />}
              onClick={() => {
                useUIStore.getState().setWorkspace('magic');
                trackCreatorEvent('creator_workspace_changed', {
                  workspace: 'magic',
                  source: 'escalation',
                });
              }}
            >
              Open Magic
            </Button>
          </Stack>
        </Paper>
      </Center>
    );
  }

  return <StudioShell legacyShell={legacyShell} />;
}

function StudioShell({ legacyShell }: { legacyShell: boolean }) {
  const mode = useUIStore((state) => state.mode);
  const selectedElementIds = useUIStore(
    (state) => state.selectedElementIds,
  );
  const sequenceRevealOpen = useUIStore(
    (state) => state.sequenceRevealOpen,
  );
  const layersPanelOpen = useUIStore((state) => state.layersPanelOpen);
  const timelinePanelOpen = useUIStore((state) => state.timelinePanelOpen);
  const targets = useProjectStore((state) => state.targets);
  const project = useProjectStore((state) => state.project);
  const cameraFrame = useProjectStore((state) => state.cameraFrame);
  const timeline = useAnimationStore((state) => state.timeline);
  const selectedTrackId = useAnimationStore(
    (state) => state.selectedTrackId,
  );
  const selectedKeyframeIds = useAnimationStore(
    (state) => state.selectedKeyframeIds,
  );
  const clipStart = useAnimationStore((state) => state.clipStart);
  const clipEnd = useAnimationStore((state) => state.clipEnd);
  const { handleSceneChange, handleElementsSelected } = useSceneChangeSync();
  const {
    targetLabels,
    targetOrder,
    targetParents,
    selectedTargets,
    selectedTargetTracks,
    selectedKeyframeDetails,
  } = useSelectionDerivedState({
    targets,
    timeline,
    selectedElementIds,
    selectedKeyframeIds,
  });
  const {
    handleScrub,
    handleSelectTrack,
    handleSelectKeyframes,
    handleAddKeyframe,
    handleMoveKeyframe,
    handleRemoveKeyframe,
    handleToggleTrackEnabled,
    handleRemoveTrack,
    handleUpdateKeyframe,
    handleSelectTarget,
    handleSelectElements,
    handleAddOrUpdateKeyframe,
    handleDragElement,
    handleAddTrackProp,
    handleResizeElement,
    handleRotateElement,
  } = useKeyframeActions();

  const closePropertyPanel = useCallback(() => {
    useUIStore.getState().setSelectedElements([]);
    useAnimationStore.getState().clearKeyframeSelection();
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen bg-surface text-text">
      <Toolbar legacyShell={legacyShell} />
      <ToolbarHints />

      <div className="flex flex-1 overflow-hidden px-2 pb-2 gap-2">
        {mode === 'animate' && layersPanelOpen && (
          <aside
            data-hint="layers"
            className="w-[200px] border border-border bg-surface rounded-lg shadow-float overflow-y-auto shrink-0"
          >
            <LayersPanel
              targets={targets}
              tracks={timeline.tracks}
              selectedElementIds={selectedElementIds}
              onSelectElements={handleSelectElements}
            />
          </aside>
        )}

        <main className="flex-1 relative overflow-hidden bg-surface rounded-lg border border-border shadow-float">
          <ErrorBoundary
            fallback={
              <div className="flex items-center justify-center h-full text-sm text-danger">
                Canvas error
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-sm text-text-muted">
                  Loading editor...
                </div>
              }
            >
              {mode === 'edit' ? (
                <ExcalidrawEditor
                  key={project?.id ?? 'empty'}
                  onSceneChange={handleSceneChange}
                  onElementsSelected={handleElementsSelected}
                  initialData={project?.scene}
                />
              ) : (
                <AnimateCanvasWrapper
                  scene={project?.scene ?? null}
                  targets={targets}
                  selectedElementIds={selectedElementIds}
                  cameraFrame={cameraFrame}
                  onSelectElements={handleSelectElements}
                  onDragElement={handleDragElement}
                  onResizeElement={handleResizeElement}
                  onRotateElement={handleRotateElement}
                />
              )}
            </Suspense>
          </ErrorBoundary>
          {mode === 'animate' && sequenceRevealOpen && (
            <SequenceRevealPanel
              targets={targets}
              selectedElementIds={selectedElementIds}
            />
          )}
          {mode === 'animate' && !layersPanelOpen && (
            <div className="absolute top-2 left-2 z-20">
              <Tooltip label="Show layers" position="right">
                <ActionIcon
                  aria-label="Show layers"
                  variant="filled"
                  color="indigo"
                  size="md"
                  onClick={() =>
                    useUIStore.getState().toggleLayersPanel()
                  }
                >
                  <IconLayoutSidebarLeftExpand size={18} />
                </ActionIcon>
              </Tooltip>
            </div>
          )}
          {!timelinePanelOpen && (
            <div className="absolute bottom-2 right-2 z-20">
              <Tooltip label="Show timeline" position="left">
                <ActionIcon
                  aria-label="Show timeline"
                  variant="filled"
                  color="indigo"
                  size="md"
                  onClick={() =>
                    useUIStore.getState().toggleTimelinePanel()
                  }
                >
                  <IconChevronUp size={18} />
                </ActionIcon>
              </Tooltip>
            </div>
          )}
        </main>

        {(selectedTargets.length > 0 ||
          selectedKeyframeIds.length > 0) && (
          <aside className="w-[280px] border border-border bg-surface rounded-lg shadow-float overflow-hidden shrink-0 flex flex-col">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">
                Properties
              </span>
              <CloseButton
                aria-label="Close properties"
                size="sm"
                onClick={closePropertyPanel}
              />
            </div>
            <div className="flex-1 overflow-y-auto">
              <ErrorBoundary
                fallback={
                  <div className="flex items-center justify-center h-full text-sm text-danger">
                    Property panel error
                  </div>
                }
              >
                <PropertyPanelWrapper
                  selectedTargets={selectedTargets}
                  allTargets={targets}
                  tracks={selectedTargetTracks}
                  selectedKeyframes={selectedKeyframeDetails}
                  onAddTrack={handleAddTrackProp}
                  onAddOrUpdateKeyframe={handleAddOrUpdateKeyframe}
                  onUpdateKeyframe={handleUpdateKeyframe}
                  onDeleteKeyframe={handleRemoveKeyframe}
                  onSelectTarget={handleSelectTarget}
                />
              </ErrorBoundary>
            </div>
          </aside>
        )}
      </div>

      {timelinePanelOpen && (
        <div
          data-hint="timeline"
          className="h-[250px] mx-2 mb-2 border border-border bg-surface-alt rounded-lg shadow-float overflow-hidden"
        >
          <ErrorBoundary
            fallback={
              <div className="flex items-center justify-center h-full text-sm text-danger">
                Timeline error
              </div>
            }
          >
            <TimelinePanelWrapper
              tracks={timeline.tracks}
              duration={timeline.duration}
              selectedTrackId={selectedTrackId}
              rawSelectedKeyframeIds={selectedKeyframeIds}
              clipStart={clipStart}
              clipEnd={clipEnd}
              onSelectTrack={handleSelectTrack}
              onSelectKeyframes={handleSelectKeyframes}
              onAddKeyframe={handleAddKeyframe}
              onMoveKeyframe={handleMoveKeyframe}
              onDeleteKeyframe={handleRemoveKeyframe}
              onScrub={handleScrub}
              onToggleTrackEnabled={handleToggleTrackEnabled}
              onRemoveTrack={handleRemoveTrack}
              onClipRangeChange={(start, end) =>
                useAnimationStore.getState().setClipRange(start, end)
              }
              targetLabels={targetLabels}
              targetOrder={targetOrder}
              targetParents={targetParents}
              selectedElementIds={selectedElementIds}
              onCollapse={() =>
                useUIStore.getState().toggleTimelinePanel()
              }
            />
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
}
