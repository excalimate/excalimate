import { Toolbar } from '../Toolbar';
import { ExcalidrawEditor } from '../Canvas/ExcalidrawEditor';
import { ExcalidrawAnimateEditor } from '../Canvas/ExcalidrawAnimateEditor';
import { LayersPanel } from '../Layers/LayersPanel';
import { TimelinePanel } from '../Timeline/TimelinePanel';
import { PropertyPanel } from '../PropertyPanel/PropertyPanel';
import { SequenceRevealPanel } from '../SequenceReveal/SequenceRevealPanel';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAnimationStore } from '../../stores/animationStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useProjectStore } from '../../stores/projectStore';
import { useUIStore } from '../../stores/uiStore';
import { useAppHotkeys } from '../../hooks/useAppHotkeys';
import { getPlaybackController } from '../../core/engine/playbackSingleton';
import { useShareLoader } from './useShareLoader';
import { useSceneChangeSync } from './useSceneChangeSync';
import { useSelectionDerivedState } from './useSelectionDerivedState';
import { useKeyframeActions } from './useKeyframeActions';

export function App() {
  useAppHotkeys();

  getPlaybackController();
  useShareLoader();

  // Use selectors to avoid over-subscription
  const mode = useUIStore((s) => s.mode);
  const selectedElementIds = useUIStore((s) => s.selectedElementIds);
  const sequenceRevealOpen = useUIStore((s) => s.sequenceRevealOpen);
  const targets = useProjectStore((s) => s.targets);
  const project = useProjectStore((s) => s.project);
  const cameraFrame = useProjectStore((s) => s.cameraFrame);
  const timeline = useAnimationStore((s) => s.timeline);
  const selectedTrackId = useAnimationStore((s) => s.selectedTrackId);
  const selectedKeyframeIds = useAnimationStore((s) => s.selectedKeyframeIds);
  const clipStart = useAnimationStore((s) => s.clipStart);
  const clipEnd = useAnimationStore((s) => s.clipEnd);
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const frameState = usePlaybackStore((s) => s.frameState);

  const { handleSceneChange, handleElementsSelected } = useSceneChangeSync();
  const {
    targetLabels,
    targetOrder,
    selectedTargets,
    selectedTargetTracks,
    selectedKeyframeDetails,
    highlightedKeyframeIds,
  } = useSelectionDerivedState({
    targets,
    timeline,
    selectedElementIds,
    selectedKeyframeIds,
    currentTime,
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

  return (
    <div className="flex flex-col h-screen w-screen bg-[var(--color-surface)] text-[var(--color-text)]">
      {/* Top toolbar */}
      <Toolbar />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Layers panel (animate mode only) */}
        {mode === 'animate' && (
          <aside className="w-[200px] border-r border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-y-auto">
            <LayersPanel
              targets={targets}
              tracks={timeline.tracks}
              selectedElementIds={selectedElementIds}
              onSelectElement={handleSelectTarget}
            />
          </aside>
        )}

        {/* Center: Canvas area */}
        <main className="flex-1 relative overflow-hidden bg-[var(--color-surface)]">
          <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-sm text-red-400">Canvas error</div>}>
            {mode === 'edit' ? (
              <ExcalidrawEditor
                key={project?.id ?? 'empty'}
                onSceneChange={handleSceneChange}
                onElementsSelected={handleElementsSelected}
                initialData={project?.scene}
              />
            ) : (
              <ExcalidrawAnimateEditor
                scene={project?.scene ?? null}
                targets={targets}
                frameState={frameState}
                selectedElementIds={selectedElementIds}
                cameraFrame={cameraFrame}
                onSelectElements={handleSelectElements}
                onDragElement={handleDragElement}
                onResizeElement={handleResizeElement}
              />
            )}
          </ErrorBoundary>
          {/* Sequence Reveal Panel (floating) */}
          {mode === 'animate' && sequenceRevealOpen && (
            <SequenceRevealPanel
              targets={targets}
              selectedElementIds={selectedElementIds}
            />
          )}
        </main>

        {/* Right: Property panel */}
        <aside className="w-[280px] border-l border-[var(--color-border)] bg-[var(--color-surface-secondary)] overflow-y-auto">
          <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-sm text-red-400">Property panel error</div>}>
            <PropertyPanel
              selectedTargets={selectedTargets}
              allTargets={targets}
              tracks={selectedTargetTracks}
              currentTime={currentTime}
              selectedKeyframes={selectedKeyframeDetails}
              onAddTrack={handleAddTrackProp}
              onAddOrUpdateKeyframe={handleAddOrUpdateKeyframe}
              onUpdateKeyframe={handleUpdateKeyframe}
              onDeleteKeyframe={handleRemoveKeyframe}
              onSelectTarget={handleSelectTarget}
            />
          </ErrorBoundary>
        </aside>
      </div>

      {/* Bottom: Timeline panel */}
      <div className="h-[250px] border-t border-[var(--color-border)] bg-[var(--color-surface-secondary)]">
        <ErrorBoundary fallback={<div className="flex items-center justify-center h-full text-sm text-red-400">Timeline error</div>}>
        <TimelinePanel
          tracks={timeline.tracks}
          duration={timeline.duration}
          currentTime={currentTime}
          selectedTrackId={selectedTrackId}
          selectedKeyframeIds={highlightedKeyframeIds}
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
  );
}
