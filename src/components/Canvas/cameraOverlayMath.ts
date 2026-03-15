import type { FrameState } from '../../types/animation';
import type { CameraFrame } from '../../stores/projectStore';
import { CAMERA_FRAME_TARGET_ID, getFrameHeight } from '../../stores/projectStore';

export interface CameraOverlayPosition {
  frameLeft: number;
  frameTop: number;
  screenW: number;
  screenH: number;
}

export function computeCameraOverlayPosition(
  cameraFrame: CameraFrame,
  frameState: FrameState,
  camDragOffset: { dx: number; dy: number; dScale: number } | null,
  viewport: { scrollX: number; scrollY: number; zoom: number },
): CameraOverlayPosition {
  const camState = frameState.get(CAMERA_FRAME_TARGET_ID);
  const camTx = (camState?.translateX ?? 0) + (camDragOffset?.dx ?? 0);
  const camTy = (camState?.translateY ?? 0) + (camDragOffset?.dy ?? 0);
  const camSx = (camState?.scaleX ?? 1) + (camDragOffset?.dScale ?? 0);
  const camSy = (camState?.scaleY ?? 1) + (camDragOffset?.dScale ?? 0);

  const camW = cameraFrame.width * camSx;
  const camH = getFrameHeight(cameraFrame) * camSy;
  const camCX = cameraFrame.x + camTx;
  const camCY = cameraFrame.y + camTy;

  // Convert scene coords → screen coords using Excalidraw's viewport
  // Excalidraw formula: screenX = (sceneX + scrollX) * zoom
  const { scrollX, scrollY, zoom } = viewport;
  const screenCX = (camCX + scrollX) * zoom;
  const screenCY = (camCY + scrollY) * zoom;
  const screenW = camW * zoom;
  const screenH = camH * zoom;

  return {
    frameLeft: screenCX - screenW / 2,
    frameTop: screenCY - screenH / 2,
    screenW,
    screenH,
  };
}
