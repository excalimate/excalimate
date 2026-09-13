import { useCallback, useMemo } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { useUIStore } from '../../stores/uiStore';
import { TimelinePanel, type TimelinePanelProps } from '../Timeline/TimelinePanel';
import { getCurrentTimeKeyframeIds } from '../../core/models/KeyframeInteraction';

type TimelinePanelWrapperProps = Omit<
  TimelinePanelProps,
  | 'currentTime'
  | 'selectedKeyframeIds'
  | 'highlightedKeyframeIds'
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

  const highlightedKeyframeIds = useMemo(
    () => getCurrentTimeKeyframeIds(tracks, selectedElementIds, currentTime),
    [tracks, currentTime, selectedElementIds],
  );

  return (
    <TimelinePanel
      {...rest}
      tracks={tracks}
      currentTime={currentTime}
      selectedKeyframeIds={rawSelectedKeyframeIds}
      highlightedKeyframeIds={highlightedKeyframeIds}
      selectedElementIds={selectedElementIds}
      zoom={zoom}
      scrollX={scrollX}
      onViewportChange={handleViewportChange}
      onScrollXChange={handleScrollXChange}
      onViewportWidthChange={handleViewportWidthChange}
    />
  );
}
