import { Suspense, lazy, useEffect, useCallback } from 'react';
import { MantineProvider, CloseButton, ActionIcon, Tooltip } from '@mantine/core';
import { IconLayoutSidebarLeftExpand } from '@tabler/icons-react';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { NavigationProgress } from '@mantine/nprogress';
import { Toolbar } from '../Toolbar';
import { LayersPanel } from '../Layers/LayersPanel';
import { SequenceRevealPanel } from '../SequenceReveal/SequenceRevealPanel';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAnimationStore } from '../../stores/animationStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useAppHotkeys } from '../../hooks/useAppHotkeys';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import { useShareLoader } from './useShareLoader';
import { useSceneChangeSync } from './useSceneChangeSync';
import { useSelectionDerivedState } from './useSelectionDerivedState';
import { useKeyframeActions } from './useKeyframeActions';
import { TimelinePanelWrapper } from './TimelinePanelWrapper';
import { PropertyPanelWrapper } from './PropertyPanelWrapper';

// Lazy-load heavy editor components — each pulls in @excalidraw/excalidraw (~2MB).
// Only the active mode's editor is loaded, reducing initial bundle size.
const ExcalidrawEditor = lazy(() =>
  import('../Canvas/ExcalidrawEditor').then((m) => ({ default: m.ExcalidrawEditor })),
);
const AnimateCanvasWrapper = lazy(() =>
  import('./AnimateCanvasWrapper').then((m) => ({ default: m.AnimateCanvasWrapper })),
);

export function App() {
  useAppHotkeys();

  getPlaybackController();
  useShareLoader();

  // Prevent browser zoom on Ctrl+Scroll anywhere in the app.
  // The Excalidraw canvas handles its own zoom internally.
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    document.addEventListener('wheel', handler, { passive: false });
    return () => document.removeEventListener('wheel', handler);
  }, []);

  // Apply theme to the document element and Mantine color scheme
  const theme = useUIStore((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const mantineColorScheme = theme === 'dark' ? 'dark' : 'light';

  // Use selectors to avoid over-subscription
  const mode = useUIStore((s) => s.mode);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const sequenceRevealOpen = useUIStore((s) => s.sequenceRevealOpen);
  const layersPanelOpen = useUIStore((s) => s.layersPanelOpen);
  const targets = useProjectStore((s) => s.targets);
  const project = useProjectStore((s) => s.project);
  const cameraFrame = useProjectStore((s) => s.cameraFrame);
  const timeline = useAnimationStore((s) => s.timeline);
  const selectedTrackId = useAnimationStore((s) => s.selectedTrackId);
  const selectedKeyframeIds = useAnimationStore((s) => s.selectedKeyframeIds);
  const clipStart = useAnimationStore((s) => s.clipStart);
  const clipEnd = useAnimationStore((s) => s.clipEnd);

  const { handleSceneChange, handleElementsSelected } = useSceneChangeSync();
  const {
    targetLabels,
    targetOrder,
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
  } = useKeyframeActions();

  const closePropertyPanel = useCallback(() => {
    useUIStore.getState().setSelectedElements([]);
    useAnimationStore.getState().clearKeyframeSelection();
  }, []);

  return (
    <MantineProvider forceColorScheme={mantineColorScheme}>
      <ModalsProvider>
        <Notifications position="bottom-right" />
        <NavigationProgress />
        <div className="flex flex-col h-screen w-screen bg-surface text-text">
          {/* Top toolbar */}
          <Toolbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden px-2 pb-2 gap-2">
        {/* Left: Layers panel (animate mode only) */}
        {mode === 'animate' && layersPanelOpen && (
          <aside className="w-[200px] border border-border bg-surface rounded-lg shadow-float overflow-y-auto shrink-0">
            <LayersPanel
              targets={targets}
              tracks={timeline.tracks}
              selectedElementIds={selectedElementIds}
              onSelectElement={handleSelectTarget}
            />
          </aside>
        )}

        {/* Center: Canvas area */}
        <main className="flex-1 relative overflow-hidden bg-surface rounded-lg border border-border shadow-float">
          <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-sm text-danger">Canvas error</div>}>
            <Suspense fallback={<div className="flex items-center justify-center h-full text-sm text-text-muted">Loading editor…</div>}>
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
              />
            )}
            </Suspense>
          </ErrorBoundary>
          {/* Sequence Reveal Panel (floating) */}
          {mode === 'animate' && sequenceRevealOpen && (
            <SequenceRevealPanel
              targets={targets}
              selectedElementIds={selectedElementIds}
            />
          )}
          {/* Layers toggle (floating, animate mode only, visible when panel is closed) */}
          {mode === 'animate' && !layersPanelOpen && (
            <div className="absolute top-2 left-2 z-20">
              <Tooltip label="Show layers" position="right">
                <ActionIcon
                  variant="filled"
                  color="indigo"
                  size="md"
                  onClick={() => useUIStore.getState().toggleLayersPanel()}
                >
                  <IconLayoutSidebarLeftExpand size={18} />
                </ActionIcon>
              </Tooltip>
            </div>
          )}
        </main>

        {/* Right: Property panel (visible when elements or keyframes selected) */}
        {(selectedTargets.length > 0 || selectedKeyframeIds.length > 0) && (
        <aside className="w-[280px] border border-border bg-surface rounded-lg shadow-float overflow-hidden shrink-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-border shrink-0">
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Properties</span>
            <CloseButton size="sm" onClick={closePropertyPanel} />
          </div>
          <div className="flex-1 overflow-y-auto">
          <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-sm text-danger">Property panel error</div>}>
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

      {/* Bottom: Timeline panel */}
      <div className="h-[250px] mx-2 mb-2 border border-border bg-surface-alt rounded-lg shadow-float overflow-hidden">
        <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-sm text-danger">Timeline error</div>}>
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
          onClipRangeChange={(start, end) => useAnimationStore.getState().setClipRange(start, end)}
          targetLabels={targetLabels}
          targetOrder={targetOrder}
          selectedElementIds={selectedElementIds}
        />
        </ErrorBoundary>
      </div>
    </div>
        </ModalsProvider>
      </MantineProvider>
  );
}
