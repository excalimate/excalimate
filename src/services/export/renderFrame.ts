import type { NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { applyAnimationToElements } from '../../core/engine/renderUtils';
import { useProjectStore } from '../../stores/projectStore';
import type { FrameState } from '../../types/animation';
import type { AnimatableTarget } from '../../types/excalidraw';
import { getCameraRect } from './cameraMath';

export async function renderFrame(
  elements: NonDeletedExcalidrawElement[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  files: Record<string, any>,
  frameState: FrameState,
  targets: AnimatableTarget[],
  outW: number,
  outH: number,
  outputCanvas: HTMLCanvasElement,
): Promise<void> {
  try {
    const animated = applyAnimationToElements(elements, frameState, targets);

    const cfg = useProjectStore.getState().cameraFrame;

    const { exportToSvg } = await import('@excalidraw/excalidraw');
    const svg = await exportToSvg({
      elements: animated,
      files: files ?? {},
      appState: { exportBackground: true },
      exportPadding: 0,
    });

    const vb = svg.viewBox?.baseVal;
    let sMinX = Infinity;
    let sMinY = Infinity;
    let sMaxX = -Infinity;
    let sMaxY = -Infinity;
    for (const el of animated) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = el as any;
      if (a.points?.length > 0) {
        for (const [px, py] of a.points as number[][]) {
          const ax = el.x + px;
          const ay = el.y + py;
          if (ax < sMinX) sMinX = ax;
          if (ay < sMinY) sMinY = ay;
          if (ax > sMaxX) sMaxX = ax;
          if (ay > sMaxY) sMaxY = ay;
        }
      } else {
        const x1 = Math.min(el.x, el.x + el.width);
        const y1 = Math.min(el.y, el.y + el.height);
        const x2 = Math.max(el.x, el.x + el.width);
        const y2 = Math.max(el.y, el.y + el.height);
        if (x1 < sMinX) sMinX = x1;
        if (y1 < sMinY) sMinY = y1;
        if (x2 > sMaxX) sMaxX = x2;
        if (y2 > sMaxY) sMaxY = y2;
      }
    }

    const sceneW = (sMaxX - sMinX) || 1;
    const sceneH = (sMaxY - sMinY) || 1;
    const vbW = vb?.width ?? sceneW;
    const vbH = vb?.height ?? sceneH;
    const svgScaleX = vbW / sceneW;
    const svgScaleY = vbH / sceneH;

    const cameraRect = getCameraRect(cfg, frameState);
    const camSvgX = (cameraRect.x - cameraRect.width / 2 - sMinX) * svgScaleX + (vb?.x ?? 0);
    const camSvgY = (cameraRect.y - cameraRect.height / 2 - sMinY) * svgScaleY + (vb?.y ?? 0);
    const camSvgW = cameraRect.width * svgScaleX;
    const camSvgH = cameraRect.height * svgScaleY;

    svg.setAttribute('viewBox', `${camSvgX} ${camSvgY} ${camSvgW} ${camSvgH}`);
    svg.setAttribute('width', String(outW));
    svg.setAttribute('height', String(outH));

    const svgStr = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const img = new Image(outW, outH);
    await new Promise<void>((resolve) => {
      img.onload = () => {
        const ctx = outputCanvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, outW, outH);
        URL.revokeObjectURL(url);
        resolve();
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve();
      };
      img.src = url;
    });
  } catch (err) {
    console.error('[renderFrame] CRASH:', err);
    const ctx = outputCanvas.getContext('2d')!;
    ctx.fillStyle = 'red';
    ctx.font = '20px monospace';
    ctx.fillText(String(err), 10, 30);
  }
}
