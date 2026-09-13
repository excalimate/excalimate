import { useMemo } from 'react';
import { usePlaybackStore } from '../../stores/playbackStore';
import { TimelinePanel, type TimelinePanelProps } from '../Timeline/TimelinePanel';
import { getCurrentTimeKeyframeIds } from '../../core/models/KeyframeInteraction';

type TimelinePanelWrapperProps = Omit<
  TimelinePanelProps,
  'currentTime' | 'selectedKeyframeIds' | 'highlightedKeyframeIds'
> & {
  selectedElementIds: string[];
  rawSelectedKeyframeIds: string[];
};

export function TimelinePanelWrapper(props: TimelinePanelWrapperProps) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  const { selectedElementIds, rawSelectedKeyframeIds, tracks, ...rest } = props;

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
    />
  );
}
