import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { Toolbar } from '../Toolbar';
import { ExcalidrawEditor, extractTargets } from '../Canvas/ExcalidrawEditor';
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
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useAppHotkeys } from '../../hooks/useAppHotkeys';
import { computeFrameAtTime, getPlaybackController } from '../../core/engine/playbackSingleton';
import { PROPERTY_DEFAULTS } from '../../types/animation';
import type { AnimatableProperty } from '../../types/animation';
import type { ExcalidrawSceneData, AnimatableTarget } from '../../types/excalidraw';
import { CAMERA_FRAME_TARGET_ID } from '../../stores/projectStore';
import { extractKeyFromHash, importKeyFromString, decryptData } from '../../services/encryption';

export function App() {
  useAppHotkeys();

  // Initialize the playback controller singleton early
  getPlaybackController();

  // Auto-load shared project from URL hash on startup
  const [shareLoaded, setShareLoaded] = useState(false);
  useEffect(() => {
    if (shareLoaded) return;
    const hash = window.location.hash;
    if (!hash.startsWith('#share=')) return;
    setShareLoaded(true);

    const parts = hash.slice('#share='.length).split(',');
    if (parts.length < 2) return;
    const [shareId, keyStr] = parts;

    (async () => {
      try {
        const serverUrl = 'http://localhost:3001';
        const response = await fetch(`${serverUrl}/share/${shareId}`);
        if (!response.ok) throw new Error('Share not found');
        const encrypted = await response.arrayBuffer();
        const key = await importKeyFromString(keyStr);
        const data = await decryptData<any>(encrypted, key);

        if (data.scene?.elements) {
          useProjectStore.getState().createNewProject('Shared Animation', {
            elements: data.scene.elements,
            appState: data.scene.appState ?? {},
            files: data.scene.files ?? {},
          });
          const targets = extractTargets(data.scene.elements);
          useProjectStore.getState().setTargets(targets);
          if (data.timeline) useAnimationStore.getState().setTimeline(data.timeline);
          if (data.cameraFrame) useProjectStore.getState().setCameraFrame(data.cameraFrame);
          if (data.clipStart !== undefined) useAnimationStore.getState().setClipRange(data.clipStart, data.clipEnd);
          useUIStore.getState().setMode('animate');
          computeFrameAtTime(0);
        }
      } catch (e) {
        console.error('Failed to load shared animation:', e);
      }
    })();
  }, [shareLoaded]);

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

  // Handle Excalidraw scene changes — debounced to avoid excessive calls
  const sceneChangeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSceneChange = useCallback((scene: ExcalidrawSceneData) => {
    const pStore = useProjectStore.getState();
    if (pStore.project) {
      pStore.updateScene(scene);
    } else {
      pStore.createNewProject('Untitled Animation', scene);
    }
    // Debounce target extraction — Excalidraw fires many rapid scene changes
    if (sceneChangeTimer.current) clearTimeout(sceneChangeTimer.current);
    sceneChangeTimer.current = setTimeout(() => {
      const newTargets = extractTargets(scene.elements);
      useProjectStore.getState().setTargets(newTargets);
    }, 100);
  }, []);

  // Wire Excalidraw element selection to uiStore
  const handleElementsSelected = useCallback((elementIds: string[]) => {
    useUIStore.getState().setSelectedElements(elementIds);
  }, []);

  // Build target labels map for timeline
  const targetLabels = useMemo(() => {
    const map = new Map<string, string>();
    for (const target of targets) {
      map.set(target.id, target.label);
    }
    return map;
  }, [targets]);

  const targetOrder = useMemo(() => {
    const map = new Map<string, number>();
    targets.forEach((t, i) => map.set(t.id, i));
    return map;
  }, [targets]);

  // Find selected targets for property panel (supports multi-selection)
  const selectedTargets = useMemo(() => {
    if (selectedElementIds.length === 0) return [];
    return selectedElementIds
      .map((id) => targets.find((t) => t.id === id))
      .filter((t): t is AnimatableTarget => t !== undefined);
  }, [selectedElementIds, targets]);

  // Get tracks for all selected targets
  const selectedTargetTracks = useMemo(() => {
    if (selectedTargets.length === 0) return [];
    const selectedIds = new Set(selectedTargets.map((t) => t.id));
    return timeline.tracks.filter((t) => selectedIds.has(t.targetId));
  }, [selectedTargets, timeline.tracks]);

  // Get selected keyframes for property panel
  const selectedKeyframeDetails = useMemo(() => {
    const result: { track: typeof timeline.tracks[0]; keyframe: typeof timeline.tracks[0]['keyframes'][0] }[] = [];
    for (const track of timeline.tracks) {
      for (const kf of track.keyframes) {
        if (selectedKeyframeIds.includes(kf.id)) {
          result.push({ track, keyframe: kf });
        }
      }
    }
    return result;
  }, [timeline.tracks, selectedKeyframeIds]);

  // Compute keyframe IDs at current time for selected targets (for timeline highlighting)
  const highlightedKeyframeIds = useMemo(() => {
    const ids = new Set<string>();
    const selectedIdSet = new Set(selectedElementIds);

    // Include explicitly selected keyframes only if they belong to a selected target
    for (const track of timeline.tracks) {
      if (!selectedIdSet.has(track.targetId)) continue;
      for (const kf of track.keyframes) {
        if (selectedKeyframeIds.includes(kf.id)) ids.add(kf.id);
        // Auto-highlight keyframes at current time
        if (Math.abs(kf.time - currentTime) < 1) ids.add(kf.id);
      }
    }

    // Always include explicitly selected keyframes (even if element not selected)
    for (const id of selectedKeyframeIds) ids.add(id);

    return [...ids];
  }, [timeline.tracks, currentTime, selectedElementIds, selectedKeyframeIds]);

  // Stable action callbacks — use getState() to avoid store subscriptions
  const handleScrub = useCallback((time: number) => {
    computeFrameAtTime(time);
  }, []);

  const handleSelectTrack = useCallback((id: string | null) => {
    useAnimationStore.getState().selectTrack(id);
  }, []);

  const handleSelectKeyframes = useCallback((ids: string[]) => {
    useAnimationStore.getState().selectKeyframes(ids);
  }, []);

  const handleAddKeyframe = useCallback((trackId: string, time: number, value: number) => {
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().addKeyframe(trackId, time, value);
  }, []);

  const handleMoveKeyframe = useCallback((trackId: string, kfId: string, newTime: number) => {
    useAnimationStore.getState().moveKeyframe(trackId, kfId, newTime);
  }, []);

  const handleRemoveKeyframe = useCallback((trackId: string, kfId: string) => {
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().removeKeyframe(trackId, kfId);
  }, []);

  const handleToggleTrackEnabled = useCallback((trackId: string) => {
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().toggleTrackEnabled(trackId);
  }, []);

  const handleRemoveTrack = useCallback((trackId: string) => {
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().removeTrack(trackId);
  }, []);

  const handleUpdateKeyframe = useCallback((...args: [string, string, any]) => {
    useUndoRedoStore.getState().pushState();
    useAnimationStore.getState().updateKeyframe(...args);
  }, []);

  const handleSelectTarget = useCallback((targetId: string) => {
    useUIStore.getState().setSelectedElements([targetId]);
  }, []);

  const handleSelectElements = useCallback((ids: string[]) => {
    useUIStore.getState().setSelectedElements(ids);
    // Clear keyframe selection when element selection changes
    useAnimationStore.getState().clearKeyframeSelection();
  }, []);

  const handleAddOrUpdateKeyframe = useCallback((trackId: string, time: number, value: number) => {
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const track = store.timeline.tracks.find((t) => t.id === trackId);
    if (!track) return;

    // Find existing keyframe at (or very near) this time
    const roundedTime = Math.round(time);
    const existing = track.keyframes.find((kf) => Math.abs(kf.time - roundedTime) < 1);

    if (existing) {
      store.updateKeyframe(trackId, existing.id, { value });
    } else {
      store.addKeyframe(trackId, roundedTime, value);
    }

    // Camera frame: sync scaleX ↔ scaleY to maintain aspect ratio
    if (track.targetId === CAMERA_FRAME_TARGET_ID &&
        (track.property === 'scaleX' || track.property === 'scaleY')) {
      const otherProp = track.property === 'scaleX' ? 'scaleY' : 'scaleX';
      const otherTrack = useAnimationStore.getState().timeline.tracks.find(
        (t) => t.targetId === CAMERA_FRAME_TARGET_ID && t.property === otherProp,
      );
      if (otherTrack) {
        const otherExisting = otherTrack.keyframes.find((kf) => Math.abs(kf.time - roundedTime) < 1);
        if (otherExisting) {
          useAnimationStore.getState().updateKeyframe(otherTrack.id, otherExisting.id, { value });
        } else {
          useAnimationStore.getState().addKeyframe(otherTrack.id, roundedTime, value);
        }
      }
    }
  }, []);

  // Handle drag on canvas — auto-create translateX/Y keyframes
  const handleDragElement = useCallback((targetId: string, deltaX: number, deltaY: number) => {
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const time = Math.round(usePlaybackStore.getState().currentTime);
    const target = useProjectStore.getState().targets.find((t) => t.id === targetId);
    const targetType = target?.type ?? 'element';

    // Ensure translateX track exists, then add/update keyframe
    const ensureTrackAndSetValue = (property: 'translateX' | 'translateY', value: number) => {
      let track = store.timeline.tracks.find(
        (t) => t.targetId === targetId && t.property === property,
      );
      if (!track) {
        store.addTrack(targetId, targetType, property);
        track = useAnimationStore.getState().timeline.tracks.find(
          (t) => t.targetId === targetId && t.property === property,
        );
      }
      if (!track) return;

      const existing = track.keyframes.find((kf) => Math.abs(kf.time - time) < 1);
      const currentValue = existing?.value ?? 0;
      if (existing) {
        store.updateKeyframe(track.id, existing.id, { value: currentValue + value });
      } else {
        store.addKeyframe(track.id, time, currentValue + value);
      }
    };

    if (Math.abs(deltaX) > 2) ensureTrackAndSetValue('translateX', deltaX);
    if (Math.abs(deltaY) > 2) ensureTrackAndSetValue('translateY', deltaY);
  }, []);

  const handleAddTrackProp = useCallback((targetId: string, targetType: 'element' | 'group', property: AnimatableProperty) => {
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const time = Math.round(usePlaybackStore.getState().currentTime);

    // Camera frame: adding scaleX (Zoom) auto-adds scaleY too to maintain aspect ratio
    if (targetId === CAMERA_FRAME_TARGET_ID && (property === 'scaleX' || property === 'scaleY')) {
      for (const prop of ['scaleX', 'scaleY'] as const) {
        const existing = store.timeline.tracks.find(
          (t) => t.targetId === targetId && t.property === prop,
        );
        if (!existing) {
          store.addTrack(targetId, targetType, prop);
          const newTrack = useAnimationStore.getState().timeline.tracks.find(
            (t) => t.targetId === targetId && t.property === prop,
          );
          if (newTrack) {
            useAnimationStore.getState().addKeyframe(newTrack.id, time, PROPERTY_DEFAULTS[prop]);
          }
        }
      }
      return;
    }

    store.addTrack(targetId, targetType, property);
    const newTrack = useAnimationStore.getState().timeline.tracks.find(
      (t) => t.targetId === targetId && t.property === property,
    );
    if (newTrack) {
      store.addKeyframe(newTrack.id, time, PROPERTY_DEFAULTS[property]);
    }
  }, []);

  // Handle resize on canvas — auto-create scaleX/scaleY keyframes
  const handleResizeElement = useCallback((targetId: string, dScaleX: number, dScaleY: number) => {
    useUndoRedoStore.getState().pushState();
    const store = useAnimationStore.getState();
    const time = Math.round(usePlaybackStore.getState().currentTime);
    const target = useProjectStore.getState().targets.find((t) => t.id === targetId);
    const targetType = target?.type ?? 'element';

    const ensureScaleTrack = (property: 'scaleX' | 'scaleY', delta: number) => {
      let track = store.timeline.tracks.find(
        (t) => t.targetId === targetId && t.property === property,
      );
      if (!track) {
        store.addTrack(targetId, targetType, property);
        track = useAnimationStore.getState().timeline.tracks.find(
          (t) => t.targetId === targetId && t.property === property,
        );
      }
      if (!track) return;
      const existing = track.keyframes.find((kf) => Math.abs(kf.time - time) < 1);
      const currentValue = existing?.value ?? 1;
      const newValue = Math.max(0.1, currentValue + delta);
      if (existing) {
        useAnimationStore.getState().updateKeyframe(track.id, existing.id, { value: newValue });
      } else {
        useAnimationStore.getState().addKeyframe(track.id, time, newValue);
      }
    };

    // Camera frame: use uniform scale to maintain aspect ratio
    if (targetId === CAMERA_FRAME_TARGET_ID) {
      const uniformDelta = (dScaleX + dScaleY) / 2;
      ensureScaleTrack('scaleX', uniformDelta);
      ensureScaleTrack('scaleY', uniformDelta);
    } else {
      if (Math.abs(dScaleX) > 0.01) ensureScaleTrack('scaleX', dScaleX);
      if (Math.abs(dScaleY) > 0.01) ensureScaleTrack('scaleY', dScaleY);
    }
  }, []);

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
