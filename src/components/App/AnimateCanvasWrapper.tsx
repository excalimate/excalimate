import type { CameraFrame } from '../../stores/projectStore';
import { usePlaybackStore } from '../../stores/playbackStore';
import type { AnimatableTarget, ExcalidrawSceneData } from '../../types/excalidraw';
import { ExcalidrawAnimateEditor } from '../Canvas/ExcalidrawAnimateEditor';

export function AnimateCanvasWrapper(props: {
  scene: ExcalidrawSceneData | null;
  targets: AnimatableTarget[];
  selectedElementIds: string[];
  cameraFrame: CameraFrame;
  onSelectElements: (ids: string[]) => void;
  onDragElement: (targetId: string, deltaX: number, deltaY: number) => void;
  onResizeElement: (targetId: string, dScaleX: number, dScaleY: number) => void;
}) {
  const frameState = usePlaybackStore((s) => s.frameState);
  return <ExcalidrawAnimateEditor {...props} frameState={frameState} />;
}
