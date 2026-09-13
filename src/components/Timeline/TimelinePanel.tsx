import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { ActionIcon, Slider, Tooltip } from '@mantine/core';
import {
  IconKeyframeFilled,
  IconX,
  IconVolume,
  IconVolumeOff,
  IconChevronRight,
  IconChevronDown,
} from '@tabler/icons-react';
import type { AnimationTrack, Keyframe } from '../../types/animation';
import { KeyframeDiamond } from './KeyframeDiamond';
import { PlaybackControls } from '../Toolbar/PlaybackControls';
import { TimeRuler } from './TimeRuler';
import {
  clampTimelineScroll,
  getPlayheadZoomAnchorX,
  getScrollToKeepTimeVisible,
  getTimelineViewportAtTime,
  timeToPixel,
} from './timelineMath';
import {
  buildTargetGroups,
  buildTrackSegments,
  HEADER_HEIGHT,
  MAX_ZOOM,
  MIN_ZOOM,
  TRACK_HEIGHT,
  TRACK_LIST_WIDTH,
  type TargetGroup,
  type TrackSegment,
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
  targetParents: Map<string, string | undefined>;
  zoom: number;
  scrollX: number;
  onViewportChange: (zoom: number, scrollX: number) => void;
  onScrollXChange: (scrollX: number) => void;
  onViewportWidthChange: (width: number) => void;
  /** When provided, renders a collapse button in the header that hides the timeline. */
  onCollapse?: () => void;
}

type RowData =
  | {
      type: 'target-header';
      group: TargetGroup;
      collapsed: boolean;
      segments: TrackSegment[];
      allTracks: AnimationTrack[];
      indent: number;
    }
  | {
      type: 'property';
      vt: VisualTrack;
      group: TargetGroup;
      segments: TrackSegment[];
      indent: number;
    };

function collectGroupTracks(group: TargetGroup): AnimationTrack[] {
  const childTracks = group.children.flatMap(collectGroupTracks);
  return [...group.allTracks, ...childTracks];
}

