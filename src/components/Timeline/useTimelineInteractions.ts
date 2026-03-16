import { useCallback, useEffect, useRef, useState, type Dispatch, type MouseEvent, type RefObject, type SetStateAction } from 'react';
import type { AnimationTrack } from '../../types/animation';
import { MAX_ZOOM, MIN_ZOOM, TRACK_HEIGHT } from './timelineModel';
import { pixelToTime, timeToPixel } from './timelineMath';

export type TimelineRowData =
  | { type: 'target-header'; group: { targetId: string; allTracks: AnimationTrack[] }; collapsed: boolean }
  | { type: 'property'; trackIds: string[] };

export interface UseTimelineInteractionsParams {
  keyframeAreaRef: RefObject<HTMLDivElement | null>;
  trackListRef: RefObject<HTMLDivElement | null>;
  keyframeScrollRef: RefObject<HTMLDivElement | null>;
  rows: TimelineRowData[];
  tracks: AnimationTrack[];
  duration: number;
  currentTime: number;
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  scrollX: number;
  setScrollX: Dispatch<SetStateAction<number>>;
  clipStart: number;
  clipEnd: number;
  selectedElementIds: string[];
  onSelectKeyframes: (ids: string[]) => void;
  selectedKeyframeIds: string[];
  onAddKeyframe: (trackId: string, time: number, value: number) => void;
  onMoveKeyframe: (trackId: string, keyframeId: string, newTime: number) => void;
  onScrub: (time: number) => void;
  onClipRangeChange: (start: number, end: number) => void;
}

export function useTimelineInteractions({
  keyframeAreaRef,
  trackListRef,
  keyframeScrollRef,
  rows,
  tracks,
  duration,
  currentTime: _currentTime,
  zoom,
  setZoom,
  scrollX,
  setScrollX,
  clipStart,
  clipEnd,
  selectedElementIds,
  onSelectKeyframes,
  selectedKeyframeIds,
  onAddKeyframe,
  onMoveKeyframe,
  onScrub,
  onClipRangeChange,
}: UseTimelineInteractionsParams) {
  void _currentTime;
  const isSyncingScroll = useRef(false);
  const [rulerWidth, setRulerWidth] = useState(800);
  const [dragState, setDragState] = useState<{
    keyframeId: string;
    trackId: string;
    startClientX: number;
    startTime: number;
  } | null>(null);
  const [marqueeState, setMarqueeState] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    additive: boolean;
  } | null>(null);

  const syncScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const left = trackListRef.current;
    const right = keyframeScrollRef.current;
    if (left && right) {
      if (source === 'left') right.scrollTop = left.scrollTop;
      else left.scrollTop = right.scrollTop;
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, [trackListRef, keyframeScrollRef]);

  useEffect(() => {
    const el = keyframeAreaRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setRulerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [keyframeAreaRef]);

  useEffect(() => {
    const el = keyframeScrollRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z * factor)));
      } else if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setScrollX((s) => Math.max(0, s + e.deltaX + (e.shiftKey ? e.deltaY : 0)));
      } else {
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
  }, [keyframeScrollRef, trackListRef, setScrollX, setZoom]);

  const handleKeyframeAreaClick = useCallback(
    (e: MouseEvent, trackId: string) => {
      if (!keyframeAreaRef.current) return;
      const rect = keyframeAreaRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left + scrollX;
      const time = Math.round(pixelToTime(x, zoom));
      onAddKeyframe(trackId, time, 0);
    },
    [keyframeAreaRef, onAddKeyframe, scrollX, zoom],
  );

  const handleScrubberMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!keyframeAreaRef.current) return;
      const rect = keyframeAreaRef.current.getBoundingClientRect();

      const allKeyframeTimes = new Set<number>();
      allKeyframeTimes.add(0);
      allKeyframeTimes.add(duration);
      for (const track of tracks) {
        for (const kf of track.keyframes) {
          allKeyframeTimes.add(kf.time);
        }
      }
      const snapTimes = Array.from(allKeyframeTimes).sort((a, b) => a - b);
      const SNAP_PX = 8;

      const updateTime = (clientX: number) => {
        const x = clientX - rect.left + scrollX;
        let time = Math.max(0, pixelToTime(x, zoom));

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
    [duration, keyframeAreaRef, onScrub, scrollX, tracks, zoom],
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
    [onMoveKeyframe, zoom],
  );

  const handleMarqueeStart = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      const container = keyframeScrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const startX = e.clientX - rect.left;
      const startY = e.clientY - rect.top + container.scrollTop;
      const additive = e.shiftKey;

      let currentX = startX;
      let currentY = startY;

      setMarqueeState({ startX, startY, currentX, currentY, additive });

      const handleMouseMove = (me: globalThis.MouseEvent) => {
        currentX = me.clientX - rect.left;
        currentY = me.clientY - rect.top + container.scrollTop;
        setMarqueeState((prev) => (prev ? { ...prev, currentX, currentY } : prev));
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setMarqueeState(null);

        if (Math.abs(currentX - startX) < 3 && Math.abs(currentY - startY) < 3) return;

        const minX = Math.min(startX, currentX);
        const maxX = Math.max(startX, currentX);
        const minY = Math.min(startY, currentY);
        const maxY = Math.max(startY, currentY);
        const trackById = new Map(tracks.map((track) => [track.id, track]));
        const selected = new Set<string>();

        rows.forEach((row, rowIndex) => {
          const rowTop = rowIndex * TRACK_HEIGHT;
          const rowBottom = rowTop + TRACK_HEIGHT;
          const overlapsY = rowBottom >= minY && rowTop <= maxY;
          if (!overlapsY) return;

          const rowTracks =
            row.type === 'target-header'
              ? (row.collapsed ? row.group.allTracks : [])
              : row.trackIds.map((trackId) => trackById.get(trackId)).filter((track): track is AnimationTrack => Boolean(track));

          rowTracks.forEach((track) => {
            track.keyframes.forEach((keyframe) => {
              const keyframeX = timeToPixel(keyframe.time, zoom) - scrollX;
              if (keyframeX >= minX && keyframeX <= maxX) {
                selected.add(keyframe.id);
              }
            });
          });
        });

        if (additive) {
          onSelectKeyframes(Array.from(new Set([...selectedKeyframeIds, ...selected])));
          return;
        }
        onSelectKeyframes(Array.from(selected));
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
    },
    [keyframeScrollRef, onSelectKeyframes, rows, scrollX, selectedKeyframeIds, tracks, zoom],
  );

  useEffect(() => {
    if (selectedElementIds.length === 0) return;
    const selectedId = selectedElementIds[0];
    const rowIndex = rows.findIndex(
      (r) =>
        (r.type === 'target-header' && r.group.targetId === selectedId) ||
        (r.type === 'target-header' && r.group.allTracks.some((t) => t.targetId === selectedId)),
    );
    if (rowIndex >= 0) {
      const scrollTop = rowIndex * TRACK_HEIGHT;
      trackListRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' });
      keyframeScrollRef.current?.scrollTo({ top: scrollTop, behavior: 'smooth' });
    }
  }, [keyframeScrollRef, rows, selectedElementIds, trackListRef]);

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
    [clipEnd, clipStart, onClipRangeChange, zoom],
  );

  return {
    syncScroll,
    rulerWidth,
    handleKeyframeAreaClick,
    handleScrubberMouseDown,
    handleKeyframeDragStart,
    handleClipMarkerDrag,
    handleMarqueeStart,
    dragState,
    marqueeState,
  };
}
