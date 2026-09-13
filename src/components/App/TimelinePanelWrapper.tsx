import { useCallback, useMemo } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUIStore } from '../../stores/uiStore';
import { TimelinePanel, type TimelinePanelProps } from '../Timeline/TimelinePanel';

type TimelinePanelWrapperProps = Omit<
  TimelinePanelProps,
  | 'currentTime'
  | 'selectedKeyframeIds'
  | 'zoom'
  | 'scrollX'
  | 'onViewportChange'
  | 'onScrollXChange'
  | 'onViewportWidthChange'
> & {
  selectedElementIds: string[];
  rawSelectedKeyframeIds: string[];
};

export function TimelinePanelWrapper(props: TimelinePanelWrapperProps) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const zoom = useUIStore((s) => s.timelineViewport.zoom);
  const scrollX = useUIStore((s) => s.timelineViewport.scrollX);
  const { selectedElementIds, rawSelectedKeyframeIds, tracks, ...rest } = props;
  const handleViewportChange = useCallback((nextZoom: number, nextScrollX: number) => {
    useUIStore.getState().setTimelineViewport(nextZoom, nextScrollX);
  }, []);
  const handleScrollXChange = useCallback((nextScrollX: number) => {
    const { scrollY } = useUIStore.getState().timelineViewport;
    useUIStore.getState().setTimelineScroll(nextScrollX, scrollY);
  }, []);
  const handleViewportWidthChange = useCallback((width: number) => {
    useUIStore.getState().setTimelineViewportWidth(width);
  }, []);

  const highlightedKeyframeIds = useMemo(() => {
    const ids = new Set<string>();
    const selectedIdSet = new Set(selectedElementIds);
    const selectedKfSet = new Set(rawSelectedKeyframeIds);
    for (const track of tracks) {
      if (!selectedIdSet.has(track.targetId)) continue;
      for (const kf of track.keyframes) {
        if (selectedKfSet.has(kf.id)) ids.add(kf.id);
        if (Math.abs(kf.time - currentTime) < 1) ids.add(kf.id);
      }
    }
    for (const id of rawSelectedKeyframeIds) ids.add(id);
    return [...ids];
  }, [tracks, currentTime, selectedElementIds, rawSelectedKeyframeIds]);

  return (
    <TimelinePanel
      {...rest}
      tracks={tracks}
      currentTime={currentTime}
      selectedKeyframeIds={highlightedKeyframeIds}
      selectedElementIds={selectedElementIds}
      zoom={zoom}
      scrollX={scrollX}
      onViewportChange={handleViewportChange}
      onScrollXChange={handleScrollXChange}
      onViewportWidthChange={handleViewportWidthChange}
    />
  );
}
