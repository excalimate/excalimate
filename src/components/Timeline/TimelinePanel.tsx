import { useMemo, useRef, useState } from 'react';
import type { AnimationTrack, Keyframe } from '../../types/animation';
import { KeyframeDiamond } from './KeyframeDiamond';
import { TimeRuler } from './TimeRuler';
import { timeToPixel } from './timelineMath';
import {
  buildTargetGroups,
  HEADER_HEIGHT,
  MAX_ZOOM,
  MIN_ZOOM,
  TRACK_HEIGHT,
  TRACK_LIST_WIDTH,
  type TargetGroup,
  type VisualTrack,
} from './timelineModel';
import { useTimelineInteractions, type TimelineRowData } from './useTimelineInteractions';

export interface TimelinePanelProps {
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
  targetOrder: Map<string, number>;
  zoom?: number;
}

type RowData = { type: 'target-header'; group: TargetGroup; collapsed: boolean } | { type: 'property'; vt: VisualTrack; group: TargetGroup };

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
  void _onDeleteKeyframe;

  const [scrollX, setScrollX] = useState(0);
  const [zoom, setZoom] = useState(initialZoom);
  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  const keyframeAreaRef = useRef<HTMLDivElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const keyframeScrollRef = useRef<HTMLDivElement>(null);

  const playheadX = timeToPixel(currentTime, zoom) - scrollX;
  const totalWidth = timeToPixel(duration, zoom);
  const targetGroups = useMemo(
    () => buildTargetGroups(tracks, targetLabels, targetOrder),
    [tracks, targetLabels, targetOrder],
  );

  const toggleCollapse = (targetId: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  const rows: RowData[] = useMemo(() => {
    const result: RowData[] = [];
    for (const group of targetGroups) {
      const collapsed = !expandedTargets.has(group.targetId);
      result.push({ type: 'target-header', group, collapsed });
      if (!collapsed) {
        for (const vt of group.propertyTracks) {
          result.push({ type: 'property', vt, group });
        }
      }
    }
    return result;
  }, [targetGroups, expandedTargets]);

  const interactionRows: TimelineRowData[] = rows.map((row) =>
    row.type === 'target-header'
      ? { type: 'target-header', group: { targetId: row.group.targetId, allTracks: row.group.allTracks }, collapsed: row.collapsed }
      : { type: 'property' },
  );

  const { syncScroll, rulerWidth, handleKeyframeAreaClick, handleScrubberMouseDown, handleKeyframeDragStart, handleClipMarkerDrag, dragState } =
    useTimelineInteractions({
      keyframeAreaRef,
      trackListRef,
      keyframeScrollRef,
      rows: interactionRows,
      tracks,
      duration,
      currentTime,
      zoom,
      setZoom,
      scrollX,
      setScrollX,
      clipStart,
      clipEnd,
      selectedElementIds,
      onAddKeyframe,
      onMoveKeyframe,
      onScrub,
      onClipRangeChange,
    });

  const clipStartX = timeToPixel(clipStart, zoom) - scrollX;
  const clipEndX = timeToPixel(clipEnd, zoom) - scrollX;

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex" style={{ height: HEADER_HEIGHT }}>
        <div
          className="shrink-0 flex items-center px-2 text-[10px] font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider border-b border-r border-[var(--color-border)] bg-[#1a1a2a]"
          style={{ width: TRACK_LIST_WIDTH }}
        >
          Tracks
        </div>
        <div className="flex-1 overflow-hidden" ref={keyframeAreaRef} onMouseDown={handleScrubberMouseDown} aria-label="Timeline scrubber">
          <TimeRuler duration={duration} zoom={zoom} scrollX={scrollX} width={rulerWidth} />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={trackListRef}
          className="shrink-0 overflow-y-auto border-r border-[var(--color-border)]"
          style={{ width: TRACK_LIST_WIDTH }}
          onScroll={() => syncScroll('left')}
        >
          {rows.map((row) => {
            if (row.type === 'target-header') {
              const { group, collapsed } = row;
              const isAnySelected = group.allTracks.some((t) => t.id === selectedTrackId);
              return (
                <div
                  key={`hdr-${group.targetId}`}
                  className={`flex items-center h-7 px-1 gap-1 cursor-pointer border-b border-[var(--color-border)] text-xs select-none
                    ${isAnySelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-[var(--color-surface)] text-[var(--color-text)]'}
                    ${group.allTracks.some((t) => !t.enabled) ? 'opacity-40' : ''}`}
                  onClick={() => toggleCollapse(group.targetId)}
                >
                  <span className="shrink-0 text-[10px] w-3 text-center text-[var(--color-text-secondary)]">{collapsed ? '▸' : '▾'}</span>
                  <span className="truncate flex-1 font-medium">{group.label}</span>
                  <button
                    className="shrink-0 text-[10px] hover:text-indigo-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      group.allTracks.forEach((t) => onAddKeyframe(t.id, Math.round(currentTime), 0));
                    }}
                    title="Add keyframe for all properties"
                  >
                    ◆+
                  </button>
                  <button
                    className="shrink-0 text-[10px] hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      group.allTracks.forEach((t) => onRemoveTrack(t.id));
                    }}
                    title="Remove all tracks"
                  >
                    ✕
                  </button>
                </div>
              );
            }
            const { vt } = row;
            const isSelected = vt.tracks.some((t) => t.id === selectedTrackId);
            return (
              <div
                key={vt.id}
                className={`flex items-center h-7 pl-5 pr-2 gap-1 cursor-pointer border-b border-[var(--color-border)] text-xs select-none
                  ${isSelected ? 'bg-indigo-500/10 text-indigo-300' : 'hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]'}
                  ${vt.tracks.some((t) => !t.enabled) ? 'opacity-40' : ''}`}
                onClick={() => onSelectTrack(vt.tracks[0].id)}
              >
                <span className="shrink-0">{vt.icon}</span>
                <span className="truncate flex-1">{vt.label}</span>
                <button
                  className="shrink-0 text-[10px] hover:text-indigo-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    vt.tracks.forEach((t) => onAddKeyframe(t.id, Math.round(currentTime), 0));
                  }}
                  title="Add keyframe"
                >
                  ◆+
                </button>
                <button
                  className="shrink-0 text-[10px] hover:text-yellow-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    vt.tracks.forEach((t) => onToggleTrackEnabled(t.id));
                  }}
                  title="Mute"
                >
                  {vt.tracks[0].enabled ? '●' : '○'}
                </button>
                <button
                  className="shrink-0 text-[10px] hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    vt.tracks.forEach((t) => onRemoveTrack(t.id));
                  }}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            );
          })}
          {targetGroups.length === 0 && (
            <div className="p-3 text-xs text-[var(--color-text-secondary)] text-center">
              <p className="mb-2">No animation tracks yet.</p>
              <p className="text-[10px] opacity-70">Select an element and change a property value to start animating.</p>
            </div>
          )}
        </div>

        <div
          ref={keyframeScrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden relative"
          role="grid"
          aria-label="Keyframe timeline"
          onScroll={() => syncScroll('right')}
        >
          {clipStartX > 0 && (
            <div
              className="absolute top-0 pointer-events-none"
              style={{
                left: 0,
                width: `${clipStartX}px`,
                height: `max(100%, ${rows.length * TRACK_HEIGHT}px)`,
                backgroundColor: 'rgba(0,0,0,0.15)',
                zIndex: 5,
              }}
            />
          )}
          <div
            className="absolute top-0 pointer-events-none"
            style={{
              left: `${clipEndX}px`,
              width: '100vw',
              height: `max(100%, ${rows.length * TRACK_HEIGHT}px)`,
              backgroundColor: 'rgba(0,0,0,0.15)',
              zIndex: 5,
            }}
          />

          <div
            className="absolute top-0 z-20 cursor-col-resize group"
            style={{ left: `${Math.max(0, clipStartX - 4)}px`, width: '8px', height: `max(100%, ${rows.length * TRACK_HEIGHT}px)` }}
            onMouseDown={(e) => handleClipMarkerDrag('start', e)}
          >
            <div className="absolute top-0 left-[3px] w-[2px] h-full" style={{ backgroundColor: '#a855f7' }} />
            <div className="absolute top-0 left-0 w-2 h-4 rounded-b-sm" style={{ backgroundColor: '#a855f7' }} />
          </div>

          <div
            className="absolute top-0 z-20 cursor-col-resize group"
            style={{ left: `${clipEndX - 4}px`, width: '8px', height: `max(100%, ${rows.length * TRACK_HEIGHT}px)` }}
            onMouseDown={(e) => handleClipMarkerDrag('end', e)}
          >
            <div className="absolute top-0 left-[3px] w-[2px] h-full" style={{ backgroundColor: '#a855f7' }} />
            <div className="absolute top-0 left-0 w-2 h-4 rounded-b-sm" style={{ backgroundColor: '#a855f7' }} />
          </div>

          {playheadX >= 0 && (
            <div
              className="absolute top-0 w-px bg-red-500 z-10 pointer-events-none"
              style={{ left: `${playheadX}px`, height: `max(100%, ${rows.length * TRACK_HEIGHT}px)` }}
            >
              <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 bg-red-500 rotate-45" />
            </div>
          )}

          {rows.map((row) => {
            if (row.type === 'target-header') {
              const { group, collapsed } = row;
              const allKfs: { kf: Keyframe; trackId: string }[] = [];
              if (collapsed) {
                for (const t of group.allTracks) {
                  for (const kf of t.keyframes) {
                    allKfs.push({ kf, trackId: t.id });
                  }
                }
              }
              return (
                <div key={`hdr-${group.targetId}`} className="relative border-b border-[var(--color-border)] bg-white/[0.01]" style={{ height: TRACK_HEIGHT }}>
                  {collapsed &&
                    allKfs.map(({ kf, trackId }) => {
                      const x = timeToPixel(kf.time, zoom) - scrollX;
                      return (
                        <KeyframeDiamond
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

            const { vt } = row;
            const isSelected = vt.tracks.some((t) => t.id === selectedTrackId);
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
                className={`relative border-b border-[var(--color-border)] ${isSelected ? 'bg-indigo-500/5' : 'hover:bg-white/[0.02]'}`}
                style={{ height: TRACK_HEIGHT }}
                onDoubleClick={(e) => handleKeyframeAreaClick(e, vt.tracks[0].id)}
              >
                {allKfs.map(({ kf, trackId }) => {
                  const x = timeToPixel(kf.time, zoom) - scrollX;
                  return (
                    <KeyframeDiamond
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

          <div
            className="absolute top-0 bottom-0 w-px bg-[var(--color-border)] opacity-50 pointer-events-none"
            style={{ left: `${totalWidth - scrollX}px` }}
          />
        </div>
      </div>

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
        <span>
          Clip: {(clipStart / 1000).toFixed(1)}s – {(clipEnd / 1000).toFixed(1)}s ({((clipEnd - clipStart) / 1000).toFixed(1)}s)
        </span>
        {dragState && <span className="text-yellow-400">Dragging...</span>}
      </div>
    </div>
  );
}
