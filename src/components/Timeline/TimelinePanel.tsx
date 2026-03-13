import { useState, useRef, useCallback, useEffect, type MouseEvent } from 'react';
import type { AnimationTrack, Keyframe } from '../../types/animation';
import type { AnimatableProperty } from '../../types/animation';

// Property display configuration
const PROPERTY_LABELS: Record<AnimatableProperty, string> = {
  opacity: 'Opacity',
  translateX: 'Position X',
  translateY: 'Position Y',
  scaleX: 'Scale X',
  scaleY: 'Scale Y',
  rotation: 'Rotation',
  drawProgress: 'Draw',
};

const PROPERTY_ICONS: Record<AnimatableProperty, string> = {
  opacity: '👁',
  translateX: '↔',
  translateY: '↕',
  scaleX: '⇔',
  scaleY: '⇕',
  rotation: '↻',
  drawProgress: '✏',
};

// Compound track groups: X+Y shown as single row
const COMPOUND_PAIRS: [AnimatableProperty, AnimatableProperty, string, string][] = [
  ['translateX', 'translateY', 'Position', '⊹'],
  ['scaleX', 'scaleY', 'Scale', '⇔'],
];

/** A target group contains all tracks for one element/group, collapsible. */
type TargetGroup = {
  targetId: string;
  label: string;
  propertyTracks: VisualTrack[];
  allTracks: AnimationTrack[]; // flat list of all tracks in this group
};

/** A visual track is one row in the timeline (a single property or compound pair). */
type VisualTrack = {
  id: string;
  label: string;
  icon: string;
  tracks: AnimationTrack[];
  targetId: string;
};

function buildTargetGroups(tracks: AnimationTrack[], targetLabels: Map<string, string>, targetOrder: Map<string, number>): TargetGroup[] {
  // Group all tracks by targetId
  const byTarget = new Map<string, AnimationTrack[]>();
  for (const t of tracks) {
    if (!byTarget.has(t.targetId)) byTarget.set(t.targetId, []);
    byTarget.get(t.targetId)!.push(t);
  }

  const groups: TargetGroup[] = [];
  for (const [targetId, targetTracks] of byTarget) {
    const tLabel = targetLabels.get(targetId) ?? targetId;
    const consumed = new Set<string>();
    const propertyTracks: VisualTrack[] = [];

    // Pair compounds first
    for (const [propA, propB, pLabel, icon] of COMPOUND_PAIRS) {
      const pair = targetTracks.filter(t => t.property === propA || t.property === propB);
      if (pair.length > 0) {
        propertyTracks.push({
          id: pair[0].id,
          label: pLabel,
          icon,
          tracks: pair,
          targetId,
        });
        pair.forEach(t => consumed.add(t.id));
      }
    }

    // Standalone properties
    for (const t of targetTracks) {
      if (consumed.has(t.id)) continue;
      propertyTracks.push({
        id: t.id,
        label: PROPERTY_LABELS[t.property],
        icon: PROPERTY_ICONS[t.property],
        tracks: [t],
        targetId,
      });
    }

    groups.push({
      targetId,
      label: tLabel,
      propertyTracks,
      allTracks: targetTracks,
    });
  }

  // Sort groups by layer order
  groups.sort((a, b) => (targetOrder.get(a.targetId) ?? 0) - (targetOrder.get(b.targetId) ?? 0));

  return groups;
}

interface TimelinePanelProps {
  tracks: AnimationTrack[];
  duration: number;
  currentTime: number;
  selectedTrackId: string | null;
  selectedKeyframeIds: string[];
  selectedElementIds: string[];
  clipStart: number;
  clipEnd: number;
  onSelectTrack: (trackId: string | null) => void;
  onSelectKeyframes: (ids: string[]) => void;
  onAddKeyframe: (trackId: string, time: number, value: number) => void;
  onMoveKeyframe: (trackId: string, keyframeId: string, newTime: number) => void;
  onDeleteKeyframe: (trackId: string, keyframeId: string) => void;
  onScrub: (time: number) => void;
  onToggleTrackEnabled: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
  onClipRangeChange: (start: number, end: number) => void;
  targetLabels: Map<string, string>;
  /** Map of targetId → sort order (from layers panel / zIndex) */
  targetOrder: Map<string, number>;
  zoom?: number;
}

