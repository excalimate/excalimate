/**
 * Per-mode canvas viewport state that persists across mode switches.
 * Edit and animate modes each maintain their own viewport independently.
 */

interface CanvasViewport {
    scrollX: number;
    scrollY: number;
    zoom: number;
}

const viewports: Record<string, CanvasViewport> = {};

export function getCanvasViewport(mode: 'edit' | 'animate'): CanvasViewport | null {
    return viewports[mode] ?? null;
}

export function setCanvasViewport(mode: 'edit' | 'animate', v: CanvasViewport): void {
    viewports[mode] = v;
}
