import {
  CAMERA_FRAME_TARGET_ID,
  getFrameHeight,
} from '../../stores/projectStore';
import type { FrameState } from '../../types/animation';

export function getCameraRect(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  cameraFrame: { x: number; y: number; width: number; aspectRatio: any },
  frameState: FrameState,
) {
  const cam = frameState.get(CAMERA_FRAME_TARGET_ID);
  return {
    x: cameraFrame.x + (cam?.translateX ?? 0),
    y: cameraFrame.y + (cam?.translateY ?? 0),
    width: cameraFrame.width * (cam?.scaleX ?? 1),
    height: getFrameHeight(cameraFrame) * (cam?.scaleY ?? 1),
  };
}