const TRACK_HEIGHT = 28;
const HEADER_HEIGHT = 24;
const TRACK_LIST_WIDTH = 200;
const MIN_ZOOM = 0.02;
const MAX_ZOOM = 1;

function timeToPixel(time: number, zoom: number): number {
  return time * zoom;
}

function pixelToTime(pixel: number, zoom: number): number {
  return pixel / zoom;
}

function TimeRuler({
  duration,
  zoom,
  scrollX,
  width,
}: {
  duration: number;
  zoom: number;
  scrollX: number;
  width: number;
}) {
  // Calculate tick interval based on zoom
  const intervals = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const minTickSpacing = 60;
  let tickInterval = intervals[0];
  for (const interval of intervals) {
    if (interval * zoom >= minTickSpacing) {
      tickInterval = interval;
      break;
    }
  }

  const startTime = Math.floor(pixelToTime(scrollX, zoom) / tickInterval) * tickInterval;
  const endTime = pixelToTime(scrollX + width, zoom);
  const ticks: { time: number; x: number; label: string }[] = [];

  for (let time = startTime; time <= endTime + tickInterval; time += tickInterval) {
    if (time < 0) continue;
    const x = timeToPixel(time, zoom) - scrollX;
    const secs = time / 1000;
    const label = secs >= 60
      ? `${Math.floor(secs / 60)}:${(secs % 60).toFixed(secs % 1 === 0 ? 0 : 1).padStart(secs % 60 < 10 ? 3 : 4, '0')}`
      : `${secs.toFixed(secs % 1 === 0 ? 0 : 1)}s`;
    ticks.push({ time, x, label });
  }

  return (
    <div className="relative h-6 border-b border-[var(--color-border)] bg-[#1a1a2a] select-none overflow-hidden">
      {ticks.map(({ time, x, label }) => (
        <div key={time} className="absolute top-0 h-full" style={{ left: `${x}px` }}>
          <div className="absolute bottom-0 w-px h-2 bg-[var(--color-text-secondary)]" />
          <span className="absolute top-0.5 left-1 text-[10px] text-[var(--color-text-secondary)] whitespace-nowrap">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function TrackRow({
  track,
  isSelected,
  targetLabel,
  onSelect,
  onToggleEnabled,
  onRemove,
  onAddKeyframeHere,
}: {
  track: AnimationTrack;
  isSelected: boolean;
  targetLabel: string;
  onSelect: () => void;
  onToggleEnabled: () => void;
  onRemove: () => void;
  onAddKeyframeHere: () => void;
}) {
  return (
    <div
      className={`flex items-center h-7 px-2 gap-1 cursor-pointer border-b border-[var(--color-border)] text-xs select-none
        ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}
        ${!track.enabled ? 'opacity-40' : ''}`}
      onClick={onSelect}
    >
      <span className="shrink-0" title={PROPERTY_LABELS[track.property]}>
        {PROPERTY_ICONS[track.property]}
      </span>
      <span className="truncate flex-1" title={`${targetLabel} · ${PROPERTY_LABELS[track.property]}`}>
        {targetLabel} · {PROPERTY_LABELS[track.property]}
      </span>
      <button
        className="shrink-0 text-[10px] hover:text-indigo-400"
        onClick={(e) => { e.stopPropagation(); onAddKeyframeHere(); }}
        title="Add keyframe at playhead"
      >
        ◆+
      </button>
      <button
        className="shrink-0 text-[10px] hover:text-yellow-400"
        onClick={(e) => { e.stopPropagation(); onToggleEnabled(); }}
        title={track.enabled ? 'Mute' : 'Unmute'}
      >
        {track.enabled ? '●' : '○'}
      </button>
      <button
        className="shrink-0 text-[10px] hover:text-red-400"
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        title="Remove track"
      >
        ✕
      </button>
    </div>
  );
}

function KeyframeDiamondView({
  keyframe,
  x,
  isSelected,
  onSelect,
  onDragStart,
}: {
  keyframe: Keyframe;
  x: number;
  isSelected: boolean;
  onSelect: (id: string, addToSelection: boolean) => void;
  onDragStart: (id: string, startX: number) => void;
}) {
  const handleMouseDown = (e: MouseEvent) => {
    e.stopPropagation();
    onSelect(keyframe.id, e.shiftKey || e.ctrlKey || e.metaKey);
    onDragStart(keyframe.id, e.clientX);
  };

  return (
    <div
      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 cursor-pointer
        transition-colors border
        ${isSelected
          ? 'bg-indigo-400 border-indigo-300 shadow-sm shadow-indigo-500/50'
          : 'bg-[var(--color-text-secondary)] border-[var(--color-border)] hover:bg-indigo-300'}`}
      style={{ left: `${x}px` }}
      onMouseDown={handleMouseDown}
      title={`t=${keyframe.time}ms, v=${keyframe.value}`}
      aria-label={`Keyframe at ${keyframe.time}ms, value ${keyframe.value}`}
      tabIndex={0}
    />
  );
}

export function TimelinePanel({
  tracks,
  duration,
  currentTime,
  selectedTrackId,
  selectedKeyframeIds,
  selectedElementIds,
  clipStart,
  clipEnd,
  onSelectTrack,
  onSelectKeyframes,
  onAddKeyframe,
  onMoveKeyframe,
  onDeleteKeyframe: _onDeleteKeyframe,
  onScrub,
  onToggleTrackEnabled,
  onRemoveTrack,
  onClipRangeChange,
  targetLabels,
  targetOrder,
  zoom: initialZoom = 0.1,
}: TimelinePanelProps) {
  const [scrollX, setScrollX] = useState(0);
  const [zoom, setZoom] = useState(initialZoom);
  const [dragState, setDragState] = useState<{
    keyframeId: string;
    trackId: string;
    startClientX: number;
    startTime: number;
  } | null>(null);
  const keyframeAreaRef = useRef<HTMLDivElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const keyframeScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Sync vertical scroll between track list and keyframe area
  const syncScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const left = trackListRef.current;
    const right = keyframeScrollRef.current;
    if (left && right) {
      if (source === 'left') right.scrollTop = left.scrollTop;
      else left.scrollTop = right.scrollTop;
    }
    requestAnimationFrame(() => { isSyncingScroll.current = false; });
  }, []);

  // Native wheel handler (non-passive) to prevent vertical scroll on keyframe area
  useEffect(() => {
    const el = keyframeScrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        // Horizontal scroll (shift+wheel or trackpad horizontal)
        setScrollX((s) => Math.max(0, s + e.deltaX + (e.shiftKey ? e.deltaY : 0)));
      } else {
        // Vertical scroll — apply to both sides
        const left = trackListRef.current;
        if (el && left) {
          const newTop = Math.max(0, el.scrollTop + e.deltaY);
          el.scrollTop = newTop;
          left.scrollTop = newTop;
        }
      }
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, []);

  const handleKeyframeAreaClick = useCallback(
    (e: MouseEvent, trackId: string) => {
      if (!keyframeAreaRef.current) return;
      const rect = keyframeAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const time = Math.round(pixelToTime(x, zoom));
      onAddKeyframe(trackId, time, 0);
    },
    [scrollX, zoom, onAddKeyframe],
  );

  const handleScrubberMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!keyframeAreaRef.current) return;
      const rect = keyframeAreaRef.current.getBoundingClientRect();

      // Collect all keyframe times for snapping
      const allKeyframeTimes = new Set<number>();
      allKeyframeTimes.add(0);
      allKeyframeTimes.add(duration);
      for (const track of tracks) {
        for (const kf of track.keyframes) {
          allKeyframeTimes.add(kf.time);
        }
      }
      const snapTimes = Array.from(allKeyframeTimes).sort((a, b) => a - b);
      const SNAP_PX = 8; // snap threshold in pixels

      const updateTime = (clientX: number) => {
        const x = clientX - rect.left + scrollX;
        let time = Math.max(0, pixelToTime(x, zoom));

        // Snap to nearest keyframe if within threshold
        for (const snapTime of snapTimes) {
          const snapPx = Math.abs(timeToPixel(snapTime, zoom) - timeToPixel(time, zoom));
          if (snapPx < SNAP_PX) {
            time = snapTime;
            break;
          }
        }

        onScrub(time);
      };

      updateTime(e.clientX);

      const handleMouseMove = (me: globalThis.MouseEvent) => updateTime(me.clientX);
      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [scrollX, zoom, onScrub, tracks],
  );

  const handleKeyframeDragStart = useCallback(
    (keyframeId: string, startClientX: number, trackId: string, startTime: number) => {
      setDragState({ keyframeId, trackId, startClientX, startTime });

      const handleMouseMove = (e: globalThis.MouseEvent) => {
        const deltaPx = e.clientX - startClientX;
        const deltaTime = pixelToTime(deltaPx, zoom);
        const newTime = Math.max(0, Math.round(startTime + deltaTime));
        onMoveKeyframe(trackId, keyframeId, newTime);
      };

      const handleMouseUp = () => {
        setDragState(null);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [zoom, onMoveKeyframe],
  );

  const playheadX = timeToPixel(currentTime, zoom) - scrollX;
  const totalWidth = timeToPixel(duration, zoom);
  const targetGroups = buildTargetGroups(tracks, targetLabels, targetOrder);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  const toggleCollapse = (targetId: string) => {
    setExpandedTargets(prev => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  // Build flat row list for rendering (collapsed = 1 row per target, expanded = 1 header + N property rows)
  type RowData = 
    | { type: 'target-header'; group: TargetGroup; collapsed: boolean }
    | { type: 'property'; vt: VisualTrack; group: TargetGroup };

  const rows: RowData[] = [];
  for (const group of targetGroups) {
    const collapsed = !expandedTargets.has(group.targetId);
    rows.push({ type: 'target-header', group, collapsed });
    if (!collapsed) {
      for (const vt of group.propertyTracks) {
        rows.push({ type: 'property', vt, group });
      }
    }
  }

  // Auto-scroll to selected element when selection changes
  useEffect(() => {
    if (selectedElementIds.length === 0) return;
    const selectedId = selectedElementIds[0];
    // Find the row index for this target
    const rowIndex = rows.findIndex(
      r => (r.type === 'target-header' && r.group.targetId === selectedId) ||
           (r.type === 'target-header' && r.group.allTracks.some(t => t.targetId === selectedId))
    );
    if (rowIndex >= 0) {
      const scrollTop = rowIndex * TRACK_HEIGHT;
      trackListRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' });
      keyframeScrollRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [selectedElementIds]);

  // Clip range positions in pixels
  const clipStartX = timeToPixel(clipStart, zoom) - scrollX;
  const clipEndX = timeToPixel(clipEnd, zoom) - scrollX;

  // Clip marker drag handler
  const handleClipMarkerDrag = useCallback(
    (marker: 'start' | 'end', e: MouseEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const startClientX = e.clientX;
      const startTime = marker === 'start' ? clipStart : clipEnd;

      const handleMove = (me: globalThis.MouseEvent) => {
        const dx = me.clientX - startClientX;
        const newTime = Math.max(0, startTime + dx / zoom);
        if (marker === 'start') {
          onClipRangeChange(Math.min(newTime, clipEnd - 100), clipEnd);
        } else {
          onClipRangeChange(clipStart, Math.max(newTime, clipStart + 100));
        }
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [clipStart, clipEnd, zoom, onClipRangeChange],
  );

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header row */}
      <div className="flex" style={{ height: HEADER_HEIGHT }}>
        {/* Track list header */}
        <div
          className="shrink-0 flex items-center px-2 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-r border-[var(--color-border)] bg-[#1a1a2a]"
          style={{ width: TRACK_LIST_WIDTH }}
        >
          Tracks
        </div>
        {/* Time ruler */}
        <div className="flex-1 overflow-hidden" ref={keyframeAreaRef} onMouseDown={handleScrubberMouseDown} aria-label="Timeline scrubber">
          <TimeRuler duration={duration} zoom={zoom} scrollX={scrollX} width={keyframeAreaRef.current?.clientWidth ?? 800} />
        </div>
      </div>

      {/* Content row */}
      <div className="flex flex-1 overflow-hidden">
        {/* Track list (left sidebar) */}
        <div
          ref={trackListRef}
          className="shrink-0 overflow-y-auto border-r border-[var(--color-border)]"
          style={{ width: TRACK_LIST_WIDTH }}
          onScroll={() => syncScroll('left')}
        >
          {rows.map((row, idx) => {
            if (row.type === 'target-header') {
              const { group, collapsed } = row;
              const isAnySelected = group.allTracks.some(t => t.id === selectedTrackId);
              return (
                <div
                  key={`hdr-${group.targetId}`}
                  className={`flex items-center h-7 px-1 gap-1 cursor-pointer border-b border-[var(--color-border)] text-xs select-none
                    ${isAnySelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-[var(--color-surface)] text-[var(--color-text)]'}
                    ${group.allTracks.some(t => !t.enabled) ? 'opacity-40' : ''}`}
                  onClick={() => toggleCollapse(group.targetId)}
                >
                  <span className="shrink-0 text-[10px] w-3 text-center text-[var(--color-text-secondary)]">{collapsed ? '▸' : '▾'}</span>
                  <span className="truncate flex-1 font-medium">{group.label}</span>
                  <button className="shrink-0 text-[10px] hover:text-indigo-400"
                    onClick={(e) => { e.stopPropagation(); group.allTracks.forEach(t => onAddKeyframe(t.id, Math.round(currentTime), 0)); }}
                    title="Add keyframe for all properties">◆+</button>
                  <button className="shrink-0 text-[10px] hover:text-red-400"
                    onClick={(e) => { e.stopPropagation(); group.allTracks.forEach(t => onRemoveTrack(t.id)); }}
                    title="Remove all tracks">✕</button>
                </div>
              );
            }
            // Property row (indented)
            const { vt } = row;
            const isSelected = vt.tracks.some(t => t.id === selectedTrackId);
            return (
              <div
                key={vt.id}
                className={`flex items-center h-7 pl-5 pr-2 gap-1 cursor-pointer border-b border-[var(--color-border)] text-xs select-none
                  ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}
                  ${vt.tracks.some(t => !t.enabled) ? 'opacity-40' : ''}`}
                onClick={() => onSelectTrack(vt.tracks[0].id)}
              >
                <span className="shrink-0">{vt.icon}</span>
                <span className="truncate flex-1">{vt.label}</span>
                <button className="shrink-0 text-[10px] hover:text-indigo-400"
                  onClick={(e) => { e.stopPropagation(); vt.tracks.forEach(t => onAddKeyframe(t.id, Math.round(currentTime), 0)); }}
                  title="Add keyframe">◆+</button>
                <button className="shrink-0 text-[10px] hover:text-yellow-400"
                  onClick={(e) => { e.stopPropagation(); vt.tracks.forEach(t => onToggleTrackEnabled(t.id)); }}
                  title="Mute">{vt.tracks[0].enabled ? '●' : '○'}</button>
                <button className="shrink-0 text-[10px] hover:text-red-400"
                  onClick={(e) => { e.stopPropagation(); vt.tracks.forEach(t => onRemoveTrack(t.id)); }}
                  title="Remove">✕</button>
              </div>
            );
          })}
          {targetGroups.length === 0 && (
            <div className="p-3 text-xs text-[var(--color-text-secondary)] text-center">
              <p className="mb-2">No animation tracks yet.</p>
              <p className="text-[10px] opacity-70">
                Select an element and change a property value to start animating.
              </p>
            </div>
          )}
        </div>

        {/* Keyframe area (right, scrollable) */}
        <div
          ref={keyframeScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative"
          role="grid"
          aria-label="Keyframe timeline"
          onScroll={() => syncScroll('right')}
        >
          {/* Clip range overlays — dim areas outside the render range */}
          {clipStartX > 0 && (
            <div
              className="absolute top-0 pointer-events-none"
              style={{ left: 0, width: `${clipStartX}px`, height: `max(100%, ${rows.length * TRACK_HEIGHT}px)`, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 5 }}
            />
          )}
          <div
            className="absolute top-0 pointer-events-none"
            style={{ left: `${clipEndX}px`, width: '100vw', height: `max(100%, ${rows.length * TRACK_HEIGHT}px)`, backgroundColor: 'rgba(0,0,0,0.15)', zIndex: 5 }}
          />

          {/* Clip start marker */}
          <div
            className="absolute top-0 z-20 cursor-col-resize group"
            style={{ left: `${Math.max(0, clipStartX - 4)}px`, width: '8px', height: `max(100%, ${rows.length * TRACK_HEIGHT}px)` }}
            onMouseDown={(e) => handleClipMarkerDrag('start', e)}
          >
            <div className="absolute top-0 left-[3px] w-[2px] h-full" style={{ backgroundColor: '#a855f7' }} />
            <div className="absolute top-0 left-0 w-2 h-4 rounded-b-sm" style={{ backgroundColor: '#a855f7' }} />
          </div>

          {/* Clip end marker */}
          <div
            className="absolute top-0 z-20 cursor-col-resize group"
            style={{ left: `${clipEndX - 4}px`, width: '8px', height: `max(100%, ${rows.length * TRACK_HEIGHT}px)` }}
            onMouseDown={(e) => handleClipMarkerDrag('end', e)}
          >
            <div className="absolute top-0 left-[3px] w-[2px] h-full" style={{ backgroundColor: '#a855f7' }} />
            <div className="absolute top-0 left-0 w-2 h-4 rounded-b-sm" style={{ backgroundColor: '#a855f7' }} />
          </div>

          {/* Playhead line */}
          {playheadX >= 0 && (
            <div
              className="absolute top-0 w-px bg-red-500 z-10 pointer-events-none"
              style={{ left: `${playheadX}px`, height: `max(100%, ${rows.length * TRACK_HEIGHT}px)` }}
            >
              <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
            </div>
          )}

          {/* Keyframe rows — matching the left sidebar structure */}
          {rows.map((row, idx) => {
            if (row.type === 'target-header') {
              const { group, collapsed } = row;
              // When collapsed: show ALL keyframes from all tracks in one row
              const allKfs: { kf: Keyframe; trackId: string }[] = [];
              if (collapsed) {
                for (const t of group.allTracks) {
                  for (const kf of t.keyframes) {
                    allKfs.push({ kf, trackId: t.id });
                  }
                }
              }
              return (
                <div
                  key={`hdr-${group.targetId}`}
                  className="relative border-b border-[var(--color-border)] bg-white/[0.01]"
                  style={{ height: TRACK_HEIGHT }}
                >
                  {collapsed && allKfs.map(({ kf, trackId }) => {
                    const x = timeToPixel(kf.time, zoom) - scrollX;
                    return (
                      <KeyframeDiamondView
                        key={kf.id}
                        keyframe={kf}
                        x={x}
                        isSelected={selectedKeyframeIds.includes(kf.id)}
                        onSelect={(id, addToSelection) => {
                          if (addToSelection) onSelectKeyframes([...selectedKeyframeIds, id]);
                          else onSelectKeyframes([id]);
                        }}
                        onDragStart={(id, startX) => handleKeyframeDragStart(id, startX, trackId, kf.time)}
                      />
                    );
                  })}
                </div>
              );
            }

            // Property row
            const { vt } = row;
            const isSelected = vt.tracks.some(t => t.id === selectedTrackId);
            const allKfs: { kf: Keyframe; trackId: string }[] = [];
            for (const t of vt.tracks) {
              for (const kf of t.keyframes) {
                allKfs.push({ kf, trackId: t.id });
              }
            }
            return (
              <div
                key={vt.id}
                role="row"
                className={`relative border-b border-[var(--color-border)] ${
                  isSelected ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'
                }`}
                style={{ height: TRACK_HEIGHT }}
                onDoubleClick={(e) => handleKeyframeAreaClick(e, vt.tracks[0].id)}
              >
                {allKfs.map(({ kf, trackId }) => {
                  const x = timeToPixel(kf.time, zoom) - scrollX;
                  return (
                    <KeyframeDiamondView
                      key={kf.id}
                      keyframe={kf}
                      x={x}
                      isSelected={selectedKeyframeIds.includes(kf.id)}
                      onSelect={(id, addToSelection) => {
                        if (addToSelection) onSelectKeyframes([...selectedKeyframeIds, id]);
                        else onSelectKeyframes([id]);
                      }}
                      onDragStart={(id, startX) => handleKeyframeDragStart(id, startX, trackId, kf.time)}
                    />
                  );
                })}
              </div>
            );
          })}

          {/* Duration marker */}
          <div
            className="absolute top-0 bottom-0 w-px bg-[var(--color-border)] opacity-50 pointer-events-none"
            style={{ left: `${totalWidth - scrollX}px` }}
          />
        </div>
      </div>

      {/* Bottom controls */}
      <div className="flex items-center h-6 px-2 gap-2 border-t border-[var(--color-border)] bg-[#1a1a2a] text-[10px] text-[var(--color-text-secondary)]">
        <span>Zoom:</span>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-20 h-1 accent-indigo-500"
        />
        <span>{Math.round(zoom * 1000)}%</span>
        <div className="flex-1" />
        <span>Clip: {(clipStart / 1000).toFixed(1)}s – {(clipEnd / 1000).toFixed(1)}s ({((clipEnd - clipStart) / 1000).toFixed(1)}s)</span>
        {dragState && <span className="text-yellow-400">Dragging...</span>}
      </div>
    </div>
  );
}
