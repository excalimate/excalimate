import type { SvgSceneAdapter } from '@excalimate/player-runtime';
import type { FrameState } from '@excalimate/animation-core';

export async function renderFrame(
  adapter: SvgSceneAdapter,
  frameState: FrameState,
  outW: number,
  outH: number,
  outputCanvas: HTMLCanvasElement,
  theme: 'light' | 'dark',
  signal: AbortSignal,
): Promise<void> {
  throwIfAborted(signal);
  adapter.applyFrame(frameState);
  adapter.svg.setAttribute('width', String(outW));
  adapter.svg.setAttribute('height', String(outH));
  const svgString = new XMLSerializer().serializeToString(adapter.svg);
  const blob = new Blob([svgString], {
    type: 'image/svg+xml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image(outW, outH);
    await loadImage(image, url, signal);
    throwIfAborted(signal);
    const context = outputCanvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');
    context.fillStyle = theme === 'dark' ? '#121212' : '#ffffff';
    context.fillRect(0, 0, outW, outH);
    context.drawImage(image, 0, 0, outW, outH);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(
  image: HTMLImageElement,
  source: string,
  signal: AbortSignal,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const cleanup = (): void => {
      signal.removeEventListener('abort', onAbort);
      image.onload = null;
      image.onerror = null;
    };
    const onAbort = (): void => {
      cleanup();
      image.src = '';
      reject(new DOMException('Export cancelled', 'AbortError'));
    };
    image.onload = () => {
      cleanup();
      resolve();
    };
    image.onerror = () => {
      cleanup();
      reject(new Error('Failed to rasterize sanitized SVG frame'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    image.src = source;
  });
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) {
    throw new DOMException('Export cancelled', 'AbortError');
  }
}
