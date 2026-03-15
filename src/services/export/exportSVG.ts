import { getNonDeletedElements } from '@excalidraw/excalidraw';
import type { ExcalidrawElement, NonDeletedExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import { AnimationEngine } from '../../core/engine/AnimationEngine';
import { useAnimationStore } from '../../stores/animationStore';
import {
  CAMERA_FRAME_TARGET_ID,
  getExportResolution,
  useProjectStore,
} from '../../stores/projectStore';
import { getCameraRect } from './cameraMath';
import type { ExportOptions } from './types';

export async function exportAnimatedSVG(options: ExportOptions): Promise<void> {
  const { exportToSvg } = await import('@excalidraw/excalidraw');
  const { fps = 30, onProgress } = options;
  const timeline = useAnimationStore.getState().timeline;
  const project = useProjectStore.getState().project;
  const cameraFrame = useProjectStore.getState().cameraFrame;
  if (!project?.scene) throw new Error('No scene loaded');

  const elements = getNonDeletedElements(project.scene.elements as ExcalidrawElement[]) as NonDeletedExcalidrawElement[];
  const res = getExportResolution(cameraFrame.aspectRatio);
  const engine = new AnimationEngine();
  const { clipStart, clipEnd } = useAnimationStore.getState();
  const clipDuration = clipEnd - clipStart;
  const totalFrames = Math.ceil(clipDuration / 1000 * fps);

  const svg = await exportToSvg({
    elements,
    files: project.scene.files ?? {},
    appState: { exportBackground: true },
    exportPadding: 0,
  });

  let sceneMinX = Infinity;
  let sceneMinY = Infinity;
  for (const el of elements) {
    sceneMinX = Math.min(sceneMinX, el.x);
    sceneMinY = Math.min(sceneMinY, el.y);
  }
  const svgVB = svg.viewBox?.baseVal;
  const offX = (svgVB?.x ?? 0) - sceneMinX;
  const offY = (svgVB?.y ?? 0) - sceneMinY;

  const fs0 = engine.computeFrame(timeline, 0);
  const cam0 = getCameraRect(cameraFrame, fs0);
  svg.setAttribute('viewBox', `${(cam0.x - cam0.width / 2) + offX} ${(cam0.y - cam0.height / 2) + offY} ${cam0.width} ${cam0.height}`);
  svg.setAttribute('width', String(res.width));
  svg.setAttribute('height', String(res.height));

  const gEls = Array.from(svg.children).filter(
    (c): c is SVGGElement => c instanceof SVGElement && (c.tagName === 'g' || c.tagName === 'use'),
  );

  const animatedIds = new Set<string>();
  for (const track of timeline.tracks) {
    if (track.targetId !== CAMERA_FRAME_TARGET_ID) animatedIds.add(track.targetId);
  }

  gEls.forEach((g, i) => {
    if (i < elements.length) {
      const safeId = elements[i].id.replace(/[^a-zA-Z0-9_-]/g, '_');
      g.setAttribute('id', `el-${safeId}`);
    }
  });

  let css = '';
  let idx = 0;
  for (const elId of animatedIds) {
    const steps: string[] = [];
    for (let i = 0; i <= totalFrames; i++) {
      const time = clipStart + (i / totalFrames) * clipDuration;
      const fs = engine.computeFrame(timeline, time);
      const st = fs.get(elId);
      if (!st) continue;
      const pct = ((i / totalFrames) * 100).toFixed(2);
      const t: string[] = [];
      if (st.translateX !== 0 || st.translateY !== 0) t.push(`translate(${st.translateX}px, ${st.translateY}px)`);
      if (st.rotation !== 0) t.push(`rotate(${st.rotation}deg)`);
      if (st.scaleX !== 1 || st.scaleY !== 1) t.push(`scale(${st.scaleX}, ${st.scaleY})`);
      steps.push(`${pct}% { transform: ${t.join(' ') || 'none'}; opacity: ${st.opacity}; }`);
    }
    if (steps.length > 0) {
      const safeId = elId.replace(/[^a-zA-Z0-9_-]/g, '_');
      css += `@keyframes a_${safeId} { ${steps.join(' ')} }\n`;
      css += `#el-${safeId} { animation: a_${safeId} ${clipDuration}ms linear forwards; transform-origin: center center; transform-box: fill-box; }\n`;
    }
    idx++;
    onProgress?.(idx / animatedIds.size);
  }

  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = css;
  svg.insertBefore(style, svg.firstChild);

  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', String((cam0.x - cam0.width / 2) + offX));
  bgRect.setAttribute('y', String((cam0.y - cam0.height / 2) + offY));
  bgRect.setAttribute('width', String(cam0.width));
  bgRect.setAttribute('height', String(cam0.height));
  bgRect.setAttribute('fill', '#ffffff');
  svg.insertBefore(bgRect, style.nextSibling);

  const svgStr = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });

  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${project.name || 'animation'}.svg`;
  a.click();
  URL.revokeObjectURL(a.href);
}
