import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SvgSceneAdapter } from '@excalimate/player-runtime';
import { renderFrame } from './renderFrame';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function adapter(): SvgSceneAdapter {
  const svg = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'svg',
  );
  svg.setAttribute('viewBox', '0 0 10 10');
  return {
    svg,
    applyFrame: vi.fn(),
    destroy: vi.fn(),
  } as unknown as SvgSceneAdapter;
}

describe('raster frame resource cleanup', () => {
  it('revokes the temporary SVG object URL after rasterization', async () => {
    const revokeObjectURL = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:frame');
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      fillRect: vi.fn(),
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    class LoadedImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal('Image', LoadedImage);
    const canvas = document.createElement('canvas');

    await renderFrame(
      adapter(),
      new Map(),
      10,
      10,
      canvas,
      'light',
      new AbortController().signal,
    );

    expect(drawImage).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:frame');
  });

  it('does not allocate an object URL after cancellation', async () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL');
    const controller = new AbortController();
    controller.abort();

    await expect(
      renderFrame(
        adapter(),
        new Map(),
        10,
        10,
        document.createElement('canvas'),
        'light',
        controller.signal,
      ),
    ).rejects.toHaveProperty('name', 'AbortError');
    expect(createObjectURL).not.toHaveBeenCalled();
  });
});
