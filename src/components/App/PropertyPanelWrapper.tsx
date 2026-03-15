import { usePlaybackStore } from '../../stores/playbackStore';
import { PropertyPanel, type PropertyPanelProps } from '../PropertyPanel/PropertyPanel';

type PropertyPanelWrapperProps = Omit<PropertyPanelProps, 'currentTime'>;

export function PropertyPanelWrapper(props: PropertyPanelWrapperProps) {
  const currentTime = usePlaybackStore((s) => s.currentTime);
  return <PropertyPanel {...props} currentTime={currentTime} />;
}