function flattenRows(
  groups: TargetGroup[],
  expandedTargets: Set<string>,
  indent: number,
): RowData[] {
  const result: RowData[] = [];
  for (const group of groups) {
    const collapsed = !expandedTargets.has(group.targetId);
    const allTracks = collectGroupTracks(group);
    const segments = collapsed ? buildTrackSegments(allTracks) : [];
    result.push({ type: 'target-header', group, collapsed, segments, allTracks, indent });
    if (!collapsed) {
      for (const vt of group.propertyTracks) {
        result.push({
          type: 'property',
          vt,
          group,
          segments: buildTrackSegments(vt.tracks),
          indent: indent + 1,
        });
      }
      if (group.children.length > 0) {
        result.push(...flattenRows(group.children, expandedTargets, indent + 1));
      }
    }
  }
  return result;
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
  targetParents,
  zoom,
  scrollX,
  onViewportChange,
  onScrollXChange,
  onViewportWidthChange,
  onCollapse,
}: TimelinePanelProps) {
  void _onDeleteKeyframe;

  const [expandedTargets, setExpandedTargets] = useState<Set<string>>(new Set());

  const keyframeAreaRef = useRef<HTMLDivElement>(null);
  const trackListRef = useRef<HTMLDivElement>(null);
  const keyframeScrollRef = useRef<HTMLDivElement>(null);

  const previousCurrentTimeRef = useRef(currentTime);
  const playheadX = timeToPixel(currentTime, zoom);
  const totalWidth = timeToPixel(duration, zoom);
  const selectedKfSet = useMemo(() => new Set(selectedKeyframeIds), [selectedKeyframeIds]);
  const targetGroups = useMemo(
    () => buildTargetGroups(tracks, targetLabels, targetOrder, targetParents),
    [tracks, targetLabels, targetOrder, targetParents],
  );

  // Build set of selected target IDs + children of selected groups for timeline highlighting
  const selectedTargetSet = useMemo(() => {
    const set = new Set(selectedElementIds);
    function addChildren(groups: TargetGroup[]) {
      for (const g of groups) {
        if (set.has(g.targetId)) {
          for (const child of g.children) {
            set.add(child.targetId);
            addChildren([child]);
          }
        } else {
          addChildren(g.children);
        }
      }
    }
    addChildren(targetGroups);
    return set;
  }, [selectedElementIds, targetGroups]);

  const toggleCollapse = (targetId: string) => {
    setExpandedTargets((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  };

  const rows: RowData[] = useMemo(() => {
    return flattenRows(targetGroups, expandedTargets, 0);
  }, [targetGroups, expandedTargets]);

  const interactionRows: TimelineRowData[] = rows.map((row) =>
    row.type === 'target-header'
      ? {
          type: 'target-header',
          group: { targetId: row.group.targetId, allTracks: row.allTracks },
          collapsed: row.collapsed,
        }
      : { type: 'property', trackIds: row.vt.tracks.map((track) => track.id) },
  );

  const {
    syncScroll,
    rulerWidth,
    handleKeyframeAreaClick,
    handleScrubberMouseDown,
    handleKeyframeDragStart,
    handleClipMarkerDrag,
    handleMarqueeStart,
    dragState,
    marqueeState,
  } = useTimelineInteractions({
    keyframeAreaRef,
    trackListRef,
    keyframeScrollRef,
    rows: interactionRows,
    tracks,
    duration,
    zoom,
    scrollX,
    onViewportChange,
    onScrollXChange,
    onViewportWidthChange,
    clipStart,
    clipEnd,
    selectedElementIds,
    onSelectKeyframes,
    selectedKeyframeIds,
    onAddKeyframe,
    onMoveKeyframe,
    onScrub,
    onClipRangeChange,
  });

  const contentWidth = Math.max(totalWidth, rulerWidth);
  const contentHeight = Math.max(rows.length * TRACK_HEIGHT, TRACK_HEIGHT);
  const clipStartX = timeToPixel(clipStart, zoom);
  const clipEndX = timeToPixel(clipEnd, zoom);

  useEffect(() => {
    const clampedScrollX = clampTimelineScroll(scrollX, duration, zoom, rulerWidth);
    if (Math.abs(clampedScrollX - scrollX) > 0.5) {
      onViewportChange(zoom, clampedScrollX);
    }
  }, [duration, onViewportChange, rulerWidth, scrollX, zoom]);

  useEffect(() => {
    if (previousCurrentTimeRef.current === currentTime) return;
    previousCurrentTimeRef.current = currentTime;
    const nextScrollX = getScrollToKeepTimeVisible({
      time: currentTime,
      duration,
      zoom,
      scrollX,
      viewportWidth: rulerWidth,
    });
    if (Math.abs(nextScrollX - scrollX) > 0.5) {
      onViewportChange(zoom, nextScrollX);
    }
  }, [currentTime, duration, onViewportChange, rulerWidth, scrollX, zoom]);

  const handleZoomChange = useCallback(
    (nextZoom: number) => {
      const anchorX = getPlayheadZoomAnchorX(currentTime, zoom, scrollX, rulerWidth);
      const viewport = getTimelineViewportAtTime({
        duration,
        newZoom: nextZoom,
        viewportWidth: rulerWidth,
        anchorTime: currentTime,
        anchorX,
      });
      onViewportChange(viewport.zoom, viewport.scrollX);
    },
    [currentTime, duration, onViewportChange, rulerWidth, scrollX, zoom],
  );

  return (
    <div className="flex flex-col h-full select-none">
      <div className="flex" style={{ height: HEADER_HEIGHT }}>
        <div
          className="shrink-0 flex items-center px-2 text-[10px] font-semibold text-text-muted uppercase tracking-wider border-b border-r border-border bg-surface-alt"
          style={{ width: TRACK_LIST_WIDTH }}
        >
          <PlaybackControls />
        </div>
        <div
          className="flex-1 overflow-hidden"
          ref={keyframeAreaRef}
          onMouseDown={handleScrubberMouseDown}
          aria-label="Timeline scrubber"
        >
          <TimeRuler duration={duration} zoom={zoom} scrollX={scrollX} width={rulerWidth} />
        </div>
        {onCollapse && (
          <div className="shrink-0 flex items-center px-1 border-b border-l border-border bg-surface-alt">
            <Tooltip label="Collapse timeline" position="left">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="xs"
                onClick={onCollapse}
                aria-label="Collapse timeline"
              >
                <IconChevronDown size={14} />
              </ActionIcon>
            </Tooltip>
          </div>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          ref={trackListRef}
          className="shrink-0 overflow-y-auto border-r border-border"
          style={{ width: TRACK_LIST_WIDTH }}
          onScroll={() => syncScroll('left')}
        >
          {rows.map((row) => {
            if (row.type === 'target-header') {
              const { group, collapsed, indent, allTracks } = row;
              const isAnySelected = allTracks.some((t) => t.id === selectedTrackId);
              const isTargetSelected = selectedTargetSet.has(group.targetId);
              return (
                <div
                  key={`hdr-${group.targetId}`}
                  className={`flex items-center h-7 pr-1 gap-1 cursor-pointer border-b border-border text-xs select-none
                    ${isAnySelected || isTargetSelected ? 'bg-accent-muted text-accent' : 'hover:bg-surface text-text'}
                    ${allTracks.some((t) => !t.enabled) ? 'opacity-40' : ''}`}
                  style={{ paddingLeft: `${4 + indent * 16}px` }}
                  onClick={() => toggleCollapse(group.targetId)}
                >
                  <span className="shrink-0 text-[10px] w-3 text-center text-text-muted">
                    {collapsed ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />}
                  </span>
                  <span className="truncate flex-1 font-medium">{group.label}</span>
                  <ActionIcon
                    variant="subtle"
                    color="indigo"
                    size="xs"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      allTracks.forEach((t) => onAddKeyframe(t.id, Math.round(currentTime), 0));
                    }}
                    title="Add keyframe for all properties"
                  >
                    <IconKeyframeFilled size={14} />
                  </ActionIcon>
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    size="xs"
                    onClick={(e: MouseEvent) => {
                      e.stopPropagation();
                      allTracks.forEach((t) => onRemoveTrack(t.id));
                    }}
                    title="Remove all tracks"
                  >
                    <IconX size={14} />
                  </ActionIcon>
                </div>
              );
            }
            const { vt, indent } = row;
            const isSelected = vt.tracks.some((t) => t.id === selectedTrackId);
            const isTargetSelected = selectedTargetSet.has(vt.targetId);
            return (
              <div
                key={vt.id}
                className={`flex items-center h-7 pr-2 gap-1 cursor-pointer border-b border-border text-xs select-none
                  ${isSelected || isTargetSelected ? 'bg-accent-muted text-accent' : 'hover:bg-surface text-text-muted'}
                  ${vt.tracks.some((t) => !t.enabled) ? 'opacity-40' : ''}`}
                style={{ paddingLeft: `${20 + indent * 16}px` }}
                onClick={() => onSelectTrack(vt.tracks[0].id)}
              >
                <span className="shrink-0">{vt.icon}</span>
                <span className="truncate flex-1">{vt.label}</span>
                <ActionIcon
                  variant="subtle"
                  color="indigo"
                  size="xs"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    vt.tracks.forEach((t) => onAddKeyframe(t.id, Math.round(currentTime), 0));
                  }}
                  title="Add keyframe"
                >
                  <IconKeyframeFilled size={14} />
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="yellow"
                  size="xs"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    vt.tracks.forEach((t) => onToggleTrackEnabled(t.id));
                  }}
                  title="Mute"
                >
                  {vt.tracks[0].enabled ? <IconVolume size={14} /> : <IconVolumeOff size={14} />}
                </ActionIcon>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="xs"
                  onClick={(e: MouseEvent) => {
                    e.stopPropagation();
                    vt.tracks.forEach((t) => onRemoveTrack(t.id));
                  }}
                  title="Remove"
                >
                  <IconX size={14} />
                </ActionIcon>
              </div>
            );
          })}
          {targetGroups.length === 0 && (
            <div className="p-3 text-xs text-text-muted text-center">
              <p className="mb-2">No animation tracks yet.</p>
              <p className="text-[10px] opacity-70">
                Select an element and change a property value to start animating.
              </p>
            </div>
          )}
        </div>

        <div
          ref={keyframeScrollRef}
          className="flex-1 overflow-auto relative"
          role="grid"
          aria-label="Keyframe timeline"
          onScroll={() => syncScroll('right')}
          onMouseDown={handleMarqueeStart}
        >
          <div
            className="relative"
            style={{ width: `${contentWidth}px`, minHeight: `${contentHeight}px` }}
          >
            {clipStartX > 0 && (
              <div
                className="absolute top-0 pointer-events-none"
                style={{
                  left: 0,
                  width: `${Math.min(clipStartX, contentWidth)}px`,
                  height: '100%',
                  backgroundColor: 'var(--color-overlay)',
                  zIndex: 5,
                }}
              />
            )}
            <div
              className="absolute top-0 pointer-events-none"
              style={{
                left: `${clipEndX}px`,
                width: `${Math.max(0, contentWidth - clipEndX)}px`,
                height: '100%',
                backgroundColor: 'var(--color-overlay)',
                zIndex: 5,
              }}
            />

            <div
              className="absolute top-0 z-20 cursor-col-resize group"
              style={{ left: `${Math.max(0, clipStartX - 4)}px`, width: '8px', height: '100%' }}
              onMouseDown={(e) => handleClipMarkerDrag('start', e)}
            >
              <div
                className="absolute top-0 left-[3px] w-[2px] h-full"
                style={{ backgroundColor: 'var(--color-clip-marker)' }}
              />
              <div
                className="absolute top-0 left-0 w-2 h-4 rounded-b-sm"
                style={{ backgroundColor: 'var(--color-clip-marker)' }}
              />
            </div>

            <div
              className="absolute top-0 z-20 cursor-col-resize group"
              style={{ left: `${clipEndX - 4}px`, width: '8px', height: '100%' }}
              onMouseDown={(e) => handleClipMarkerDrag('end', e)}
            >
              <div
                className="absolute top-0 left-[3px] w-[2px] h-full"
                style={{ backgroundColor: 'var(--color-clip-marker)' }}
              />
              <div
                className="absolute top-0 left-0 w-2 h-4 rounded-b-sm"
                style={{ backgroundColor: 'var(--color-clip-marker)' }}
              />
            </div>

            {playheadX >= 0 && (
              <div
                className="absolute top-0 w-px bg-playhead z-10 pointer-events-none"
                style={{ left: `${playheadX}px`, height: '100%' }}
              >
                <div className="absolute -top-0.5 -translate-x-1/2 w-2 h-2 bg-playhead rotate-45" />
              </div>
            )}

            {marqueeState && (
              <div
                className="absolute pointer-events-none border border-indigo-400 bg-indigo-400/10 z-30"
                style={{
                  left: Math.min(marqueeState.startX, marqueeState.currentX),
                  top: Math.min(marqueeState.startY, marqueeState.currentY),
                  width: Math.abs(marqueeState.currentX - marqueeState.startX),
                  height: Math.abs(marqueeState.currentY - marqueeState.startY),
                }}
              />
            )}

            {rows.map((row) => {
              if (row.type === 'target-header') {
                const { group, collapsed, allTracks } = row;
                const allKfs: { kf: Keyframe; trackId: string }[] = [];
                if (collapsed) {
                  for (const t of allTracks) {
                    for (const kf of t.keyframes) {
                      allKfs.push({ kf, trackId: t.id });
                    }
                  }
                }
                const isHeaderSelected = selectedTargetSet.has(group.targetId);
                return (
                  <div
                    key={`hdr-${group.targetId}`}
                    className={`relative border-b border-border ${isHeaderSelected ? 'bg-accent/5' : 'bg-surface/[0.01]'}`}
                    style={{ height: TRACK_HEIGHT, width: contentWidth }}
                  >
                    {/* Pre-computed interpolation segments */}
                    {collapsed &&
                      row.segments.map((seg, i) => {
                        const x1 = timeToPixel(seg.t1, zoom);
                        const w = timeToPixel(seg.t2, zoom) - x1;
                        return w > 0 ? (
                          <div
                            key={`seg-${i}`}
                            className={`absolute pointer-events-none rounded-sm ${seg.changing ? 'bg-indigo-500/50 h-[2px] -mt-px' : 'bg-border/20 h-px'}`}
                            style={{ left: x1, width: w, top: '50%' }}
                          />
                        ) : null;
                      })}
                    {collapsed &&
                      allKfs.map(({ kf, trackId }) => {
                        const x = timeToPixel(kf.time, zoom);
                        return (
                          <KeyframeDiamond
                            key={kf.id}
                            keyframe={kf}
                            x={x}
                            isSelected={selectedKfSet.has(kf.id)}
                            onSelect={(id, addToSelection) => {
                              if (addToSelection) onSelectKeyframes([...selectedKeyframeIds, id]);
                              else onSelectKeyframes([id]);
                            }}
                            onDragStart={(id, startX) =>
                              handleKeyframeDragStart(id, startX, trackId, kf.time)
                            }
                          />
                        );
                      })}
                  </div>
                );
              }

              const { vt } = row;
              const isSelected = vt.tracks.some((t) => t.id === selectedTrackId);
              const isTargetSelected = selectedTargetSet.has(vt.targetId);
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
                  className={`relative border-b border-border ${isSelected || isTargetSelected ? 'bg-accent/5' : 'hover:bg-surface/[0.02]'}`}
                  style={{ height: TRACK_HEIGHT, width: contentWidth }}
                  onDoubleClick={(e) => handleKeyframeAreaClick(e, vt.tracks[0].id)}
                >
                  {/* Pre-computed interpolation segments */}
                  {row.segments.map((seg, i) => {
                    const x1 = timeToPixel(seg.t1, zoom);
                    const w = timeToPixel(seg.t2, zoom) - x1;
                    return w > 0 ? (
                      <div
                        key={`seg-${i}`}
                        className={`absolute pointer-events-none rounded-sm ${seg.changing ? 'bg-indigo-500/60 h-[2px] -mt-px' : 'bg-border/30 h-px'}`}
                        style={{ left: x1, width: w, top: '50%' }}
                      />
                    ) : null;
                  })}
                  {allKfs.map(({ kf, trackId }) => {
                    const x = timeToPixel(kf.time, zoom);
                    return (
                      <KeyframeDiamond
                        key={kf.id}
                        keyframe={kf}
                        x={x}
                        isSelected={selectedKfSet.has(kf.id)}
                        onSelect={(id, addToSelection) => {
                          if (addToSelection) onSelectKeyframes([...selectedKeyframeIds, id]);
                          else onSelectKeyframes([id]);
                        }}
                        onDragStart={(id, startX) =>
                          handleKeyframeDragStart(id, startX, trackId, kf.time)
                        }
                      />
                    );
                  })}
                </div>
              );
            })}

            <div
              className="absolute top-0 bottom-0 w-px bg-border opacity-50 pointer-events-none"
              style={{ left: `${totalWidth}px` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center h-6 px-2 gap-2 border-t border-border bg-surface-alt text-[10px] text-text-muted">
        <span>Zoom:</span>
        <Slider
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={handleZoomChange}
          aria-label="Timeline zoom"
          size="xs"
          w={80}
        />
        <span>{Math.round(zoom * 1000)}%</span>
        <div className="flex-1" />
        <span>
          Clip: {(clipStart / 1000).toFixed(1)}s – {(clipEnd / 1000).toFixed(1)}s (
          {((clipEnd - clipStart) / 1000).toFixed(1)}s)
        </span>
        {dragState && <span className="text-warning">Dragging...</span>}
      </div>
    </div>
  );
}
